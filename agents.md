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
- **Entorno de backend local (actualizado 2026-10-05):** PHP 8.4 sí existe en esta máquina vía Laravel Herd (`C:\Users\wanfr\.config\herd\bin\php84\php.exe`; no está en el PATH de la shell). Con él se puede hacer `php -l`, `php artisan route:list` y correr PHPUnit — **siempre desde `backend/` y con `-c phpunit.xml`** (`php vendor/bin/phpunit -c phpunit.xml tests/Feature/Clinical`): desde otro directorio PHPUnit no carga `phpunit.xml`, cae al `.env` y apunta a la base Postgres de desarrollo. Los tests deben usar SQLite en memoria (ver `tests/Feature/Clinical/ClinicalServicesTest.php`: corre solo las migraciones del módulo con FK apagados). **No correr `php artisan migrate` contra la base local sin que el usuario lo pida.** Las migraciones nuevas se aplican en el servidor/VPS real (`php artisan migrate`) tras el despliegue — avisar siempre cuando un cambio incluya migraciones. Hoy fallan en HEAD limpio, sin relación con módulos nuevos: `tests/Feature/EnsureNicheCapabilityTest.php` (define `run()`, método `final` de PHPUnit → rompe la suite completa) y `StaffingPayrollCalculatorTest::test_overtime_pay_and_bill_rate_overrides_are_independent`.
- **Idioma:** el proyecto y las comunicaciones con el usuario son en español (Venezuela) — nombres de campos/UI en español, aunque el código (variables, nombres de archivo) esté en inglés siguiendo convención de programación.

---

## 🧩 15. Convención de Módulos por Vertical (obligatoria desde `staffing`/`tienda` en adelante)

El negocio crece agregando **verticales** (salón/spa ya existía, luego `staffing`, luego `tienda`, próximamente **médico** e **inventario puro**). Cada vertical nueva se agrega como un módulo aislado en las 4 capas, siempre en **inglés** y siempre en **subcarpeta**, sin excepciones — `staffing` casi lo logró pero quedó inconsistente (subcarpeta en `Services/` y en `composables/`, pero plano-con-prefijo en `Controllers/` y en `services/`); ese es el error a no repetir.

```
backend/app/Services/<Vertical>/              # lógica de negocio del módulo
backend/app/Http/Controllers/Api/<Vertical>/  # controllers del módulo (subcarpeta, no prefijo plano)
backend/database/migrations/                  # sin subcarpeta (Laravel no lo permite), pero con prefijo de fecha real

client/src/views/<Vertical>*.vue               # una o más vistas, prefijo del nombre de la vertical
client/src/components/<vertical>/              # componentes del módulo
client/src/composables/<vertical>/             # composables del módulo
client/src/services/<vertical>/                # acceso a datos del módulo (subcarpeta, no archivo plano)
```

- **Nombre de carpeta siempre en inglés**, incluso si el dominio se llama distinto en español dentro de la UI (`inventory/`, no `inventario/`; `clients/`, no `clientes/`). El 2026-08-09 se unificaron `components/clientes/` → `components/clients/`, `components/inventario/` → `components/inventory/` y `composables/inventario/` → `composables/inventory/` (eran duplicados accidentales del mismo dominio partidos por idioma). Las carpetas legacy en español que ya existían antes de esta regla (`finanzas/`, `reportes/`, `empleados/` en `composables/`) **no se renombran retroactivamente** — son de bajo riesgo por ser un solo dueño sin par duplicado — pero ninguna carpeta nueva debe usar español.
- Backend: cada vertical se gatea con su propio namespace de `capability:<vertical>.*` (ver `EnsureNicheCapability`), nunca reutilizando el de otra vertical.
- Si un archivo/carpeta se abandona a medio camino de un refactor (ej. el `App\Domain\Clients\Models\Client` que se borró el 2026-08-09 por tener cero referencias), **bórralo o termina la migración** — no lo dejes como una segunda implementación fantasma del mismo concepto.

---

## 🧠 16. Módulo clínico compartido (`clinical.*`) — nicho `psicologia`

Primera vertical de salud mental; diseñado para que psiquiatría o medicina general se agreguen activando capabilities, no copiando código. **Odontología NO usa este módulo** (tiene su propio `dental.*`) y no debe tocarse al evolucionarlo.

- **Capabilities** (cada una gatea su grupo de rutas en `routes/api.php` y su ruta del router): `clinical.intake` (historia clínica, una viva por paciente), `clinical.session_notes` (notas SOAP por sesión), `clinical.treatment_plan`, `clinical.consent` (consentimiento firmado, inmutable), `clinical.assessments` (PHQ-9/GAD-7). `isClinicalNiche()` es capability-based (`clinical.intake`).
- **Datos sensibles cifrados en reposo** con casts `encrypted`/`encrypted:array` (columnas `text`, no `jsonb`): `clinical_intakes.data`, `clinical_session_notes.content/tasks`, `clinical_treatment_plans.data`. Consecuencia: **no se puede rotar `APP_KEY` sin re-cifrar** estas tablas, y no se filtra/ordena por su contenido. Columnas usadas para listar/alertar (`risk_level`, `status`, `session_date`) quedan en claro a propósito.
- **Permiso impuesto en el servidor** (`Api/Clinical/Concerns/ClinicalRecordAccess`): admin/encargado/superadmin siempre; `empleado` solo con el flag de perfil `can_access_dental_clinical` (flag genérico de "expediente clínico", reutilizado en vez de duplicar columna); `cajero` (recepción) nunca. Las notas solo las edita su autor o un admin. Esto es más estricto que `dental.*`, cuyo flag solo lo valida el frontend.
- **El puntaje de cuestionarios lo calcula el backend** (`Services/Clinical/AssessmentScoring`); `components/clinical/assessments.ts` es un espejo solo para la vista previa — si cambias un corte, cámbialo en ambos (hay tests en los dos lados).
- **`GET /clients/{id}/clinical-intake` responde 204 si no hay historia** (no `json(null)`: Laravel lo serializa `{}`). `apiFetch` ya traduce 204 → `null`.
- **Rutas del frontend:** `/admin|dashboard/clientes/:id/expediente-clinico/{historia,sesiones,plan,evaluaciones,consentimiento}` — path distinto al `expediente` dental para que ambos subárboles sean independientes. `DentalToolsNav.vue` y `SignaturePad.vue` (genéricos, viven en `components/dental/`) se reutilizan tal cual.
- Los formularios (`SessionNoteForm`, `TreatmentPlanForm`, `AssessmentForm`) tienen **estado local** y emiten el payload; nunca mutan el objeto del padre (regla §4).
- **Nomenclatura "paciente":** `isPatientNiche()` (odontología **o** clínico) controla lo que ambos nichos comparten — etiquetas de expediente/"Estado de cuenta", "Cita rápida" y la columna del profesional-dueño en la agenda. Lo propio de uno solo sigue en `isDentalNiche()` (sala de espera, productos asociados, tablero de gabinete, odontograma) o `isClinicalNiche()`. Al agregar un texto "de paciente" nuevo, usar `isPatientNiche` o, mejor, `businessStore.terminology`.
- **Nota desde la cita:** el detalle de la cita en `AgendaCalendar.vue` (nicho clínico y con permiso) tiene "Nota de sesión", que va a `…/expediente-clinico/sesiones?cita=<id>`. `ClinicalSessionsView` procesa ese parámetro una vez, con las notas ya cargadas: si la cita ya tiene nota la abre para editarla (solo autor/admin), si no abre una nueva ya vinculada y con la fecha de la cita (`SessionNoteForm` prop `syncDate`). También lo usa Seguimiento ("Escribir nota").
- **Auditoría (`clinical_access_logs`, capability `clinical.audit`):** bitácora de solo-anexar (el modelo rechaza update/delete; sin FK a `clients`/`users` para sobrevivir a su borrado). Cada controller clínico llama `$this->audit(...)` (trait): escrituras e impresiones siempre; **lecturas deduplicadas por persona+recurso en 10 min**, porque abrir la ficha dispara varias consultas. Un fallo al escribir la bitácora se loguea pero NO tumba la petición clínica. Solo el rol `admin` (ni `encargado`) consulta `GET /clinical/audit`; siempre acotado a un rango de fechas (30 días por defecto, **máx. 180**) y paginado de a 50 con "uno de más" (sin COUNT). Todo endpoint clínico nuevo debe auditar.
- **Informes (`clinical.reports`):** constancia de asistencia, informe psicológico y carta de derivación se **arman e imprimen en el navegador** (`components/clinical/reports.ts` son borradores editables; `window.print()` con CSS de impresión en `ReportSheet.vue`). El documento no se guarda; el servidor solo registra en la bitácora que se imprimió (`POST …/clinical-reports/audit`) y sirve la asistencia por rango (`GET …/clinical-reports/attendance`, máx. 1 año, 200 filas). **Los informes nunca incluyen contenido de notas de sesión ni la evaluación de riesgo** (los borradores ni siquiera reciben esos datos). Ciudad y N.º de colegiado se recuerdan en `localStorage` (conveniencia por navegador).
- **Seguimiento (`clinical.followup`, `GET /clinical/follow-up`):** tres listas acotadas (100) calculadas solo con columnas en claro, sin descifrar notas: notas pendientes (cita `completed` de los últimos 30 días sin nota; el empleado solo ve las suyas, el admin todas), riesgo sin próxima sesión (la ÚLTIMA nota con riesgo moderado/alto y sin cita futura que no sea `cancelled`/`no_show`) y posible abandono (asistió alguna vez, sin cita futura, más de N semanas sin venir). "Asistió" = cita `completed`. Las notas guardadas invalidan `['clinical-follow-up']`; `useRealtime.ts` mapea las entidades `clinical_*` a sus query keys.
- **Tests de rutas:** `ClinicalRoutesTest` resuelve cada ruta clínica a su controller real y exige su `capability:` y autenticación — los tests que llaman controllers directo no detectan un `use` faltante en `routes/api.php` (ya pasó una vez). Correr además `php artisan route:list` tras tocar rutas.
- **Casos (`clinical.cases`): pareja, familia, grupo.** Un **caso** es la unidad de tratamiento conjunta; sus integrantes son pacientes normales (`clinical_case_members`; el que sale conserva su fila con `left_on` y sigue viendo las sesiones en las que estuvo). Las notas y planes **conjuntos** llevan `case_id` y, por compatibilidad, `client_id = titular`; **lo individual es siempre `case_id IS NULL`** — todo método "ForClient" de `SessionNoteService`/`TreatmentPlanService` filtra `whereNull('case_id')` (hay pruebas de mutación que lo vigilan: quitar ese filtro filtraría notas privadas). La numeración de sesiones es independiente (por paciente / por caso). Las conjuntas se leen (solo lectura) en la ficha de cada integrante vía `/clients/{id}/joint-session-notes|plans`. Reglas: pareja = exactamente 2 integrantes activos, familia/grupo ≥ 2, nunca menos de 2 activos, un caso **nunca se borra** (se cierra), y no hay FK de `case_id` a propósito (CASCADE destruiría el registro clínico; SET NULL convertiría una nota conjunta en individual del titular).
- **La cita se vincula al caso en una tabla aparte** (`clinical_case_appointments`), desde el detalle de la cita en el calendario (`AppointmentCaseLink.vue`), **sin tocar** `StoreAppointmentRequest`, `AppointmentService`, `agendaService` ni `CitaFormModal` (compartidos con todos los nichos). Una cita pertenece a lo sumo a un caso y solo puede vincularse si su paciente es integrante activo. Efectos: «Nota de sesión» abre la nota **del caso**; la constancia de asistencia cuenta la sesión para **todos** los integrantes (`ReportService`); Seguimiento marca la nota pendiente como "Sesión conjunta" y el riesgo de una sesión conjunta alerta al **caso** (`risk_cases`), no a un integrante.
- **Adjuntos (`clinical.attachments`):** el contenido va cifrado en el disco privado (`Crypt`, ruta `clinical/{negocio}/{paciente}/{uuid}.enc`, sin relación con el nombre original) y `title`/`original_name` cifrados en la base; `path` no sale en la API. PDF/imagen/Word hasta 10 MB (`AttachmentService::EXTENSIONS/MAX_KB`, espejo en `attachments.ts`). **Cada descarga y cada borrado se auditan** (acciones `downloaded`/`deleted`, no deduplicadas); solo el admin borra. Si falla el descifrado (p. ej. cambió `APP_KEY`) responde 409 con mensaje claro, sin entregar ni anotar nada.
- **Genograma y línea de vida (`clinical.diagrams`):** uno vivo por (paciente | caso, tipo), cifrado, `GET` → 204 si no existe. El servidor **normaliza** (`DiagramService::normalize`): solo claves conocidas, límites (150 personas / 400 vínculos / 200 eventos) y descarta vínculos a personas inexistentes. El genograma usa **Vue Flow** (`@vue-flow/core`, MIT); el modelo guardado es independiente de la librería (`genogram.ts`: `toFlow*`/`fromFlow`). Vue Flow no corre bien en happy-dom: los tests unitarios lo sustituyen por un doble y se **verificó una vez en un navegador real** con una página temporal (conexión por arrastre, marca `//` del divorcio, guardado). Si se toca `GenogramEditor.vue`, repetir esa verificación.
- **Tutor de menores:** vive en `client.metadata` como campos de perfil del nicho psicología (`guardian_name/relationship/document/phone/share_info`, sin migración ni columnas nuevas en la tabla compartida `clients`). Menor = fecha de nacimiento válida y < 18 (sin fecha **nunca** se asume menor). `share_info` solo es verdadero con un "sí" explícito. El expediente muestra edad, tutor y autorización; el consentimiento de menor se abre con la plantilla de tutor y el firmante precargado; los informes nombran al representante y avisan si no hay autorización.
- **Buscador de integrantes y rol:** `PatientPicker` usa `GET /clinical/patients/search` (`CaseService::searchPatients`: cada palabra en cualquier parte del nombre/teléfono/código/documento), **no** `/clients/search`, que solo busca por inicio de texto y es compartido con POS/agenda de todos los nichos (no se toca). El rol (`CaseRoleSelect`) ofrece Sin rol / Pareja / Padre / Madre y «Agregar otro rol…»; los roles creados se recuerdan por navegador (`localStorage`, `useCustomRoles`) y el rol es texto libre ≤ 60 en el servidor.
- **Pantallas de notas y planes** comparten composables (`useSessionsScreen`, `usePlansScreen`) entre lo individual y lo conjunto; los formularios siguen teniendo estado local (regla §4).
