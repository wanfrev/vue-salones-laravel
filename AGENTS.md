# AGENTS.md — Luma (Salones)

Multi-tenant salon management system. Vue 3 SPA + Laravel 13 API + PostgreSQL.

> **Regla de oro**: cuando un componente o vista crezca más allá de ~200 líneas, extrae antes de añadir más funcionalidad.

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
│   ├── database/migrations/    # Migraciones (solo users/cache/jobs; tablas de negocio están en Supabase PostgreSQL)
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
Cada controller delega en un service. El service contiene la lógica de negocio pura.

### Policies (11)
`AppointmentPolicy`, `BusinessPolicy`, `ClientPolicy`, `ExpensePolicy`, `GiftCardPolicy`, `NotificationPolicy`, `ProductPolicy`, `ProfilePolicy`, `ServicePolicy`, `SupplierPolicy`, `TransactionPolicy`

Patrón común vía trait `OwnsBusinessResource`:
- `before()`: superadmin → bypass total
- `viewAny()`: staff (admin o empleado)
- `view()`: mismo `business_id`
- `create/update/delete`: admin del business

### Middleware (5)
| Middleware | Propósito |
|---|---|
| `SetBusinessContext` | Resuelve `business_id` + `branch_id` + `profile_id` del token y los inyecta como `BusinessContext` en el contenedor |
| `EnsureSuperadmin` | Solo permite rol `superadmin` |
| `ParseApiFilters` | Traduce query params PostgREST-style (`?col=eq.val`) a Laravel where |
| `UnwrapApiData` | Desenvuelve body `{ data: { ... } }` enviado por el frontend |
| `auth:sanctum` | Protege rutas API con token Bearer |

### Jobs (3)
`ProcessPayment`, `ProcessSale`, `GenerateRemindersJob` — tareas async vía Redis + Horizon.

### EntityChanged
Evento broadcast por Reverb en canal privado `business.{id}`. Se dispara en todos los controladores de escritura. El frontend escucha `.entity.changed` e invalida caches de TanStack Query automáticamente.

---

## 5. Comunicación Frontend ↔ Backend

### Cliente HTTP: `lib/api.ts`
Wrapper que emula la API de `supabase-js` pero hace HTTP calls a Laravel:
```ts
import { api as supabase, api as mutate } from '../lib/api'

// Read (tipado)
const { data, error } = await supabase.from('services').select('*').eq('business_id', id)

// Write
const { error } = await mutate.from('services').update(payload).eq('id', id)
```

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
- `staleTime: 30s` — datos se consideran frescos 30s
- `refetchOnMount: 'always'` — cada navegación refresca datos
- `refetchOnWindowFocus: true` — al volver a la pestaña
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
# Backend (Laravel)
cd backend
cp .env.example .env              # configurar DB_HOST, DB_PORT, DB_DATABASE
composer install
php artisan key:generate
php artisan migrate
php artisan serve --port=8000     # Dev server

# Realtime
php artisan reverb:start          # WebSockets

# Queues
php artisan queue:work            # Procesar jobs

# Production (VPS)
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
php artisan horizon               # Queue dashboard + workers

# Frontend (Vue)
cd client
cp .env.example .env              # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev                       # Vite dev server
npm run build                     # Production build
npm run test                      # vitest run (104 tests)
npm run test:watch                # vitest watch
```
