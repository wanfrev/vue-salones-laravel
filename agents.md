# 💎 LUMA SAAS — TECHNICAL ARCHITECTURE & PERFORMANCE MANIFESTO (`agents.md`)

Este documento es la **fuente de verdad absoluta** para cualquier desarrollador, arquitecto de software o agente de IA que trabaje en el código base de **Luma**. Su propósito es garantizar un rendimiento extremo, transaccionalidad de datos y estabilidad en la infraestructura autohospedada (VPS + PostgreSQL Puro), eliminando cuellos de botella de red, memoria o base de datos.

---

## 🗺️ Índice
1. [🗄️ Arquitectura de Base de Datos](#1-arquitectura-de-base-de-datos)
2. [🔌 Estrategia de Conexiones](#2-estrategia-de-conexiones)
3. [🚀 Optimización de APIs](#3-optimizacion-de-apis)
4. [💻 Gestión de Memoria y Reactividad (Vue 3)](#4-gestion-de-memoria)
5. [🏗️ Estructura y Mutabilidad Atómica](#5-estructura-y-mutabilidad)
6. [📦 TanStack Query v5 — Reglas de Caché](#6-tanstack-query-v5)
7. [🔄 Tiempo Real y WebSockets](#7-tiempo-real)
8. [🎨 UX — Estados de Carga](#8-ux-estados-de-carga)

---

## 🗄️ 1. Arquitectura de Base de Datos (PostgreSQL Puro en VPS)

En un VPS autohospedado, el uso ineficiente de disco, CPU y memoria en la base de datos degrada la aplicación de inmediato.

### ❌ Prácticas Prohibidas
1. **Consultas Secuenciales en Bucle (N+1):** Prohibido disparar SQL individuales dentro de iteradores.
2. **Operaciones sobre JSONB sin Índice:** No buscar, ordenar ni filtrar campos `JSONB` sin índice GIN.
3. **Filtrados Históricos en Frontend:** Nunca delegar al cliente ordenar/paginar listados financieros grandes.

### ✅ Prácticas Obligatorias
- **Índices B-Tree compuestos:** `(business_id, branch_id, deleted_at)` en tablas de alto tráfico.
- **Índices parciales:** `WHERE deleted_at IS NULL` para registros activos.
- **Agregación en DB:** `SUM`, `COUNT`, `AVG`, `WINDOW FUNCTIONS` — el frontend solo recibe resultados.
- **JOINs explícitos:** `INNER JOIN` / `LEFT JOIN` nativos para un solo viaje de red.
- **Relational selects en Supabase:** Usar `select('*, tabla_relacionada(campos)')` en vez de queries secundarias con `.in()` masivo.

---

## 🔌 2. Estrategia de Conexiones e Infraestructura

### ❌ Prohibido
1. Conexiones persistentes no controladas.
2. `postgresql.conf` de fábrica.

### ✅ Obligatorio
- **PgBouncer** en modo `transaction pooling` para producción.
- **Tuning PostgreSQL:**
  - `shared_buffers`: 25% RAM total.
  - `effective_cache_size`: 50-75% RAM total.
  - `work_mem`: óptimo para sorts y JOINs sin escribir a disco.

---

## 🚀 3. Optimización de APIs y Carga del Servidor

### ❌ Prohibido
1. Datasets de más de 100 registros sin paginación.
2. Peticiones duplicadas en `onMounted` si TanStack Query ya fetchea.

### ✅ Obligatorio
- **Paginación en servidor:** `LIMIT / OFFSET` o cursor-based.
- **Payloads cortos:** Solo campos requeridos por la vista.
- **Queries con filtro de fecha obligatorio:** Toda consulta de datos históricos debe tener rango de fechas acotado (máximo 6 meses para "todo").

---

## 💻 4. Gestión de Memoria y Reactividad en Frontend (Vue 3)

### ❌ Prohibido
1. `ref`/`reactive` para arrays históricos inmutables gigantes.
2. Operaciones O(N²): `.filter()` / `.find()` dentro de `.map()` en computeds.
3. **Mutación de props:** Las sub-vistas nunca deben modificar objetos pasados por el padre (`a._primaryKey = ...`, `a._groupEmployeeMembers = [...]`).

### ✅ Obligatorio
- **`shallowRef`** para datasets grandes (historial finanzas, inventario, nóminas).
- **Pre-indexar con `Map`:** Agrupaciones y lookups en una sola pasada O(N).
- **Single-pass filters:** Un solo `.filter()` con todas las condiciones en vez de encadenar varios.
- **`v-memo`** en tarjetas de listas para evitar re-renders innecesarios.
- **Pre-indexar services/employees:** `serviceMap` y `employeeMap` como `computed(() => new Map(...))` — lookups O(1) en vez de `.find()` O(N).

---

## 🏗️ 5. Estructura del Sistema y Mutabilidad Atómica

### ❌ Prohibido
1. Frontend calcula comisiones, dinero, o sueldos base manualmente.
2. Mutaciones parciales fuera de transacciones SQL.

### ✅ Obligatorio
- **Transacciones ACID:** `DB::transaction` en Laravel. Si falla el registro financiero → rollback del inventario.
- **Reglas de negocio en `.ts` puro:** Funciones testables fuera de componentes.
- **Componentes ≤ 400 líneas:** Lógica delegada a composables (`useProductCRUD.ts`, `useFinancialSummary.ts`).
- **Pagos dentro de `mutationFn`:** Toda la lógica de cobro (incluyendo distribución grupal y breakdowns) debe ejecutarse dentro de la `mutationFn` de TanStack Query, NUNCA después de `mutateAsync` en la vista. El `onSuccess` debe dispararse cuando TODO esté guardado en BD.

---

## 📦 6. TanStack Query v5 — Reglas de Caché

**⚠️ TanStack Query v5 usa `exact: true` por defecto en todos los métodos.** Esto rompe las actualizaciones optimistas y la invalidación si no se especifica `exact: false`.

### ❌ Prohibido
```typescript
// ❌ NUNCA usar getQueryData / setQueryData con clave exacta abreviada
queryClient.getQueryData(['appointments'])
queryClient.setQueryData(['appointments'], ...)

// ❌ cancelQueries / getQueriesData sin exact: false
queryClient.cancelQueries({ queryKey: ['appointments'] })
queryClient.getQueriesData({ queryKey: ['pos-pending'] })
```

### ✅ Obligatorio
```typescript
// ✅ SIEMPRE usar getQueriesData con exact: false + setQueryData por key real
const queries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
for (const [key, data] of queries) {
  if (Array.isArray(data)) {
    queryClient.setQueryData(key, ...)
  }
}

// ✅ SIEMPRE exact: false en cancel/invalidate/refetch
queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
queryClient.refetchQueries({ queryKey: ['appointments'], exact: false })
```

### ✅ Reglas de `staleTime`
| Tipo de dato | staleTime |
|---|---|
| Citas, pagos, comisiones, POS pending, dashboard admin/empleado | `0` (siempre fresco) |
| Servicios, productos, empleados (catálogos) | `5 * 60 * 1000` (5 min) |

### ✅ Invalidación puente Admin ↔ Empleado
Cuando una mutación del admin afecta datos del empleado, invalidar AMBAS claves:
```typescript
// Admin paga → invalidar claves del admin Y del empleado
queryClient.invalidateQueries({ queryKey: ['employee-balance'], exact: false })
queryClient.invalidateQueries({ queryKey: ['employee-payment-history', bizId, empId], exact: false })
queryClient.invalidateQueries({ queryKey: ['employee-earnings', bizId, empId], exact: false })
```

---

## 🔄 7. Tiempo Real y WebSockets (Laravel Reverb)

### ❌ Prohibido
- Debounce > 200ms en invalidación por WebSocket.
- Invalidaciones que no cubran tanto admin como empleado.

### ✅ Obligatorio
- **Debounce máximo 150ms** en `useRealtime.ts` antes de `flushInvalidations`.
- **Mapeo completo de entidades → query keys:**
  ```
  appointment → ['appointments', 'finanzas-transactions', 'financial-summary', 'employee-earnings', 'pos-pending']
  transaction → ['finanzas-transactions', 'financial-summary', 'employee-earnings', 'pos-pending']
  employee_payment → ['employee-payments', 'employee-earnings', 'finanzas-transactions', 'financial-summary']
  product → ['productos', 'products', 'inventario', 'pos-products']
  inventory_stock → ['inventario']
  inventory_movement → ['inventario', 'finanzas-product-sales']
  ```

---

## 🎨 8. UX — Estados de Carga y Notificaciones

### ❌ Prohibido
- **Overlay full-screen con blur** que bloquee sidebar y navegación durante cargas.
- Spinners gigantes centrados como único indicador de carga.
- Notificaciones tipo tarjeta sólida que tapan botones del POS.

### ✅ Obligatorio
- **Barra de progreso sutil** (2px, color `--color-primary`) en la parte superior del área de contenido.
- **Sidebar siempre interactivo:** El usuario puede navegar a otra sección mientras carga.
- **Transiciones suaves** (`Transition` con `mode="out-in"` y fade) entre skeleton y contenido real.
- **Toasts glass:** `bg-zinc-950/85 backdrop-blur-md` con barra de progreso temporal, glow lateral de color según tipo, y animación slide.

---

## 🎨 9. Sistema de Diseño — Tokens CSS

### Colores Primarios
| Token | Light | Dark |
|---|---|---|
| `--color-primary` | `#869C84` | `#869C84` |
| `--color-primary-hover` | `#748A72` | `#95AD93` |
| `--color-primary-light` | `#EDF3EB` | `#2D3A29` |
| `--color-primary-dark` | `#637A61` | `#748A72` |

### Tipografía y Estados
- Fuente: Inter (sistema).
- Success: `#10b981` (light) / `#34d399` (dark).
- Danger: `#ef4444`.
- Warning: `#f59e0b`.
- Bordes: `--color-border` (#e2e8f0 light / #323232 dark).

---

## ⚡ 10. Anti-Patrones Detectados y Corregidos en Luma

Estos son bugs reales encontrados y solucionados. No deben repetirse:

| Anti-Patrón | Archivo Afectado | Corrección |
|---|---|---|
| `getQueryData(['appointments'])` con clave fantasma | `useAppointmentMutations.ts` | `getQueriesData({ queryKey: ['appointments'], exact: false })` |
| Pago procesado después de `mutateAsync` en la vista | `POS.vue`, `useAppointmentMutations.ts` | Lógica de pago movida a `mutationFn` |
| Doble HTTP en drag (updateTime + update employee) | `useAppointmentMutations.ts` | `employeeId` como parámetro de `updateAppointmentTime` |
| `listCitas(bizId, undefined)` — sin filtro de fecha | `useAdminAgenda.ts` | `dateRange` computado con máximo 6 meses |
| `raw.filter()` dentro de `.map()` — O(N²) | `useFinancialSummary.ts`, `AgendaCalendar.vue`, `AgendaMonthView.vue` | Pre-index con `Map` + `groupedRows.length` O(1) |
| `new Date(b.date)` sobre string localizado | `useFinancialSummary.ts` | `_rawSortDate` ISO + `localeCompare` |
| Variantes colapsadas por agrupar solo `product_id` | `inventarioService.ts` | Key compuesta `product_id-variant_id` |
| `.in('product_id', 600+ ids)` excede límites HTTP | `inventarioService.ts` | Join relacional `select('*, product_variants(name)')` |
| `staleTime: 5 * 60 * 1000` en datos críticos | `useAgenda.ts`, `useAdminAgenda.ts`, vistas empleado | `staleTime: 0` |
| Mutación de props (`a._primaryKey = key`) | `AgendaMonthView.vue` | Pre-index con Map sin mutar objetos originales |
| Overlay full-screen bloqueando navegación | `GlobalLoading.vue` | Barra superior sutil inline |
| Tasa de cambio live usada para pagos históricos | `useEmployeePayments.ts`, `EmployeeRecibo.vue` | `activeRate` computado, sin fallback a `exchangeRate.value` |
| Sueldo base sin prorratear por período | `EmployeeRecibo.vue` | `baseSalaryForPeriod` proporcional a días |

---

## 📋 Checklist de Code Review

Antes de mergear cualquier PR, verificar:

- [ ] `getQueriesData`/`cancelQueries`/`invalidateQueries` usan `exact: false`
- [ ] Nunca `getQueryData`/`setQueryData` con clave abreviada
- [ ] `staleTime: 0` en queries de datos transaccionales (citas, pagos, POS, dashboard)
- [ ] Mutaciones de pago/transacción tienen toda la lógica dentro de `mutationFn`
- [ ] No hay `.filter()` dentro de `.map()` en computeds
- [ ] Consultas históricas tienen filtro de fecha acotado
- [ ] No se mutan props de componentes padre
- [ ] No se usa `new Date()` sobre strings localizados para ordenar
- [ ] Joins relacionales de Supabase en vez de queries `.in()` masivas
- [ ] Invalidación de caché cubre tanto admin como empleado
- [ ] Componentes ≤ 400 líneas
- [ ] No hay `onMounted` con refetch manual (TanStack Query lo hace solo)
