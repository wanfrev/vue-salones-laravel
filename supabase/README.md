# Supabase — Sistema de Salones

Esta carpeta contiene el esquema completo del backend en Supabase (Postgres + Auth + RLS).
No hay servidor Node propio: todo corre dentro de Supabase.

## Estructura

```
supabase/
├── migrations/
│   ├── 20260511190000_init_schema.sql   # tablas, ENUMs, índices, triggers
│   ├── 20260511190100_rls_policies.sql  # Row Level Security
│   ├── 20260511190200_functions.sql     # funciones públicas + financieras
│   └── 20260512143000_extend_operational_schema.sql # campos UI + ausencias
└── seed.sql                             # negocio demo + servicios típicos
```

## Modelo de datos (resumen)

| Tabla | Para qué |
|---|---|
| `businesses` | Cada salón. `slug` se usa en la URL pública `/book/:slug`. |
| `profiles` | Extiende `auth.users` con `role` (`superadmin` / `admin` / `empleado`) y `business_id`. |
| `employee_schedules` | Horario laboral semanal por empleada (`weekday` 0=domingo). |
| `services` | Catálogo de servicios con `duration_minutes`, `price`, `category`, `icon` y `local_percentage`. |
| `employee_services` | M:N — qué servicios ofrece cada empleada. |
| `clients` | Clientes del salón con estado, cumpleaños y notas. Único por `(business_id, phone)`. |
| `client_preferred_services` | M:N — servicios favoritos o frecuentes de cada cliente. |
| `appointments` | Agenda. Constraint anti-solape por empleada en `tstzrange`. |
| `transactions` | Pagos con snapshot del split local/empleada. |
| `employee_absences` | Vacaciones, descansos y bloqueos manuales que afectan disponibilidad. |

Multi-tenant estricto: cada tabla tiene `business_id` y RLS la filtra
usando el perfil del usuario autenticado (`auth.uid()`).

## Aplicar las migraciones

### Opción A — Supabase CLI (recomendado)

```bash
# 1. Instala la CLI
npm install -g supabase

# 2. En la raíz del proyecto, vincula a tu proyecto Supabase
supabase login
supabase link --project-ref <TU-PROJECT-REF>

# 3. Sube las migraciones (corren en orden por timestamp)
supabase db push

# 4. (Opcional) carga el seed con el salón demo
supabase db execute --file supabase/seed.sql
```

### Opción B — Dashboard de Supabase

1. Entra a tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor**.
2. Pega y ejecuta en este orden:
   - `migrations/20260511190000_init_schema.sql`
   - `migrations/20260511190100_rls_policies.sql`
   - `migrations/20260511190200_functions.sql`
   - `migrations/20260512143000_extend_operational_schema.sql`
   - `seed.sql` (opcional)

### Opción C — Local con Docker

```bash
supabase init        # primera vez
supabase start       # arranca Postgres + GoTrue + PostgREST local
supabase db reset    # aplica todas las migraciones y el seed
```

## Crear el primer superadmin

Como `auth.users` se gestiona desde el servicio de Auth (no SQL), hay dos pasos:

1. **Crear el usuario en Auth** (Dashboard → Authentication → Users → *Add user* o vía CLI).
2. **Insertar su `profile`** con rol `superadmin`. Desde el SQL Editor:

```sql
insert into public.profiles (id, business_id, full_name, role)
values (
  '<UUID-DEL-USUARIO-EN-AUTH>',   -- copialo desde Authentication → Users
  null,                            -- superadmin no tiene business_id
  'Nombre del superadmin',
  'superadmin'
);
```

Si el usuario es empleado, puedes completar su puesto visible en la app con
`job_title`, por ejemplo `Estilista Senior`.

## Variables del frontend

En `client/.env` configura:

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Luego ejecuta el frontend con `npm run dev` dentro de `client/`.

Para crear un **admin** de un salón concreto (usando el seed demo):

```sql
insert into public.profiles (id, business_id, full_name, role)
values (
  '<UUID-DEL-USUARIO-EN-AUTH>',
  '00000000-0000-0000-0000-000000000001',
  'Admin del Salón Demo',
  'admin'
);
```

## Funciones expuestas

### Públicas (sin login, para auto-agendamiento)

| Función | Devuelve |
|---|---|
| `public_business_info(p_slug)` | datos básicos del salón |
| `public_list_services(p_slug)` | servicios activos |
| `public_list_employees_for_service(p_slug, p_service_id)` | empleadas que ofrecen el servicio |
| `public_get_available_slots(p_slug, p_employee_id, p_service_id, p_date_from, p_date_to, p_slot_minutes)` | slots libres respetando horario y citas existentes |
| `public_book_appointment(...)` | crea la cita en estado `pending` |

Desde el frontend (anon key):

```ts
const { data } = await supabase.rpc('public_get_available_slots', {
  p_slug: 'demo',
  p_employee_id: '...',
  p_service_id: '...',
  p_date_from: '2026-05-12',
  p_date_to: '2026-05-19',
})
```

### Internas (requieren auth)

| Función | Quién puede |
|---|---|
| `financial_summary(business_id, period_start, period_end, period, employee_id?)` | cualquier staff del negocio |
| `record_payment(appointment_id, amount, method, notes)` | solo admin/superadmin |

## RLS en una imagen mental

- **Superadmin** → ve y modifica todo en todos los negocios.
- **Admin** → ve y modifica todo dentro de SU `business_id`.
- **Empleado** → ve la información de su negocio, pero solo sus **propias** citas y sus **propias** transacciones.
- **Anon** (sin login) → solo puede llamar las funciones `public_*` (booking público).

## Recordatorios WhatsApp 24h antes (pendiente)

El esquema deja preparado `appointments.reminder_sent_at`. El job que enviará
los recordatorios queda pendiente porque aún no decidiste el proveedor
(Twilio / Meta Cloud API). Cuando lo decidas, la implementación natural es:

- **Edge Function** programada (Supabase Schedules) que cada 15 min:
  - selecciona `appointments` con `status in ('pending','confirmed')`,
    `start_time` entre `now() + 23h45m` y `now() + 24h15m`,
    `reminder_sent_at is null`;
  - llama al proveedor con el teléfono del cliente;
  - hace `update ... set reminder_sent_at = now()`.

## Regenerar tipos TypeScript

Tras cualquier cambio al esquema:

```bash
supabase gen types typescript --linked > client/src/types/database.ts
```

(O `--local` si trabajas contra el stack local).
