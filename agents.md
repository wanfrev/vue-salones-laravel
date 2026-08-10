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

---

## 🧭 11. Contexto del Proyecto y Dominio

**Luma** es un SaaS multi-tenant para negocios de servicios (salones, spas, barberías, veterinarias, pet spas) y también negocios tipo **tienda** (venta de productos sin agenda). Un mismo código base sirve a todos los "nichos" — el comportamiento se adapta por configuración, no por ramas de código separadas.

### Multi-tenancy
- Todo dato productivo cuelga de `business_id` (negocio) y, dentro de él, opcionalmente de `branch_id` (sucursal). Casi todo modelo/tabla tiene ambos campos.
- El scope global por `business_id` (`BusinessScope`) está **desactivado** (`app/Models/Concerns/BelongsToBusiness.php`) — el filtrado por negocio se hace **manualmente en cada Service/Controller** con `->where('business_id', $businessId)`. Nunca asumir que un query está automáticamente aislado por negocio: siempre filtrar explícitamente.
- `business_id` normalmente se resuelve desde `$request->user()?->profile?->business_id` (ver `resolveBusinessId()` repetido en varios controllers, p. ej. `TransactionController`, `CreditController`).

### Nichos y feature flags
- `client/src/config/niches/registry.ts` define los nichos (`salon`, `barberia`, `spa`, `dog_spa`, `vet`, `nail_bar`, `tienda`, `mixto`, etc.) y sus `capabilities` (ej. `clients.pets`, `clients.medical`).
- `isTiendaNiche(nicheType)` y variantes (`isPetNiche`, `isVetNiche`) en `client/src/config/niches/index.ts` determinan qué UI mostrar. El nicho **"tienda"** es un negocio sin agenda/servicios — solo POS de productos.
- Backend usa middlewares para gatear por negocio: `feature:<x>` (`EnsureBusinessFeature`, ej. `feature:pos`, `feature:productos`, `feature:inventario`), `perm:<x>` (`EnsureProfilePermission`, permisos por perfil), `capability:<x>` (`EnsureNicheCapability`), y `admin-panel` (`EnsureAdminPanelRole`).
- Frontend replica esto vía `businessStore.features` (agenda, calendario, servicios, pos, etc.) y roles (`isAdminPanelRole`).

### Dominio de ventas / POS / Finanzas
- **`Transaction`**: el registro de cobro. Puede colgar de una `appointment_id` (cobro de cita) o ser `null` (venta directa de producto). Tiene `method` (cash, card, transfer, zelle, pago_movil, mixed, **credito**, etc.), `payments_breakdown` (JSON, array de splits para pagos mixtos), `exchange_rate_used`, `paid_at`.
- **`PosService`** (`backend/app/Services/PosService.php`) centraliza toda la lógica de venta: `processSale` (cobro de cita + productos), `processDirectSale` (venta directa de producto sin cita), `processDirectServiceSale` (servicio cobrado sin cita previa, crea la cita internamente). Todo corre dentro de `DB::transaction` — si falla el inventario, se revierte el cobro y viceversa.
- El **inventario se descuenta siempre** al vender, sin importar el método de pago (incluyendo `credito`) — ver `validateAndDeductStock()`.
- **`FinancialSummaryService`** calcula KPIs (ingresos, gastos, ganancia, ganancia neta) agregando por `COALESCE(transactions.paid_at, transactions.created_at)`. Las transacciones con `method = 'credito'` se excluyen de ingresos hasta que se cobran (ver `Credit`/`CreditController` más abajo).
- **`Credit`** (tabla `credits`): registro trazable de una venta a crédito — cliente, monto, transacción de origen, estado `pending`/`paid`. Al marcar un crédito como pagado (`CreditController::markPaid`), se actualiza el `method` y `paid_at` de la **transacción original** (no se crea una nueva) para que toda la maquinaria de ingresos/ganancia existente lo reconozca automáticamente, en la fecha real del pago, no de la venta.
- `DailyReportPosSummaryService` / tabla `daily_reports` es el **cierre de caja diario** — un resumen operativo por día/sucursal, independiente del sistema de créditos (un crédito sigue apareciendo en el reporte del día que se vendió, aunque su ingreso se reconozca después en Finanzas).

---

## 🏗️ 12. Estructura del Backend (Laravel)

```
backend/app/
├── Http/Controllers/Api/   # Un controller por recurso (TransactionController, CreditController...)
├── Services/                # Lógica de negocio pesada (PosService, FinancialSummaryService, InventoryService)
├── Models/                  # Eloquent models, PK uuid no incremental (ver patrón abajo)
│   └── Concerns/             # Traits compartidos: BelongsToBusiness, BelongsToBranch
├── Http/Middleware/         # feature / perm / capability / admin-panel / superadmin
├── Events/                  # EntityChanged (WebSocket realtime vía Reverb)
├── Domain/, Enums/, Rules/, Scopes/, Policies/
```

### Convenciones de Models
```php
class Credit extends Model
{
    use BelongsToBranch;
    use BelongsToBusiness;

    public $incrementing = false;
    protected $keyType = 'string';   // PKs son UUID (Str::uuid()->toString()), no autoincrement

    protected $fillable = [...];
    protected function casts(): array { return [...]; }
}
```
Casi todas las tablas nuevas siguen este patrón: `id` uuid primary, `business_id`, `branch_id` nullable, timestamps, y a veces `softDeletes()`.

### Convenciones de Controllers
- Sin base class obligatoria (algunos extienden `Controller`, otros no — seguir el ejemplo del controller más cercano al recurso que estés tocando).
- Patrón repetido: `resolveBusinessId(Request $request)` privado que prioriza `$request->user()?->profile?->business_id` y cae a un query param `business_id` (con soporte de sintaxis `eq.<uuid>` heredada de PostgREST).
- Validación con `$request->validate([...])` inline en el método, nunca Form Requests separados (no es el patrón de este proyecto).
- Mutaciones de dinero/inventario van envueltas en `DB::transaction(function () { ... })`.
- Tras un cambio relevante, emitir `EntityChanged::safe($businessId, 'entity_name', 'created|updated|deleted', $id)` para que el frontend reciba el evento realtime.

### Convenciones de Migraciones y Rutas
- Nombre: `YYYY_MM_DD_HHMMSS_create_x_table.php` o `add_y_to_x_table.php`, fecha real del día en que se crea.
- `backend/routes/api.php` es un único archivo grande, agrupado por `Route::middleware(['feature:x', 'perm:y'])->group(...)`. Al añadir un recurso nuevo, ubicar las rutas cerca de recursos relacionados (ej. `/credits` quedó junto a `/transactions`).

---

## 💻 13. Estructura del Frontend (Vue 3 + TypeScript)

```
client/src/
├── views/            # Una vista por ruta (Finanzas.vue, POS.vue...)
├── components/<dominio>/   # Componentes de UI agrupados por dominio (finanzas/, pos/, agenda/...)
├── composables/<dominio>/  # useXxx.ts — estado + TanStack Query + mutaciones, por dominio
├── services/<dominio>Service.ts  # Funciones puras de acceso a datos (una por dominio)
├── types/database.ts  # Registro central de interfaces TS que reflejan las tablas backend
├── store/              # Pinia (auth, business)
├── config/niches/       # Definición de nichos y capabilities
└── lib/api.ts           # Dos formas de hablar con el backend (ver abajo)
```

### Dos formas de llamar al backend — no mezclarlas sin razón
1. **`db.from('tabla')...`** (`client/src/lib/api.ts`) — wrapper estilo Supabase/PostgREST sobre las tablas expuestas directamente (`suppliers`, `expenses`, `transactions` de solo lectura, etc.). Se usa en la mayoría de `services/*.ts` existentes (ver `suppliersService.ts`).
2. **`apiRequest<T>(method, path, body)`** (mismo archivo) — para **endpoints custom de Laravel** que no son CRUD directo de tabla (`/requirements`, `/credits/{id}/mark-paid`, `/pos/*`). Se usa dentro de composables (`useRequirements.ts`, `useCredits.ts`) con TanStack Query (`useQuery`/`useMutation`) directamente, sin capa `services/` intermedia — patrón más nuevo y preferido para recursos con lógica de negocio (no es solo CRUD).

Al agregar un recurso nuevo: si es lógica de negocio no trivial (como créditos, requerimientos), usar `apiRequest` + composable directo. Si es CRUD simple sobre una tabla ya expuesta, usar `db.from()`.

### Composables (patrón estándar)
```ts
export function useCredits() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const { success, error: showError } = useNotification()

  const xQuery = useQuery({ queryKey: [...], queryFn: ..., enabled: ..., staleTime: 0 })
  const xMutation = useMutation({
    mutationFn: ...,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [...], exact: false }) /* + success() */ },
    onError: (err) => showError(translateError(err, 'mensaje por defecto')),
  })
  return { ... }
}
```
- `useNotification()` para toasts, `translateError()` para mensajes de error legibles, `useCurrency()` para formateo USD/VES y tasa de cambio activa.
- Componentes de sección (`XxxSection.vue`) reciben o instancian su composable y son puramente de presentación — la lógica vive en el composable, no en el componente (ver checklist de la sección 5/6 arriba, componentes ≤ 400 líneas).

### Pestañas y vistas grandes (ej. Finanzas.vue)
`Finanzas.vue` es el ejemplo de referencia para vistas con pestañas: `activeTab` tipado como unión literal, `mainTabs` computed que arma la lista según rol/nicho, y un `watch` que redirige a una pestaña válida si la actual deja de estar disponible (ej. al ocultar "Egresos"/"Créditos" para empleados de tienda).

---

## 🤝 14. Flujo de Trabajo con el Usuario (Wanfredo)

- **Investigar antes de construir.** Este proyecto avanza por iteraciones de commits pequeños y descriptivos (`abe7da1 metodo credito`, `ba2b761 factura`...). Antes de implementar algo "nuevo", revisar `git log`/`git diff` del rango relevante y grep del dominio (ej. `credito`, nombre de la feature) para no duplicar lógica que ya quedó a medio camino en un commit reciente.
- **Preguntar decisiones de producto, no adivinarlas.** Cuando una feature tiene varias formas válidas de resolverse (pago parcial vs total de un crédito, dónde va una sección nueva en la navegación, si reusar un flujo destructivo existente o crear uno nuevo), preguntar con opciones concretas antes de codear. El usuario prefiere decidir el diseño de producto explícitamente.
- **Backend y frontend en el mismo cambio.** Las features de negocio (ej. créditos) casi siempre tocan migración + modelo + controller + rutas + composable + componente + tipos TS en un solo PR/commit conceptual — no se entregan mitades.
- **Verificación real, no solo "debería funcionar".** Frontend: `npx vue-tsc --noEmit` y `npm run build` antes de dar por terminado un cambio de UI/composable. Backend: revisar convenciones exactas de un archivo hermano (mismo patrón de controller/migración) en vez de inventar una convención nueva.
- **Limitación conocida del entorno:** no hay PHP/Composer instalado localmente en esta máquina de desarrollo, por lo que **no se pueden correr migraciones ni levantar el servidor Laravel** desde aquí. Los cambios de backend se validan por revisión de código cuidadosa y consistencia con el resto del código, y las migraciones deben aplicarse manualmente en el servidor/VPS real (`php artisan migrate`) tras el despliegue. Avisar siempre esto explícitamente cuando un cambio incluya migraciones nuevas.
- **Idioma:** el proyecto y las comunicaciones con el usuario son en español (Venezuela) — nombres de campos/UI en español, aunque el código (variables, nombres de archivo) esté en inglés siguiendo convención de programación.
