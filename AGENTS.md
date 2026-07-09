# AGENTS.md — Luma (Salones)

Multi-tenant salon management system. Vue 3 SPA + Laravel 13 API + PostgreSQL (DBngin).

> **Regla de oro**: cuando un componente o vista crezca más allá de ~200 líneas, extrae antes de añadir más funcionalidad.

---

## 0. Quick Start (Desarrollo Local)

**Herramientas necesarias:**
- **Laravel Herd** — Sirve el backend en `https://luma.test` (nginx + PHP-FPM 8.4, concurrente) — O usa `make backend` con el servidor built-in de PHP.
- **DBngin** — PostgreSQL nativo en `localhost:5432` (sin Docker).
- **Docker** — Solo para Redis (`docker compose up -d redis` o `make up`).
- **Node.js** — Para Vite/Vue.

**Arranque diario (Herd):**
```bash
# 1. Abrir Herd (auto-start recomendado)
# 2. Abrir DBngin y asegurar que PostgreSQL está corriendo
# 3. Terminal:
cd client
npm run dev
# 4. Abrir http://localhost:5173
```

**Arranque diario (Makefile / sin Herd):**
```bash
make up          # docker compose up -d redis
make backend     # PHP_CLI_SERVER_WORKERS=8 php artisan serve --port=8000
make frontend    # cd client && npm run dev
make worker      # php artisan queue:work (opcional)
make reverb      # php artisan reverb:start (opcional, solo si necesitás WebSockets)
```

**Instalación inicial:**
```bash
make install     # composer install, npm install, .env, key:generate
```

**Base de datos:** `127.0.0.1:5432`, database `salones`, user `postgres`, sin password (trust auth vía DBngin). Si usás Docker en vez de DBngin, el compose expone PostgreSQL en `5434`.

**Credenciales demo:** `admin@luma.app` / `password` | `superadmin@luma.app` / `password`

**Stack:** PostgreSQL → Laravel 13 (PHP-FPM o built-in server) → Vue 3 (Vite HMR). Redis vía Docker para colas/cache.

### Env vars críticos para desarrollo

**Backend (`backend/.env`):**
```
DB_HOST=127.0.0.1, DB_PORT=5432, DB_DATABASE=salones, DB_USERNAME=postgres, DB_PASSWORD=
REDIS_CLIENT=phpredis          # Extensión de PHP obligatoria para Predis
QUEUE_CONNECTION=redis         # Para Horizon y colas
CACHE_STORE=redis
BROADCAST_CONNECTION=reverb    # WebSockets
```

**Frontend (`client/.env`):**
```
VITE_API_URL=http://localhost:8000/api          # Backend URL (o https://luma.test/api con Herd)
VITE_REVERB_HOST=localhost                       # Reverb WebSocket host
VITE_REVERB_APP_KEY=salones-reverb-key
VITE_REVERB_PORT=8080
```

---

## 1. Filosofía de código

1. **Componentizar siempre.** Vistas >300 líneas, modales >150 líneas, composables >200 líneas → extraer.
2. **Pure functions primero.** Lógica de dominio en `business/` (sin Vue, sin HTTP, sin stores).
3. **Una responsabilidad por archivo.** Controller = HTTP. Service = lógica de negocio. Policy = autorización. Job = tareas async.
4. **Nada de HTTP en componentes o vistas.** Siempre a través de composables y servicios.
5. **Nada de Vue en `lib/`, `business/`, `services/`.** Solo tipos permitidos.
6. **Backward compatibility.** Nuevas columnas pueden no existir aún en dev local → usar `select('*')` o defaults.
7. **Tests primero en lógica crítica.** Formularios, mappers, cálculos de comisión, validadores.

---

## 2. Arquitectura

```
├── backend/                    # Laravel 13 API
│   ├── app/
│   │   ├── Console/Commands/   # Comandos artisan (reminders:generate)
│   │   ├── Enums/              # AppRole
│   │   ├── Events/             # EntityChanged (broadcast vía Reverb)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # 23 controladores REST
│   │   │   ├── Middleware/     # SetBusinessContext, EnsureSuperadmin, ParseApiFilters, UnwrapApiData
│   │   │   ├── Requests/       # Form Requests (StoreBranchRequest, CreateBusinessRequest)
│   │   │   └── Resources/      # API Resources (AuthResource, BusinessResource, BranchResource)
│   │   ├── Jobs/               # ProcessPayment, ProcessSale, GenerateRemindersJob
│   │   ├── Models/             # 26 modelos Eloquent (UUID PK, no auto-increment)
│   │   ├── Policies/           # 11 policies + trait OwnsBusinessResource
│   │   └── Services/           # 21 services de negocio + BusinessContext
│   ├── config/                 # octane.php, horizon.php, reverb.php, sanctum.php
│   ├── database/migrations/    # Migraciones (tablas de framework: users, cache, jobs, tokens)
│   └── routes/
│       ├── api.php             # 59 endpoints REST + RPC compat
│       ├── channels.php        # Autorización de canales Reverb (business.{id})
│       └── console.php         # Schedule (reminders:generate daily at 08:00)
│
├── client/src/                 # Frontend Vue 3 SPA
│   ├── business/               # Pure domain logic (no Vue, no HTTP)
│   ├── components/             # UI components by domain
│   │   ├── agenda/             # AgendaCalendar, AgendaListView, AgendaMonthView, AgendaYearView
│   │   ├── common/             # UI primitives reutilizables (ver §3)
│   │   ├── equipo/             # EmployeePaymentModal, EmployeeConsumptionModal, EmployeeRateModal, GestionTabs
│   │   ├── finanzas/           # KpiCards, KpiBanner, RecordSection, EditCobroModal, DetailMovimientos, etc.
│   │   ├── forms/              # FormInput, FormSelect, FormSearchSelect, CitaClientSearch, etc.
│   │   ├── modals/             # CitaFormModal, ClienteFormModal, EmpleadoFormModal, etc.
│   │   ├── pos/                # POSCart, POSPaymentPanel, POSAppointmentCard, POSConfirmModal, etc.
│   │   └── ...                 # clientes/, filters/, inventario/, layout/, productos/, servicios/
│   ├── composables/            # Stateful logic (TanStack Query + reactive state), organizado por dominio
│   │   ├── agenda/             # useAgenda, useAdminAgenda, useAppointmentMutations
│   │   ├── common/             # useAuth, useCurrency, useModal, useNotification, usePagination, etc.
│   │   ├── empleados/          # useCrud, useEmployeePayments
│   │   ├── finanzas/           # useFinancialSummary, useExpenses, useExchangeRate, usePeriodSelection, useTransactionEdit
│   │   ├── inventario/         # useInventoryAdjustment, useProductCRUD, useProductStockAdjust
│   │   ├── pos/                # usePOSCart, usePOSPayment
│   │   ├── realtime/           # useRealtime, useRealtimeSync
│   │   └── ...                 # giftCards/, suppliers/
│   ├── lib/                    # Pure utilities (no Vue) — api.ts, echo.ts, validation.ts, errors.ts, formatters.ts
│   ├── mappers/                # DB ↔ View transformations
│   ├── services/               # Thin data access layer (HTTP calls via api.ts)
│   ├── store/                  # Pinia stores (auth, business, theme)
│   ├── types/                  # View models + database.ts (types DB)
│   └── views/                  # Route-level views (lean, delegan a composables + components)
│       └── employee/           # Vistas del dashboard de empleado
│
└── supabase/                   # Schema original (solo referencia; la BD se gestiona vía Supabase local)
    ├── migrations/             # 70 migraciones SQL (referencia del schema)
    ├── functions/              # 3 Edge Functions (manage-user, superadmin-invite, generate-reminders)
    └── seed.sql                # Datos semilla
```

### Layer rules

| Layer | Importa desde | NO importa desde |
|---|---|---|
| `business/` | Nada del proyecto | Vue, composables, services, stores, HTTP |
| `lib/` | `types/`, paquetes npm | Vue, services, stores, business |
| `services/` (frontend) | `lib/api.ts`, `mappers/`, `types/` | Vue, stores, components |
| `mappers/` | `lib/`, `types/` | Vue, services, stores, components |
| `composables/` | `services/`, `store/`, `lib/`, `types/` | Components, views |
| `components/` | `composables/`, `lib/`, otros components | Services directly, views |
| `views/` | `composables/`, `components/`, `store/`, `lib/` | Services directly |
| `store/` | `services/`, `lib/`, `types/` | Components, views |

---

## 3. Componentes reutilizables en `components/common/`

| Componente | Props clave | Uso |
|---|---|---|
| `ModalBase` | isOpen, title, variant, size, confirmText, loading | Todos los modales de acción |
| `DrawerBase` | isOpen, title | Paneles laterales |
| `SectionCard` | title, subtitle, icon, noPadding | Wrappers de sección |
| `SegmentedTabs` | tabs, v-model | Tabs segmentados con iconos |
| `EmptyState` | icon, title, subtitle, actionLabel | Estado vacío |
| `StatCard` | icon, iconColor, value, label, sublabel | Tarjetas de estadística |
| `DualAmount` | amount, primaryCurrency, exchangeRate, size | Display USD + VES apilado |
| `FeatureGate` | feature | Protege vistas: muestra "no disponible" si el feature está OFF |
| `BranchSwitcher` | branches, v-model | Selector de sucursal (multi-branch) |
| `NotificationBell` | unreadCount | Ícono de campanita con badge |
| `NotificationToast` | notification | Toast temporal de notificación |
| `EmployeeGrid` | employees, showAll, getInitials | Grid de tarjetas de empleados |

Exports: `import { ModalBase, StatCard, ... } from '../components/common'`

---

## 4. Backend Laravel

### Controllers (23)
`Appointment`, `Auth`, `Branch`, `Business`, `Client`, `EmployeeBalance`, `EmployeeCommission`, `EmployeePayment`, `EmployeeSchedule`, `Expense`, `FinancialSummary`, `GiftCard`, `Inventory`, `Notification`, `Pos`, `Product`, `ProductCategory`, `Profile`, `Service`, `Superadmin`, `Supplier`, `SupplierPayment`, `Transaction`

### Services (21)
Cada controller delega en un service. El service contiene la lógica de negocio pura. **Los services NO deben filtrar manualmente por `business_id` o `branch_id`** — eso lo hacen los Global Scopes automáticamente.

### Global Scopes (aislamiento automático)

Dos scopes protegen todas las queries Eloquent automáticamente:

| Scope | Trait | Filtro SQL |
|---|---|---|
| `BusinessScope` | `BelongsToBusiness` | `WHERE business_id = {context}` |
| `BranchScope` | `BelongsToBranch` | `WHERE (branch_id IS NULL OR branch_id = {context})` |

**17 modelos** tienen `BelongsToBusiness`. **14 modelos** tienen `BelongsToBranch`. Se aplican automáticamente cuando `SetBusinessContext` bindea el contexto al contenedor. Para superadmin, el scope no se activa (ve todo).

> **Regla:** todo modelo nuevo con `business_id` o `branch_id` DEBE usar el trait correspondiente. No se filtra manualmente en services.

### Policies (11)
`AppointmentPolicy`, `BusinessPolicy`, `ClientPolicy`, `ExpensePolicy`, `GiftCardPolicy`, `NotificationPolicy`, `ProductPolicy`, `ProfilePolicy`, `ServicePolicy`, `SupplierPolicy`, `TransactionPolicy`

Patrón común vía trait `OwnsBusinessResource`:
- `before()`: superadmin → bypass total
- `viewAny()`: staff (admin o empleado)
- `view()`: mismo `business_id`
- `create/update/delete`: admin del business

### Middleware

API middleware se registra en `backend/bootstrap/app.php:17-21` en este orden (importante):

| # | Middleware | Propósito |
|---|---|---|
| 1 | `UnwrapApiData` | Desenvuelve body `{ data: { ... } }` → el controller recibe datos directos (POST, PUT, PATCH, DELETE) |
| 2 | `ParseApiFilters` | Traduce query params PostgREST-style (`?col=eq.val`) a `$request->merge(['col' => 'val'])` |
| 3 | `SetBusinessContext` | Resuelve `business_id` del perfil + `branch_id` del header `X-Branch-ID`, bindea `BusinessContext` y `branch-context-id` al contenedor |
| 4 | `auth:sanctum` (ruta) | Protege rutas API con token Bearer |
| 5 | `EnsureSuperadmin` (alias `superadmin`) | Solo permite rol `superadmin` |

### Jobs (3)
`ProcessPayment`, `ProcessSale`, `GenerateRemindersJob` — tareas async vía Redis + Horizon.

### EntityChanged
Evento broadcast por Reverb en canal privado `business.{id}`. Usar siempre `EntityChanged::safe()` (con try-catch interno). Se dispara en todos los controladores de escritura. El frontend escucha `.entity.changed` e invalida caches de TanStack Query.

---

## 5. Comunicación Frontend ↔ Backend

### ⚠️ Cliente HTTP: `lib/api.ts` — wrapper custom, NO es supabase-js

`api.ts` es un wrapper **propio** que emula la API de `supabase-js` (query builder con `.from().select().eq()`) pero traduce todo a HTTP calls contra Laravel. La conversión clave: `from('services')` → `GET /services`, filtros `.eq('col', 'val')` → query params `?col=eq.val`, e inserts/updates → body `{ data: {...} }` que el middleware `UnwrapApiData` desenvuelve.

Los servicios frontend usan alias para mantener compatibilidad con código heredado de Supabase:
```ts
import { api as supabase, api as mutate } from '../lib/api'

// Read (tipado)
const { data, error } = await supabase.from('services').select('*').eq('business_id', id)

// Write
const { error } = await mutate.from('services').update(payload).eq('id', id)
```

> **No instalar ni usar `@supabase/supabase-js` en el frontend.** El paquete está solo como dependencia raíz legacy. Todo el acceso a datos pasa por `lib/api.ts`.

### WebSockets: `lib/echo.ts`
Cliente Laravel Echo con PusherJS → Reverb:
```ts
import { echoClient } from '../lib/echo'

echoClient.private(`business.${bizId}`).listen('.entity.changed', (e) => { ... })
```

### Auth
Sanctum token-based. El token se guarda en `localStorage` como `auth_token`. Se envía en header `Authorization: Bearer {token}` automáticamente.

---

## 6. Patrones TanStack Query

```ts
const { data } = useQuery({
  queryKey: computed(() => serviciosKeys.all(businessId.value)),
  queryFn: () => listServicios(businessId.value!),
  enabled: computed(() => !!businessId.value),
})
```

**QueryClient defaults:**
- `staleTime: 5min` — datos frescos 5 minutos, no refetch innecesarios
- `refetchOnMount: true` — refetch solo si datos están stale (>5min)
- `refetchOnWindowFocus: false` — no refetch al volver a la pestaña
- `placeholderData: keepPreviousData` — evita flash de pantalla vacía al cambiar de período
- Auth errors (401) → auto-redirect a login

**Cache invalidation:** NUNCA usar `await` secuencial. Siempre `Promise.allSettled([...])`.

---

## 7. Sistema de feature flags

`businesses.features` JSONB con defaults:
```json
{ "pos": true, "inventario": true, "productos": true, "proveedores": true, "multi_branch": false, "gift_cards": true, "employees_create_clients": true }
```

- **Superadmin** togglea desde `/superadmin/business/:id`
- **Sidebar** filtra links según `link.requiresFeature`
- **Vistas** protegidas con `<FeatureGate feature="x">`
- Para agregar un feature: JSONB default en BD, toggle en superadmin UI, `requiresFeature` en sidebar link.

---

## 8. Multi-tenant: aislamiento

- **Auth**: `authStore.profile.business_id` viene del perfil autenticado vía Sanctum
- **Middleware**: `SetBusinessContext` resuelve e inyecta `BusinessContext` en cada request
- **Services**: TODOS filtran explícitamente por `business_id` en cada query
- **Policies**: `OwnsBusinessResource` verifica `business_id` en cada operación
- **Superadmin**: `business_id = null` en profile, bypass total en policies
- ⚠️ **Nunca** hagas `Model::all()` sin filtrar por `business_id` — agujero de seguridad.

---

## 9. Moneda dual (USD/VES)

- `transactions.total_amount`, `expenses.amount`, `employee_payments.amount`: SIEMPRE en USD
- Columnas de moneda: `currency` (`'USD' | 'VES'`), `original_amount` (monto en VES), `exchange_rate_used`
- `businesses.ves_exchange_rate` (default 36.5)
- Mostrar: usar `<DualAmount>` o `formatUSD() + formatVESInline()`

---

## 10. Convenciones de código

### Naming
- **Modelos Laravel**: `Business`, `Profile`, `Appointment` (singular, PascalCase)
- **Tablas DB**: `businesses`, `profiles`, `appointments` (plural, snake_case)
- **Controllers**: `AppointmentController` (singular + Controller)
- **Services**: `AppointmentService` (singular + Service)
- **View models (frontend)**: `Cita`, `Cliente`, `Empleado`, `Servicio`, `Producto`
- **Composables**: `use` + sustantivo (`useExpenses`)
- **Services (frontend)**: sustantivo + sufijo (`expensesService`)
- **Columnas DB**: `snake_case`. **Props/TS**: `camelCase`
- **Enums DB**: `text` con `check` constraint

### Formularios
- CRUD simple → `useCrud`
- Forms complejos (CitaFormModal) → extraer estado al composable
- Validar con Zod (`citaFormSchema`, `posSaleSchema`, `clienteFormSchema`)
- Modales de acción → `ModalBase`

### Servicios (frontend)
- **Reads/Writes**: `api.ts` (wrapper HTTP que emula supabase-js)
- **Errores**: capturar, envolver en `AppError`, o pasar a `handleDbError`
- **Exportar query keys**: `export const xxxKeys = { all: (id) => [...] }`

---

## 11. Lecciones aprendidas críticas

1. **`??` no `||`** en mappers para campos numéricos nullable. `0` es un valor VÁLIDO para `employee_percentage_override`.
2. **Cache invalidation**: NUNCA `await` secuencial. Usar `Promise.allSettled([...])`.
3. **Pinia stores vs TanStack Query cache**: refrescar AMBOS tras mutación.
4. **`NULL != uuid` en SQL/PHP**: usar `whereNull`/`whereNotNull` explícito, no comparar con `null`.
5. **Backward compatibility**: código debe tolerar columnas nuevas como `undefined`.
6. **`EntityChanged` dispatch ANTES del `return`** — si se pone después, el evento nunca se emite.
7. **Reverb usa `PrivateChannel`** — el frontend debe usar `echoClient.private()`, no `.channel()`.
8. **Multi-branch**: tablas con `branch_id` nullable → queries deben incluir `whereNull('branch_id')->orWhere('branch_id', $id)`.
9. **SignOut no debe forzar recarga de página** — la store limpia estado y el router redirige.

---

## 12. Checklist antes de mergear

```
[ ] npm run build pasa (vite build)
[ ] php artisan route:list sin errores
[ ] Si tocaste controller: EntityChanged::dispatch en writes
[ ] Si tocaste service: filtra por business_id en TODAS las queries
[ ] Si tocaste frontend composable: invalidaciones con Promise.allSettled
[ ] Si tocaste policy: before() permite superadmin bypass
[ ] Si tocaste mappers con números nullable: usaste ?? no ||
[ ] Si tocaste una vista: NO excede 300 líneas
```

---

## 13. Comandos

```bash
# Base de datos (desde backend/)
cd backend
php artisan migrate                 # Crear tablas de framework
php artisan db:seed --class=DemoBusinessSeeder  # Datos demo

# Desarrollo (Herd + Vite)
# 1. Herd sirve el backend en https://luma.test (auto)
# 2. Terminal:
cd client
npm run dev                         # Vite en http://localhost:5173

# Desarrollo (Makefile, sin Herd)
make up                             # docker compose up -d redis
make backend                        # PHP_CLI_SERVER_WORKERS=8 php artisan serve --port=8000
make frontend                       # cd client && npm run dev
make worker                         # php artisan queue:work
make reverb                         # php artisan reverb:start

# Realtime (solo si necesitás WebSockets)
cd backend && php artisan reverb:start  # WebSockets en :8080

# Frontend (Vue)
cd client
npm run build                       # Production build (vue-tsc -b && vite build)
npm run test                        # vitest run (104 tests)
npm run test:watch                  # vitest watch

# Backend (Laravel)
cd backend
php artisan test                    # PHPUnit
php artisan route:list              # Verificar rutas
./vendor/bin/pint                   # Code style (Laravel Pint, defaults)
```
