# Modelo de Base de Datos — Salones (Completo)

> **26 tablas** en esquema `public`. Supabase PostgreSQL 15.
> Generado a partir de `schema_ddl.sql` + 66 migraciones. Última migración: `20260706120000_cascade_payment_status_group.sql`.

---

## 1. Extensiones

| Extensión | Propósito |
|---|---|
| `pgcrypto` | `gen_random_uuid()` para PKs |
| `btree_gist` | Restricciones de solapamiento temporal (`&&`) |

---

## 2. Tipos Personalizados (ENUMs)

### `app_role`
```
'superadmin' | 'admin' | 'empleado'
```

### `appointment_status`
```
'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
```

### `payment_status`
```
'unpaid' | 'partial' | 'paid'
```

### `payment_method`
```
'cash' | 'card' | 'transfer' | 'other' | 'zelle' | 'pago_movil' | 'mixed' | 'cash_ves'
```

### `appointment_source`
```
'internal' | 'public'
```

### `employee_absence_type`
```
'break' | 'vacation' | 'sick_leave' | 'personal' | 'blocked'
```

### `inventory_movement_type`
```
'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'consumption'
```

---

## 3. Tablas

### 3.1 `businesses` — Negocios/Salones

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| | `name` | text | | |
| UQ | `slug` | text | | |
| | `phone` | text | nullable | |
| | `address` | text | nullable | |
| | `timezone` | text | `'America/Santo_Domingo'` | |
| | `currency` | text | `'USD'` | |
| | `active` | boolean | `true` | Soft delete |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |
| | `deleted_at` | timestamptz | nullable | Soft delete |
| | `niche_type` | text | `'salon'` | salon / barberia / petshop |
| | `theme_config` | jsonb | `{"primary":"#2F4156","secondary":"#567CB0"}` | Config visual |
| | `terminology` | jsonb | `{"client":"Cliente","employee":"Empleado",...}` | Nombres personalizados |
| | `ves_exchange_rate` | numeric(12,4) | `36.5000` | Tasa USD→VES |
| | `employee_ves_rate` | numeric(12,4) | nullable | Tasa específica para recibos de empleados |
| | `job_titles` | jsonb | `[]` | Cargos personalizados |
| | `service_categories` | jsonb | `[]` | (legacy, reemplazado por tabla `service_categories`) |
| | `multi_branch_enabled` | boolean | `false` | |
| | `features` | jsonb | `{"pos":true,"inventario":true,"productos":true,"proveedores":true,"multi_branch":false}` | Feature flags |

**Constraints:** `slug UNIQUE`
**Indexes:** `businesses_slug_idx(slug)`, `idx_businesses_active(id) WHERE deleted_at IS NULL`
**RLS:** SELECT: superadmin o propio business. INSERT: solo superadmin. UPDATE: admin del business. DELETE: solo superadmin.

---

### 3.2 `branches` — Sucursales

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| | `name` | text | | |
| | `address` | text | nullable | |
| | `phone` | text | nullable | |
| | `is_default` | boolean | `false` | |
| | `active` | boolean | `true` | |
| | `ves_exchange_rate` | numeric(12,4) | nullable | Tasa por sucursal |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, name)`
**Indexes:** `branches_business_idx(business_id)`
**RLS:** SELECT: admin o staff del business. INSERT/UPDATE/DELETE: solo admin.
**Trigger:** `trg_create_default_branch` — auto-crea sucursal "Principal" al crear business.

---

### 3.3 `profiles` — Empleados/Usuarios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid → `auth.users` | | ON DELETE CASCADE |
| FK | `business_id` | uuid → businesses | nullable | nullable para superadmin |
| | `full_name` | text | | |
| | `role` | app_role | `'empleado'` | |
| | `phone` | text | nullable | |
| | `avatar_url` | text | nullable | |
| | `active` | boolean | `true` | Soft delete |
| | `email` | text | nullable | Sincronizado desde auth.users |
| | `job_title` | text | nullable | Cargo |
| | `pay_type` | text | `'percentage'` | salary / percentage / mixed |
| | `pay_percentage` | numeric(5,2) | `50` | % comisión (CHECK 0-100) |
| | `base_salary` | numeric(12,2) | `0` | Sueldo base (CHECK >= 0) |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `CHECK (role = 'superadmin' OR business_id IS NOT NULL)`
**Indexes:** `profiles_business_id_idx`, `profiles_role_idx`, `profiles_email_idx`
**RLS:** SELECT: superadmin, propio perfil, o mismo business. INSERT: superadmin o admin del business (rol no superadmin). UPDATE: superadmin, propio perfil, o admin del business. DELETE: superadmin o admin del business.

---

### 3.4 `service_categories` — Categorías de servicios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `parent_id` | uuid → service_categories | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `description` | text | nullable | |
| | `active` | boolean | `true` | |
| | `metadata` | jsonb | `{}` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, name)`
**Indexes:** `service_categories_business_idx`, `service_categories_parent_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.5 `services` — Catálogo de servicios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `service_category_id` | uuid → service_categories | nullable | ON DELETE SET NULL |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `description` | text | nullable | |
| | `duration_minutes` | integer | | CHECK > 0 |
| | `price` | numeric(12,2) | | CHECK >= 0. USD |
| | `local_percentage` | numeric(5,2) | `50` | % que se queda el negocio (CHECK 0-100) |
| | `color` | text | nullable | Color en calendario |
| | `active` | boolean | `true` | Soft delete |
| | `category` | text | `'otros'` | Legacy, usar service_category_id |
| | `icon` | text | nullable | SVG path |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `services_business_idx`, `services_business_category_active_idx`, `services_service_category_idx`, `services_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.6 `service_variants` — Variantes de servicios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `service_id` | uuid → services | | ON DELETE CASCADE |
| | `name` | text | | |
| | `description` | text | nullable | |
| | `duration_minutes` | integer | nullable | |
| | `price` | numeric(12,2) | nullable | |
| | `active` | boolean | `true` | |
| | `metadata` | jsonb | `{}` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (service_id, name)`
**Indexes:** `service_variants_service_idx`, `service_variants_business_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.7 `employee_services` — M:N empleados ↔ servicios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `employee_id` | uuid → profiles | | ON DELETE CASCADE |
| PK | `service_id` | uuid → services | | ON DELETE CASCADE |

**Indexes:** `employee_services_service_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.8 `employee_schedules` — Horarios

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `employee_id` | uuid → profiles | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `weekday` | smallint | | CHECK 0-6 |
| | `start_time` | time | | |
| | `end_time` | time | | CHECK end_time > start_time |
| | `created_at` | timestamptz | `now()` | |

**Indexes:** `employee_schedules_employee_idx(employee_id, weekday)`
**RLS:** SELECT/INSERT/UPDATE/DELETE: admin del business o propio empleado.

---

### 3.9 `employee_absences` — Ausencias/Bloqueos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `employee_id` | uuid → profiles | | ON DELETE CASCADE |
| | `type` | employee_absence_type | `'blocked'` | |
| | `starts_at` | timestamptz | | |
| | `ends_at` | timestamptz | | CHECK ends_at > starts_at |
| | `reason` | text | nullable | |
| FK | `created_by` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `employee_absences_business_idx`, `employee_absences_employee_range_idx`
**RLS:** SELECT: admin o propio empleado. INSERT: admin o propio empleado. UPDATE: admin o propio empleado. DELETE: solo admin.

---

### 3.10 `clients` — Clientes

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `full_name` | text | | |
| | `phone` | text | | |
| | `email` | text | nullable | |
| | `notes` | text | nullable | |
| | `birthday` | date | nullable | |
| | `metadata` | jsonb | `{}` | Datos de nicho |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, phone)`
**Indexes:** `clients_business_idx`, `clients_phone_idx(business_id, phone)`, `clients_branch_idx`
**RLS:** SELECT: staff. INSERT: staff (incluye empleados, permite crear clientes). UPDATE: staff. DELETE: solo admin.

---

### 3.11 `client_preferred_services` — M:N clientes ↔ servicios preferidos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `client_id` | uuid → clients | | ON DELETE CASCADE |
| PK | `service_id` | uuid → services | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `created_at` | timestamptz | `now()` | |

**Indexes:** `client_preferred_services_service_idx`, `client_preferred_services_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: staff.

---

### 3.12 `appointments` — Citas

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `client_id` | uuid → clients | | ON DELETE RESTRICT |
| FK | `employee_id` | uuid → profiles | | ON DELETE RESTRICT |
| FK | `assistant_employee_id` | uuid → profiles | nullable | ON DELETE SET NULL. Ayudante |
| FK | `service_id` | uuid → services | | ON DELETE RESTRICT |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `start_time` | timestamptz | | |
| | `end_time` | timestamptz | | CHECK end_time > start_time |
| | `status` | appointment_status | `'pending'` | |
| | `payment_status` | payment_status | `'unpaid'` | |
| | `price_override` | numeric(12,2) | nullable | Precio manual |
| | `assistant_percentage` | numeric(5,2) | nullable | % del ayudante |
| | `employee_percentage_override` | numeric(5,2) | nullable | Sobrescribe % comisión empleado |
| | `service_notes` | text | nullable | Notas del servicio |
| | `internal_notes` | text | nullable | Notas internas |
| | `reminder_sent_at` | timestamptz | nullable | |
| | `source` | appointment_source | `'internal'` | |
| | `group_id` | uuid | nullable | Agrupa citas simultáneas |
| FK | `created_by` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `appointments_business_start_idx`, `appointments_employee_start_idx`, `appointments_client_start_idx`, `appointments_status_idx`, `appointments_reminder_idx`, `appointments_group_id_idx`
**RLS:** SELECT: superadmin, admin, o propio empleado. INSERT: staff. UPDATE: admin o propio empleado (staff). DELETE: solo admin.

---

### 3.13 `appointment_services` — Servicios por cita (pivot)

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `appointment_id` | uuid → appointments | | ON DELETE CASCADE |
| FK | `service_id` | uuid → services | | ON DELETE RESTRICT |
| FK | `employee_id` | uuid → profiles | | ON DELETE RESTRICT |
| FK | `assistant_id` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `assistant_percentage` | numeric(5,2) | `0` | |
| | `price_applied` | numeric(12,2) | | |
| | `created_at` | timestamptz | `now()` | |

**Indexes:** `appt_svc_appointment_idx`, `appt_svc_employee_idx`
**RLS:** Admin full access. Empleados: SELECT de sus propias citas.

---

### 3.14 `transactions` — Cobros

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `appointment_id` | uuid → appointments | | ON DELETE RESTRICT |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `total_amount` | numeric(12,2) | | CHECK >= 0. **SIEMPRE en USD** |
| | `local_amount` | numeric(12,2) | | CHECK >= 0. Porción negocio |
| | `employee_amount` | numeric(12,2) | | CHECK >= 0. Porción empleado |
| | `assistant_amount` | numeric(12,2) | `0` | |
| | `local_percentage` | numeric(5,2) | | CHECK 0-100 |
| | `employee_percentage` | numeric(5,2) | | CHECK 0-100 |
| | `assistant_percentage` | numeric(5,2) | `0` | |
| | `tip_amount` | numeric(12,2) | `0` | Propina (100% empleado) |
| | `method` | payment_method | `'cash'` | |
| | `exchange_rate_used` | numeric(12,4) | `1.0000` | Tasa al cobrar |
| | `payments_breakdown` | jsonb | `[]` | `[{method, amount, currency, inputAmount}]` |
| | `paid_at` | timestamptz | `now()` | |
| FK | `created_by` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `notes` | text | nullable | |
| | `created_at` | timestamptz | `now()` | |

**Constraints:**
- `local_amount + employee_amount + assistant_amount = total_amount`
- `local_percentage + employee_percentage + assistant_percentage = 100`

**Indexes:** `transactions_business_paid_idx`, `transactions_appointment_idx`
**RLS:** SELECT: superadmin, admin, o empleado de la cita. INSERT/UPDATE: admin. DELETE: superadmin o admin.

---

### 3.15 `expenses` — Gastos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | Concepto |
| | `category` | text | `'general'` | |
| | `amount` | numeric(12,2) | | CHECK >= 0. **SIEMPRE en USD** |
| | `currency` | text | `'USD'` | USD / VES |
| | `original_amount` | numeric(12,2) | `0` | Monto en VES si aplica |
| | `exchange_rate_used` | numeric(12,4) | `1.0000` | |
| | `expense_date` | date | `CURRENT_DATE` | |
| | `notes` | text | nullable | |
| FK | `created_by` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `expenses_business_date_idx(business_id, expense_date DESC)`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.16 `employee_payments` — Pagos de nómina y débitos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `employee_id` | uuid → profiles | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `amount` | numeric(10,2) | | CHECK > 0. **SIEMPRE en USD** |
| | `payment_method` | text | `'cash'` | |
| | `notes` | text | nullable | |
| | `payment_date` | date | `CURRENT_DATE` | |
| | `type` | text | `'payment'` | payment / consumption |
| | `concept` | text | nullable | Concepto del consumo |
| | `currency` | text | `'USD'` | USD / VES |
| | `original_amount` | numeric(12,2) | `0` | Monto en VES si aplica |
| | `exchange_rate_used` | numeric(12,4) | `1.0000` | |
| FK | `created_by` | uuid → profiles | nullable | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `idx_employee_payments_business`, `idx_employee_payments_employee`, `idx_employee_payments_date`, `employee_payments_branch_idx`
**RLS:** SELECT: staff (admin + empleado ve sus propios pagos). INSERT/UPDATE/DELETE: admin.

---

### 3.17 `product_categories` — Categorías de productos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `parent_id` | uuid → product_categories | nullable | ON DELETE SET NULL |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `description` | text | nullable | |
| | `active` | boolean | `true` | |
| | `metadata` | jsonb | `{}` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, name)`
**Indexes:** `product_categories_business_idx`, `product_categories_parent_idx`, `product_categories_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.18 `products` — Productos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `category_id` | uuid → product_categories | nullable | ON DELETE SET NULL |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `description` | text | nullable | |
| | `sku` | text | nullable | |
| | `barcode` | text | nullable | |
| | `unit` | text | `'unit'` | |
| | `unit_cost` | numeric(12,4) | `0` | CHECK >= 0 |
| | `unit_price` | numeric(12,4) | `0` | CHECK >= 0 |
| | `reorder_point` | numeric(12,4) | `0` | CHECK >= 0 |
| | `active` | boolean | `true` | Soft delete |
| | `is_sellable` | boolean | `true` | Se vende en POS |
| | `metadata` | jsonb | `{}` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, name)`, `UNIQUE (business_id, sku)`
**Indexes:** `products_business_idx`, `products_category_idx`, `products_active_idx`, `products_sellable_idx`, `products_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.19 `product_variants` — Variantes de productos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `product_id` | uuid → products | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `sku` | text | nullable | |
| | `unit_cost` | numeric(12,4) | `0` | CHECK >= 0 |
| | `unit_price` | numeric(12,4) | `0` | CHECK >= 0 |
| | `metadata` | jsonb | `{}` | |
| | `active` | boolean | `true` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (product_id, name)`
**Indexes:** `product_variants_product_idx`, `product_variants_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.20 `inventory_locations` — Ubicaciones / Almacenes

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `name` | text | | |
| | `is_default` | boolean | `false` | |
| | `active` | boolean | `true` | |
| | `metadata` | jsonb | `{}` | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (business_id, name)`
**Indexes:** `inventory_locations_business_idx`, `inventory_locations_branch_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.21 `inventory_stock` — Stock

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `location_id` | uuid → inventory_locations | | ON DELETE CASCADE |
| FK | `product_id` | uuid → products | | ON DELETE CASCADE |
| FK | `variant_id` | uuid → product_variants | nullable | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `quantity` | numeric(12,4) | `0` | CHECK >= 0 |
| | `reserved_qty` | numeric(12,4) | `0` | CHECK >= 0 |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Constraints:** `UNIQUE (location_id, product_id, variant_id)`
**Indexes:** `inventory_stock_unique_idx(location_id, product_id, variant_id)`, `inventory_stock_business_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.22 `inventory_movements` — Historial de movimientos

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `location_id` | uuid → inventory_locations | | ON DELETE CASCADE |
| FK | `product_id` | uuid → products | | ON DELETE CASCADE |
| FK | `variant_id` | uuid → product_variants | nullable | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `movement_type` | inventory_movement_type | | |
| | `quantity` | numeric(12,4) | | CHECK <> 0 |
| | `unit_cost` | numeric(12,4) | `0` | |
| | `exchange_rate_used` | numeric(12,4) | `1.0000` | |
| | `reference_type` | text | nullable | |
| | `reference_id` | uuid | nullable | |
| | `notes` | text | nullable | |
| FK | `created_by` | uuid → profiles | nullable | ON DELETE SET NULL |
| | `created_at` | timestamptz | `now()` | |

**Indexes:** `inventory_movements_business_idx`, `inventory_movements_product_idx`
**RLS:** SELECT: staff. INSERT/UPDATE/DELETE: admin.

---

### 3.23 `suppliers` — Proveedores

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `first_name` | text | | |
| | `last_name` | text | | |
| | `phone` | text | nullable | |
| | `company` | text | nullable | |
| | `total_debt` | numeric(12,2) | `0` | Deuda en USD. CHECK >= 0 |
| | `debt_currency` | text | `'USD'` | USD / VES |
| | `debt_original_amount` | numeric(12,2) | `0` | CHECK >= 0 |
| | `debt_exchange_rate` | numeric(12,4) | `1` | CHECK > 0 |
| | `notes` | text | nullable | |
| | `active` | boolean | `true` | Soft delete |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `idx_suppliers_business`, `idx_suppliers_active`, `suppliers_branch_idx`
**RLS:** SELECT/INSERT/UPDATE/DELETE: admin.

---

### 3.24 `supplier_payments` — Pagos a proveedores

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `supplier_id` | uuid → suppliers | | ON DELETE CASCADE |
| FK | `branch_id` | uuid → branches | nullable | ON DELETE SET NULL |
| | `amount` | numeric(12,2) | | CHECK > 0 |
| | `payment_method` | text | `'cash'` | |
| | `payment_date` | date | `CURRENT_DATE` | |
| | `notes` | text | nullable | |
| FK | `created_by` | uuid → profiles | nullable | |
| | `created_at` | timestamptz | `now()` | |
| | `updated_at` | timestamptz | `now()` | Auto via trigger |

**Indexes:** `idx_supplier_payments_business`, `idx_supplier_payments_supplier`, `idx_supplier_payments_date`, `supplier_payments_branch_idx`
**RLS:** SELECT/INSERT/UPDATE/DELETE: admin.

---

### 3.25 `notifications` — Notificaciones

| # | Columna | Tipo | Default | Notas |
|---|---|---|---|---|
| PK | `id` | uuid | `gen_random_uuid()` | |
| FK | `business_id` | uuid → businesses | | ON DELETE CASCADE |
| FK | `profile_id` | uuid → profiles | | ON DELETE CASCADE |
| | `type` | text | | |
| | `title` | text | | |
| | `message` | text | | |
| FK | `appointment_id` | uuid → appointments | nullable | ON DELETE SET NULL |
| | `client_name` | text | nullable | |
| | `client_phone` | text | nullable | |
| | `service_name` | text | nullable | |
| | `appointment_time` | timestamptz | nullable | |
| | `metadata` | jsonb | `{}` | |
| | `is_read` | boolean | `false` | |
| | `read_at` | timestamptz | nullable | |
| | `created_at` | timestamptz | `now()` | |

**Indexes:** `idx_notifications_unread(profile_id, is_read, created_at DESC) WHERE is_read = false`, `idx_notifications_business`
**RLS:** SELECT: propio profile_id. UPDATE: propio profile_id. INSERT: admin del business (o trigger).

---

## 4. Funciones

### 4.1 `set_updated_at()` — Trigger helper

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### 4.2 Auth helpers (RLS)

```sql
-- auth_role() → app_role
select role from public.profiles where id = auth.uid();

-- auth_business_id() → uuid
select business_id from public.profiles where id = auth.uid();

-- is_superadmin() → boolean
select coalesce(
  (select role = 'superadmin' from public.profiles where id = auth.uid()),
  false
);

-- is_admin_of(target_business uuid) → boolean
select exists (
  select 1 from public.profiles
  where id = auth.uid()
    and (role = 'superadmin' or (role = 'admin' and business_id = target_business))
);

-- is_staff_of(target_business uuid) → boolean
select exists (
  select 1 from public.profiles
  where id = auth.uid()
    and (role = 'superadmin' or business_id = target_business)
);
```

Todas son `security definer set search_path = public, pg_temp`.

### 4.3 `handle_new_user()` — Auto-creación de profile

Trigger AFTER INSERT en `auth.users`. Inserta en `profiles` con datos de `raw_user_meta_data`.

### 4.4 `sync_profile_email()` — Sincronizar email

Trigger AFTER UPDATE OF email en `auth.users`. Sincroniza `profiles.email`.

### 4.5 `active_businesses()`

Retorna `SETOF businesses WHERE deleted_at IS NULL`.

### 4.6 Public booking functions (acceso anon)

| Función | Parámetros | Descripción |
|---|---|---|
| `public_business_info` | p_slug text | Datos públicos del negocio |
| `public_list_services` | p_slug text | Servicios activos |
| `public_list_employees_for_service` | p_slug, p_service_id | Empleados que ofrecen un servicio |
| `public_get_available_slots` | p_slug, p_employee_id, p_service_id, p_date_from, p_date_to, p_slot_minutes | Slots disponibles |
| `public_book_appointment` | p_slug, p_employee_id, p_service_id, p_start_time, p_client_name, p_client_phone, p_client_email, p_client_notes | Agendar cita pública |

### 4.7 `financial_summary(p_business_id, p_period_start, p_period_end, p_period, p_employee_id, p_branch_id)`

Agrupación de transactions por día/semana/mes. `security invoker` con `is_staff_of()` interno.

### 4.8 `record_payment()` — Registrar cobro (VERSIÓN ACTUAL)

**Firma:**
```sql
record_payment(
  p_appointment_id       uuid,
  p_amount               numeric,
  p_method               payment_method default 'cash',
  p_notes                text default null,
  p_exchange_rate        numeric default null,
  p_payments_breakdown   jsonb default '[]'::jsonb,
  p_tip_amount           numeric default 0
) returns uuid
```

**Lógica:**
1. Valida cita existe, autorización (admin), monto > 0
2. Resuelve porcentajes:
   - `assistant_pct` ← `appointment.assistant_percentage`
   - `employee_pct` ← `coalesce(employee_percentage_override, profile.pay_percentage, 100 - service.local_percentage)`
   - `local_pct` ← `100 - employee_pct - assistant_pct`
3. Comisión sobre el monto del servicio (sin propina). Propina va 100% al empleado.
4. Exchange rate cascade: `p_exchange_rate → branch.ves_exchange_rate → business.ves_exchange_rate → 1`
5. INSERT en `transactions` con `branch_id`, `tip_amount`
6. Calcula `payment_status` excluyendo propinas del total pagado
7. Actualiza `payment_status` de la cita Y de sus hermanas de grupo (`group_id`)
8. **`security definer`** con `is_admin_of()` interno

### 4.9 `record_sale()` — Registrar venta POS + productos

**Firma:**
```sql
record_sale(
  p_appointment_id       uuid,
  p_amount               numeric,
  p_method               payment_method default 'cash',
  p_products             jsonb default '[]'::jsonb,
  p_notes                text default null,
  p_exchange_rate        numeric default null,
  p_payments_breakdown   jsonb default '[]'::jsonb,
  p_tip_amount           numeric default 0
) returns uuid
```

Llama a `record_payment` y luego descuenta inventario si hay productos. `security definer`.

### 4.10 `update_transaction(p_transaction_id, p_amount, p_method, p_notes, p_exchange_rate)`

Actualiza una transacción. Recalcula montos usando porcentajes originales. Actualiza `payment_status` de la cita. Si `p_amount` cambia y el pago total baja del total, revierte `completed → confirmed`. `security invoker`.

### 4.11 `delete_transaction(p_transaction_id)`

Elimina transacción. Si es la única transacción de la cita, revierte movimientos de inventario. Actualiza `payment_status`. `security invoker` con `is_admin_of()` interno.

### 4.12 `check_employee_overlap()` — Validación de solapamiento

Trigger BEFORE INSERT/UPDATE en appointments. `security definer`.
- Solo valida citas `pending/confirmed/completed`
- **Skip**: si solo cambian `payment_status` u otras columnas no temporales
- Verifica empleado principal Y asistente
- Excluye citas del mismo grupo

### 4.13 `fn_notify_new_appointment()` / `fn_notify_status_change()`

Triggers que insertan en `notifications` al crear/actualizar citas. `security definer`.

### 4.14 `create_default_branch()` — Auto-crear sucursal

Trigger AFTER INSERT en businesses. Crea branch "Principal".

### 4.15 `get_low_stock_products()`

Retorna productos con stock ≤ reorder_point. `security definer`.

---

## 5. Triggers

| Trigger | Tabla | Evento | Función |
|---|---|---|---|
| `*_set_updated_at` (18 triggers) | businesses, profiles, services, clients, appointments, employee_absences, expenses, service_categories, service_variants, product_categories, products, product_variants, inventory_locations, inventory_stock, branches, suppliers, supplier_payments, employee_payments | BEFORE UPDATE | `set_updated_at()` |
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` |
| `on_auth_user_email_change` | auth.users | AFTER UPDATE OF email | `sync_profile_email()` |
| `check_employee_overlap_trigger` | appointments | BEFORE INSERT OR UPDATE | `check_employee_overlap()` |
| `trg_new_appointment_notification` | appointments | AFTER INSERT | `fn_notify_new_appointment()` |
| `trg_status_change_notification` | appointments | AFTER UPDATE | `fn_notify_status_change()` |
| `trg_create_default_branch` | businesses | AFTER INSERT | `create_default_branch()` |

---

## 6. Resumen de RLS

Todas las 25 tablas tienen RLS habilitado.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| businesses | superadmin o propio | superadmin | admin | superadmin |
| branches | admin o staff | admin | admin | admin |
| profiles | superadmin, propio, mismo biz | superadmin o admin | superadmin, propio, admin | superadmin o admin |
| service_categories | staff | admin | admin | admin |
| services | staff | admin | admin | admin |
| service_variants | staff | admin | admin | admin |
| employee_services | staff | admin | admin | admin |
| employee_schedules | admin o propio empleado | admin o propio empleado | admin o propio empleado | admin o propio empleado |
| clients | staff | staff (incluye empleados) | staff | admin |
| client_preferred_services | staff | staff | staff | staff |
| appointments | superadmin, admin, propio empleado | staff | admin o propio empleado | admin |
| appointment_services | admin full; empleado SELECT | admin | admin | admin |
| transactions | superadmin, admin, empleado de la cita | admin | admin | superadmin o admin |
| expenses | staff | admin | admin | admin |
| employee_absences | admin o propio empleado | admin o propio empleado | admin o propio empleado | admin |
| employee_payments | staff | admin | admin | admin |
| product_categories | staff | admin | admin | admin |
| products | staff | admin | admin | admin |
| product_variants | staff | admin | admin | admin |
| inventory_locations | staff | admin | admin | admin |
| inventory_stock | staff | admin | admin | admin |
| inventory_movements | staff | admin | admin | admin |
| suppliers | admin | admin | admin | admin |
| supplier_payments | admin | admin | admin | admin |
| notifications | propio profile_id | admin | propio profile_id | — |

---

## 7. Índices (todos)

| Tabla | Índice | Columnas | Notas |
|---|---|---|---|
| businesses | `businesses_slug_idx` | slug | |
| businesses | `idx_businesses_active` | id | WHERE deleted_at IS NULL |
| branches | `branches_business_idx` | business_id | |
| profiles | `profiles_business_id_idx` | business_id | |
| profiles | `profiles_role_idx` | role | |
| profiles | `profiles_email_idx` | email | |
| services | `services_business_idx` | business_id | |
| services | `services_business_category_active_idx` | business_id, category, active | |
| services | `services_service_category_idx` | service_category_id | |
| services | `services_branch_idx` | branch_id | |
| service_categories | `service_categories_business_idx` | business_id | |
| service_categories | `service_categories_parent_idx` | parent_id | |
| service_variants | `service_variants_service_idx` | service_id | |
| service_variants | `service_variants_business_idx` | business_id | |
| employee_services | `employee_services_service_idx` | service_id | |
| employee_schedules | `employee_schedules_employee_idx` | employee_id, weekday | |
| clients | `clients_business_idx` | business_id | |
| clients | `clients_phone_idx` | business_id, phone | |
| clients | `clients_branch_idx` | branch_id | |
| client_preferred_services | `client_preferred_services_service_idx` | service_id | |
| client_preferred_services | `client_preferred_services_branch_idx` | branch_id | |
| appointments | `appointments_business_start_idx` | business_id, start_time | |
| appointments | `appointments_employee_start_idx` | employee_id, start_time | |
| appointments | `appointments_client_start_idx` | client_id, start_time DESC | |
| appointments | `appointments_status_idx` | business_id, status | |
| appointments | `appointments_reminder_idx` | start_time | WHERE reminder_sent_at IS NULL AND status IN ('pending','confirmed') |
| appointments | `appointments_group_id_idx` | group_id | |
| appointment_services | `appt_svc_appointment_idx` | appointment_id | |
| appointment_services | `appt_svc_employee_idx` | employee_id | |
| transactions | `transactions_business_paid_idx` | business_id, paid_at DESC | |
| transactions | `transactions_appointment_idx` | appointment_id | |
| expenses | `expenses_business_date_idx` | business_id, expense_date DESC | |
| employee_absences | `employee_absences_business_idx` | business_id | |
| employee_absences | `employee_absences_employee_range_idx` | employee_id, starts_at, ends_at | |
| product_categories | `product_categories_business_idx` | business_id | |
| product_categories | `product_categories_parent_idx` | parent_id | |
| product_categories | `product_categories_branch_idx` | branch_id | |
| products | `products_business_idx` | business_id | |
| products | `products_category_idx` | category_id | |
| products | `products_active_idx` | business_id, active | |
| products | `products_sellable_idx` | business_id, is_sellable | WHERE is_sellable = true |
| products | `products_branch_idx` | branch_id | |
| product_variants | `product_variants_product_idx` | product_id | |
| product_variants | `product_variants_branch_idx` | branch_id | |
| inventory_locations | `inventory_locations_business_idx` | business_id | |
| inventory_locations | `inventory_locations_branch_idx` | branch_id | |
| inventory_stock | `inventory_stock_unique_idx` | location_id, product_id, variant_id | UNIQUE |
| inventory_stock | `inventory_stock_business_idx` | business_id | |
| inventory_movements | `inventory_movements_business_idx` | business_id, created_at DESC | |
| inventory_movements | `inventory_movements_product_idx` | product_id | |
| employee_payments | `idx_employee_payments_business` | business_id | |
| employee_payments | `idx_employee_payments_employee` | employee_id | |
| employee_payments | `idx_employee_payments_date` | payment_date | |
| employee_payments | `employee_payments_branch_idx` | branch_id | |
| suppliers | `idx_suppliers_business` | business_id | |
| suppliers | `idx_suppliers_active` | business_id, active | |
| suppliers | `suppliers_branch_idx` | branch_id | |
| supplier_payments | `idx_supplier_payments_business` | business_id | |
| supplier_payments | `idx_supplier_payments_supplier` | supplier_id | |
| supplier_payments | `idx_supplier_payments_date` | payment_date | |
| supplier_payments | `supplier_payments_branch_idx` | branch_id | |
| notifications | `idx_notifications_unread` | profile_id, is_read, created_at DESC | WHERE is_read = false |
| notifications | `idx_notifications_business` | business_id | |

---

## 8. Diagrama de Relaciones

```
businesses ─────────────────────┬───────────────────────────────── [maestro]
    │                           │
    ├── branches ───────────────┤ (ves_exchange_rate por sucursal)
    │                           │
    ├── profiles ───────────────┼── employee_schedules
    │   │                       │   employee_absences
    │   │                       │   employee_services (M:N)
    │   │                       │   employee_payments
    │   │                       │   notifications (profile_id)
    │   │
    │   ├── appointments ───────┬── appointment_services (pivot, multi-servicio)
    │   │       │               │
    │   │       ├── transactions (cobros, con tip_amount)
    │   │       │       │
    │   │       │       └── payments_breakdown (jsonb)
    │   │       │
    │   │       └── notifications (appointment_id)
    │   │
    │   ├── clients ────────────┬── client_preferred_services (M:N)
    │   │
    │   ├── services ───────────┬── service_categories
    │   │   │                   │   service_variants
    │   │   │                   └── employee_services (M:N)
    │   │
    │   ├── expenses
    │   │
    │   ├── suppliers ──────────┬── supplier_payments
    │   │
    │   └── products ───────────┬── product_categories
    │       │                   │   product_variants
    │       └── inventory_stock ── inventory_locations
    │           inventory_movements
    │
    └── notifications (business_id)
```

---

## 9. Convenciones de Moneda

| Regla | Detalle |
|---|---|
| `transactions.total_amount` | **SIEMPRE en USD** |
| `transactions.tip_amount` | **SIEMPRE en USD**, va 100% al empleado |
| `expenses.amount` | **SIEMPRE en USD** |
| `employee_payments.amount` | **SIEMPRE en USD** |
| `products.unit_cost` / `unit_price` | **USD** |
| Montos originales en VES | Se guardan en `currency`, `original_amount`, `exchange_rate_used` |
| `businesses.ves_exchange_rate` | Tasa USD→VES del día (default 36.5) |
| `branches.ves_exchange_rate` | Tasa por sucursal (nullable, fallback a business) |
| `businesses.employee_ves_rate` | Tasa específica para recibos de empleados (nullable) |
| Exchange rate cascade | `p_exchange_rate → branch → business → 1` |
| `local_percentage` / `local_amount` | "Local" = porción del negocio (NO moneda local) |

---

## 10. Flujo de Comisión (`employee_percentage_override`)

Prioridad al calcular `employee_pct` en `record_payment`:
1. `appointments.employee_percentage_override` — override por cita
2. `profiles.pay_percentage` — default del empleado
3. `100 - services.local_percentage` — split del servicio

---

## 11. Feature Flags

Columna `businesses.features` (jsonb):
```json
{
  "pos": true,
  "inventario": true,
  "productos": true,
  "proveedores": true,
  "multi_branch": false
}
```

---

## 12. Migraciones (66 archivos)

| # | Migración | Cambio |
|---|---|---|
| 1 | `20260511190000_init_schema` | Schema inicial |
| 2 | `20260511190100_rls_policies` | Políticas RLS |
| 3 | `20260511190200_functions` | Funciones core (record_payment, etc.) |
| 4 | `20260512143000_extend_operational_schema` | Tablas operativas extra |
| 5 | `20260516120000_add_expenses` | Tabla expenses |
| 6 | `20260518170000_remove_client_active` | Quitar soft delete de clients |
| 7 | `20260518190000_add_business_config_metadata` | theme_config, terminology |
| 8 | `20260519120000_add_inventory_and_service_variants` | Inventario + variantes |
| 9 | `20260521120000_record_sale` | Función record_sale |
| 10 | `20260521150000_fix_currency_to_usd` | Corrección moneda |
| 11 | `20260521160000_add_multicurrency_support` | Soporte multi-moneda |
| 12 | `20260521200000_update_functions_multicurrency` | record_payment multicurrency |
| 13 | `20260525000000_auth_user_trigger` | Trigger handle_new_user |
| 14 | `20260525100000_soft_delete_businesses` | deleted_at en businesses |
| 15 | `20260526100000_add_job_titles_to_business` | job_titles jsonb |
| 16 | `20260526200000_add_service_categories_to_business` | service_categories jsonb |
| 17 | `20260530000000_add_employee_payments` | Tabla employee_payments |
| 18 | `20260531100000_add_group_id` | group_id en appointments |
| 19 | `20260601000000_fix_employee_payments_rls` | RLS de employee_payments |
| 20 | `20260602000000_apply_core_functions` | Actualiza funciones core |
| 21 | `20260603000000_fix_payment_status_cast` | Fix cast enum |
| 22 | `20260608120000_add_product_is_sellable` | is_sellable en products |
| 23 | `20260609000000_fix_group_overlap_constraint` | Fix overlap para grupos |
| 24 | `20260609000001_edit_delete_transaction` | update/delete_transaction |
| 25 | `20260610000000_fix_transactions_delete_rls` | RLS para delete transaction |
| 26 | `20260610000001_add_exchange_rate_to_inventory` | exchange_rate en inventory_movements |
| 27 | `20260610000002_add_appointment_price_override` | price_override en appointments |
| 28 | `20260611000000_add_reminder_notifications` | Tabla reminder_notifications |
| 29 | `20260616161002_add_cash_ves_payment_method` | Enum cash_ves |
| 30 | `20260616170000_add_email_to_profiles` | email en profiles |
| 31 | `20260617120000_add_suppliers` | Tablas suppliers, supplier_payments |
| 32 | `20260618000000_add_notifications` | Tabla notifications |
| 33 | `20260619000000_add_assistant_employee` | assistant_employee_id en appointments |
| 34 | `20260622000000_add_employee_consumption_type` | type, concept en employee_payments |
| 35 | `20260623145411_native_currency_columns` | Columnas currency nativas |
| 36 | `20260623150000_add_appointment_services` | Tabla appointment_services |
| 37 | `20260623150001_add_branches` | Tabla branches |
| 38 | `20260623191000_production_hardening` | Hardening producción |
| 39 | `20260624000000_multi_branch_toggle` | multi_branch_enabled |
| 40 | `20260624000100_feature_flags` | features jsonb |
| 41 | `20260624150000_add_employee_percentage_override` | employee_percentage_override |
| 42 | `20260625000000_add_branch_id_to_all_tables` | branch_id en todas las tablas |
| 43 | `20260625000001_add_low_stock_function` | get_low_stock_products |
| 44 | `20260625000002_update_financial_summary` | financial_summary con branch_id |
| 45 | `20260625000003_update_record_sale_branch` | record_sale con branch_id |
| 46 | `20260625000004_fix_record_payment_branch_id` | record_payment con branch_id + pay_percentage |
| 47 | `20260625000005_fix_transaction_check_constraints` | Constraints total_amount |
| 48 | `20260625000006_fix_delete_transaction_security` | delete_transaction security definer |
| 49 | `20260625000007_add_salary_frequency` | salary_frequency |
| 50 | `20260625000008_fix_record_sale_security` | record_sale security definer |
| 51 | `20260627090000_backfill_employee_percentage_override_transactions` | Backfill transactions |
| 52 | `20260628000000_add_branch_exchange_rate` | ves_exchange_rate en branches |
| 53 | `20260629200000_fix_employee_payments_rls_for_staff` | Empleados ven sus pagos |
| 54 | `20260629210000_fix_appointments_delete_rls_for_staff` | RLS delete appointments |
| 55 | `20260629220000_add_tip_amount_to_transactions` | tip_amount + record_payment con tips |
| 56 | `20260629230000_add_employees_create_clients_feature` | Permite a empleados crear clientes |
| 57 | `20260630000000_add_employee_ves_rate` | employee_ves_rate en businesses |
| 58 | `20260630200000_add_appointment_duration_override` | duration_override |
| 59 | `20260701000000_fix_inventory_multi_branch_constraints` | Constraints inventario multi-branch |
| 60 | `20260701150000_fix_product_categories_multi_branch` | branch_id en product_categories |
| 61 | `20260701160000_fix_past_appointment_payment` | record_payment security definer + overlap fix |
| 62 | `20260701200000_copy_mimosa_to_luma` | Data migration |
| 63 | `20260701210000_add_disable_agenda` | disable_agenda feature |
| 64 | `20260702170000_add_punto_venta_payment_method` | Enum punto_venta |
| 65 | `20260705000000_add_delete_product_sale` | delete_product_sale |
| 66 | `20260706120000_cascade_payment_status_group` | Cascade payment_status a grupo |
