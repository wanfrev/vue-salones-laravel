# AGENTS.md — Salones

Multi-tenant salon management system. Vue 3 SPA + Supabase (PostgreSQL/PostgREST/Auth/Edge Functions).

> **Regla de oro**: cuando un componente o vista crezca más allá de ~200 líneas, extrae antes de añadir más funcionalidad. **Antes** de tocar una tabla en una migración, lee su `CREATE TABLE` actual — nunca adivines nombres de columna.

---

## 1. Filosofía de código

1. **Componentizar siempre.** Vistas >200 líneas, modales >100 líneas, composables >150 líneas → extraer.
2. **Pure functions primero.** Lógica de dominio en `business/` (sin Vue, sin Supabase, sin stores).
3. **Una responsabilidad por archivo.** Servicio = data access. Composable = estado + queries. Componente = UI. Mapper = DB ↔ View.
4. **Nada de SQL ni Supabase en componentes o vistas.** Siempre a través de composables y servicios.
5. **Nada de Vue en `lib/` o `services/`.** Solo `lib/` permite tipos.
6. **Idempotencia en migraciones SQL.** `create or replace` para funciones. `drop if exists` + `create` para policies/triggers.
7. **Backward compatibility en SELECTs.** Si una columna puede no existir, no la incluyas en `select(...)` explícito. Usa `select('*')` o defaults.
8. **Tests primero en lógica crítica.** Formularios, mappers, cálculos de comisión, validadores. Si lo cambias, los tests lo atrapan.

---

## 2. Arquitectura

```
client/src/
├── business/         # Pure domain logic (no Vue, no Supabase)
├── components/       # UI components by domain
│   ├── common/       # UI primitives reutilizables (ver §3)
│   ├── modals/       # CitaFormModal, ClienteFormModal, EmpleadoFormModal, etc.
│   └── ...           # agenda/, clientes/, finanzas/, forms/, inventario/, layout/, pos/, productos/, servicios/
├── composables/      # Stateful logic (TanStack Query + reactive state)
├── lib/              # Pure utilities (no Vue) — supabase.ts, typedSupabase.ts, validation.ts, errors.ts, formatters.ts
├── mappers/          # DB ↔ View transformations
├── services/         # Thin data access layer (Supabase queries)
├── store/            # Pinia stores (auth, business, theme)
├── types/            # View models + database.ts (generated from supabase)
└── views/            # Route-level views (lean, delegate to composables + components)
```

### Layer rules

| Layer | Importa desde | NO importa desde |
|---|---|---|
| `business/` | Nada del proyecto | Vue, composables, services, stores |
| `lib/` | `types/`, paquetes npm | Vue, services, stores, business |
| `services/` | `lib/`, `mappers/`, `types/` | Vue, stores, components |
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

Exports: `import { ModalBase, StatCard, ... } from '../components/common'`

---

## 4. Composables clave

| Composable | Para qué |
|---|---|
| `useCrud<T, F>` | CRUD genérico con `items`, `saveMutation`, `deleteMutation`. Usar para: servicios, productos, empleados, clientes. |
| `useCurrency` | `formatUSD`, `formatVES`, `formatVESInline`, `exchangeRate` (computed). SIEMPRE que se muestren montos. |
| `useExchangeRate` | `exchangeRate` reactivo + `getActiveExchangeRate()` (branch-aware). |
| `useBusinessTerminology` | `t.client`, `t.service`, `t.employee` con fallbacks. |
| `useCategoryCRUD` | Estado de modales rename/delete categorías + handlers. |
| `useBranches` | Lista de sucursales + form state. |
| `useBusinessStore` (Pinia) | `features`, `hasFeature(key)`, `isMultiBranch`, `terminology`. |
| `usePOSCart` / `usePOSPayment` | Estado de carrito y flujo de pago del POS. |
| `useNotifications` / `useRealtimeSync` | Notificaciones en tiempo real vía Supabase Realtime. |

---

## 5. Sistema de feature flags

`businesses.features` JSONB con defaults:
```json
{ "pos": true, "inventario": true, "productos": true, "proveedores": true, "multi_branch": false }
```

- **Superadmin** togglea desde `/superadmin/business/:id`
- **Sidebar** filtra links según `link.requiresFeature`
- **Vistas** protegidas con `<FeatureGate feature="x">`
- Para agregar un feature: JSONB default en migración, whitelist en `superadmin-invite` Edge Function, toggle en superadmin UI, `requiresFeature` en sidebar link.

---

## 6. Multi-tenant: aislamiento

- **Auth**: `authStore.profile.business_id` viene del JWT + tabla `profiles`
- **RLS**: todas las tablas operativas tienen `business_id` + políticas `is_admin_of()`, `is_staff_of()`
- **Superadmin**: `business_id = null` en profile, bypass RLS total
- ⚠️ **Nunca** hagas `from(...).select('*')` sin `.eq('business_id', ...)` — agujero de seguridad.

---

## 7. Moneda dual (USD/VES)

- `transactions.total_amount`, `expenses.amount`, `employee_payments.amount`: SIEMPRE en USD
- Columnas de moneda: `currency` (`'USD' | 'VES'`), `original_amount` (monto en VES), `exchange_rate_used`
- `businesses.ves_exchange_rate` (default 36.5)
- Mostrar: usar `<DualAmount>` o `formatUSD() + formatVESInline()`
- Legacy `[VES:500:40]` en `notes`: dato viejo ya migrado a columnas nativas (`20260623145411`)

---

## 8. Convenciones de código

### Naming
- **Tipos DB**: `Business`, `Profile`, `Appointment`
- **View models**: `Cita`, `Cliente`, `Empleado`, `Servicio`, `Producto`
- **Composables**: `use` + sustantivo (`useExpenses`)
- **Services**: sustantivo + sufijo (`expensesService`)
- **Columnas DB**: `snake_case`. **Props/TS**: `camelCase`
- **Enums DB**: `text` con `check` constraint (no `enum` nativo)

### Formularios
- CRUD simple → `useCrud`
- Forms complejos (CitaFormModal) → extraer estado a composable
- Validar con Zod (`citaFormSchema`, `posSaleSchema`, `clienteFormSchema`) antes de writes
- Modales de acción → `ModalBase`. Fullscreen → `FormInput`/`FormSelect`

### Servicios
- **Reads**: `supabase` (tipado) de `lib/supabase.ts`
- **Writes**: `mutate` de `lib/typedSupabase.ts` (único `as any` autorizado)
- **Errores**: capturar, envolver en `AppError`, o pasar a `handleDbError`
- **Returns**: tipar explícitamente (`Promise<Service[]>`)
- **Exportar query keys**: `export const xxxKeys = { all: (id) => [...] }`

---

## 9. Patrones Supabase

```ts
// READS (tipados)
import { supabase } from '../lib/supabase'
const { data, error } = await supabase.from('services').select('*').eq('business_id', id)

// WRITES (escape tipado autorizado)
import { mutate } from '../lib/typedSupabase'
const { error } = await mutate.from('services').update(payload).eq('id', id)

// TANSTACK QUERY
const { data } = useQuery({
  queryKey: computed(() => serviciosKeys.all(businessId.value)),
  queryFn: () => listServicios(businessId.value!),
  enabled: computed(() => !!businessId.value),
})
```

**QueryClient defaults** (no sobreescribir sin razón):
- `staleTime: 30s` — datos frescos se consideran válidos 30s antes de refetch.
- `refetchOnMount: 'always'` — cada navegación refresca datos (no confiar en cache frío).
- Auth errors (JWT expired, 401) auto-signout globalmente — no manejarlos en servicios individuales.

**PWA**: Supabase REST/RPC calls son `NetworkOnly` en el service worker. Mutaciones nunca se sirven de cache — no hay riesgo de stale data en cambios.

---

## 10. Migraciones SQL

- **Funciones**: `create or replace function ... security definer set search_path = public, pg_temp`
- **Columnas**: `alter table ... add column if not exists`
- **Policies**: `drop policy if exists` + `create policy` (no existe `create policy if not exists`)
- **Triggers**: wrapper `do $$ begin if not exists ...` para idempotencia
- **Antes de tocar una función**: lee `CREATE TABLE` actual + versión más reciente de la función (puede estar en migración posterior)

---

## 11. Edge Functions

| Función | Acción | Autorización |
|---|---|---|
| `manage-user` | create / update / delete users | superadmin o admin del business |
| `superadmin-invite` | create / update_business / suspend / resume / delete | solo superadmin |
| `generate-reminders` | cron-triggered | CRON_SECRET o JWT |

Deploy: `supabase functions deploy <name>`. El frontend tiene fallbacks que llaman al DB directo si la función no está disponible.

---

## 12. Testing

- **vitest** + `happy-dom`, globals, 104 tests en 7 archivos
- Tests junto al source: `validation.ts` → `validation.test.ts`
- Testear: Zod schemas, mappers, `business/`, `lib/` utilities. Composables solo si lógica no trivial.
- `npm run test` (one-shot), `npm run test:watch` (watch mode)

### Fixes: test primero
1. Escribir test que reproduzca el bug (debe fallar)
2. Aplicar fix mínimo
3. Confirmar que el test pasa + existentes no se rompen
4. `npm run build` para verificar compilación

---

## 13. Flujo de comisión personalizada (`employee_percentage_override`)

La columna `appointments.employee_percentage_override` permite sobrescribir la comisión del empleado por cita individual.

**Write path**: `CitaFormModal` (gear icon + checkbox "Personalizar") → `setEmployeeOverride()` escribe en `formData.value.employeePercentageOverride` → `handleSubmit()` spread → `saveCita()` → `mapCitaFormToAppointmentInsert()` / `mapServiceItemToAppointmentInsert()` → INSERT en `appointments`.

**Read path**: `record_payment()` (SQL) lee con prioridad:
```sql
v_employee_pct := coalesce(
    v_appt.employee_percentage_override,   -- 1. Override personalizado
    v_employee_profile.pay_percentage,     -- 2. Default del empleado
    100 - v_service.local_percentage       -- 3. Split del servicio
);
```

⚠️ **`??` no `||`** en mappers para campos numéricos nullable. `data.employeePercentageOverride || null` convierte `0` a `null`, perdiendo el override. Usar `??`: `data.employeePercentageOverride ?? null`. Esto aplica a cualquier campo numérico donde `0` sea un valor válido.

---

## 14. Lecciones aprendidas críticas

1. **Funciones `security invoker` con DML interno**: el DELETE/UPDATE pasa por RLS. Si falta la política, Postgres silenciosamente afecta 0 filas. Usar `security definer` con `is_admin_of()` interno.
2. **`queryClient.invalidateQueries()` en `onSuccess`**: NUNCA usar `await` secuencial (10 `await invalidateQueries()`) — congela la UI ("Guardando...") y si una falla, el modal nunca cierra. Usar `Promise.allSettled([...])` para disparar en paralelo sin bloquear.
3. **Pinia stores vs TanStack Query cache**: si un componente lee de Pinia y otro de TanStack Query, refrescar AMBOS tras mutación.
4. **`NULL != uuid` en SQL**: usar `coalesce` o `is not distinct from` en comparaciones con columnas nullable.
5. **Mocks**: incluir TODAS las columnas que el código accede; el typecheck pasa pero runtime devuelve `undefined`.
6. **Backward compatibility**: código debe tolerar columnas nuevas como `undefined`.
7. **Sidebar con múltiples condiciones**: al filtrar links con `adminOnly`, `employeeOnly`, `requiresFeature`, `hideIfAgendaDisabled`, usar retornos `false` para exclusiones (no `return true` early), así todas las condiciones se evalúan.

---

## 15. Checklist antes de mergear

```
[ ] npm run test pasa (104 tests)
[ ] npm run build pasa (vue-tsc + vite)
[ ] Si tocaste migración: probada con supabase db reset
[ ] Si tocaste función SQL operativa: security definer con is_admin_of() interno
[ ] Si tocaste Edge Function: probada con supabase functions serve
[ ] Si tocaste TanStack Query: onSuccess lanza invalidaciones asíncronamente con `Promise.allSettled()`, NO bloquees con `await` porque congela la UI
[ ] Si tocaste record_payment: incluye branch_id y lee pay_percentage del empleado
[ ] Si tocaste feature flags: whitelist en superadminService + superadmin-invite Edge Function
[ ] Si tocaste mappers con números nullable: usaste ?? no ||
[ ] Si tocaste una vista: NO excede 400 líneas
```

---

## 16. Comandos

```bash
cd client
cp .env.example .env           # editar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install --legacy-peer-deps
npm run dev                    # Vite dev server
npm run build                  # vue-tsc -b && vite build
npm run test                   # vitest run (104 tests)
npm run test:watch             # vitest watch

# Mock offline (sin Supabase)
VITE_USE_LOCAL_MOCK=true npm run dev

supabase start                 # Docker local
supabase db reset              # Reset + todas las migraciones
supabase db push               # Push migraciones pendientes
supabase gen types typescript --local > client/src/types/database.ts
supabase functions deploy <name>
supabase functions serve <name> # test local
```
