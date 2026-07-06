# Modelo de Base de Datos — Salones

24 tablas en esquema `public`. Base de datos Supabase PostgreSQL

---

## Core del Negocio

### `businesses` — Negocios/Salones

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `slug` | text unique | |
| `phone` | text | |
| `address` | text | |
| `timezone` | text | |
| `currency` | text | USD por defecto |
| `ves_exchange_rate` | numeric(12,4) | Tasa del día, default 36.5 |
| `niche_type` | text | salon, barberia, petshop |
| `theme_config` | jsonb | Config visual (colores, modo) |
| `terminology` | jsonb | `{client:"Cliente", employee:"Empleado", ...}` |
| `job_titles` | jsonb | Cargos personalizados |
| `service_categories` | jsonb | Categorías de servicios |
| `active` | boolean | Soft delete |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `profiles` — Empleados/Usuarios

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | Vinculado a auth.users |
| `business_id` | uuid FK → businesses | |
| `full_name` | text | |
| `role` | text | admin, empleado, superadmin |
| `phone` | text | |
| `avatar_url` | text | |
| `email` | text | |
| `job_title` | text | Cargo |
| `pay_type` | text | salary / percentage / mixed |
| `pay_percentage` | numeric(5,2) | % de comisión |
| `base_salary` | numeric(12,2) | Sueldo base |
| `active` | boolean | Soft delete |
| `metadata` | jsonb | Datos extra |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `employee_schedules` — Horarios

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid FK → businesses |
| `employee_id` | uuid FK → profiles |
| `day_of_week` | int (0-6) |
| `start_time` | time |
| `end_time` | time |

---

## Servicios

### `services` — Catálogo de servicios

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `service_category_id` | uuid FK → service_categories | |
| `name` | text | |
| `description` | text nullable | |
| `duration_minutes` | int | |
| `price` | numeric(12,2) | USD |
| `local_percentage` | numeric(5,2) | % que se queda el negocio |
| `color` | text nullable | Color en calendario |
| `category` | text | Nombre de categoría (legacy) |
| `icon` | text nullable | SVG path |
| `active` | boolean | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `service_categories` — Categorías de servicios

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid FK → businesses |
| `name` | text |

### `service_variants` — Variantes (ej: "Cabello Corto" / "Cabello Largo")

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid FK → businesses |
| `service_id` | uuid FK → services |
| `name` | text |
| `description` | text nullable |
| `duration_minutes` | int |
| `price` | numeric(12,2) |

### `employee_services` — M:N empleados ↔ servicios que ofrecen

| Columna | Tipo |
|---|---|
| `employee_id` | uuid FK → profiles |
| `service_id` | uuid FK → services |
| **PK** | (employee_id, service_id) |

---

## Clientes

### `clients`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `full_name` | text | |
| `phone` | text | |
| `email` | text nullable | |
| `notes` | text nullable | |
| `birthday` | date nullable | |
| `metadata` | jsonb | Datos de nicho (tipo cabello, mascota, etc.) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `client_preferred_services` — M:N clientes ↔ servicios preferidos

| Columna | Tipo |
|---|---|
| `client_id` | uuid FK → clients |
| `service_id` | uuid FK → services |
| **PK** | (client_id, service_id) |

---

## Citas / Agenda

### `appointments`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `client_id` | uuid FK → clients | |
| `employee_id` | uuid FK → profiles | Empleado principal |
| `assistant_employee_id` | uuid FK → profiles | Ayudante (nullable) |
| `assistant_percentage` | numeric(5,2) | % del ayudante (nullable) |
| `service_id` | uuid FK → services | |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `status` | text | confirmed / pending / cancelled / completed / no_show |
| `payment_status` | text | unpaid / partial / paid |
| `price_override` | numeric(12,2) | Precio manual (nullable) |
| `notes` | text nullable | |
| `group_id` | uuid nullable | Agrupa citas simultáneas |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `employee_absences` — Ausencias

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid FK → businesses |
| `employee_id` | uuid FK → profiles |
| `date` | date |
| `reason` | text |

---

## Transacciones / Pagos

### `transactions` — Cada cobro de una cita

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `appointment_id` | uuid FK → appointments | |
| `total_amount` | numeric(12,2) | Total cobrado (SIEMPRE en USD) |
| `local_amount` | numeric(12,2) | Porción del negocio |
| `employee_amount` | numeric(12,2) | Porción del empleado |
| `assistant_amount` | numeric(12,2) | Porción del ayudante |
| `local_percentage` | numeric(5,2) | % negocio |
| `employee_percentage` | numeric(5,2) | % empleado |
| `assistant_percentage` | numeric(5,2) | % ayudante |
| `method` | payment_method | cash / card / transfer / zelle / pago_movil / cash_ves / mixed / other |
| `exchange_rate_used` | numeric(12,4) | Tasa al momento del cobro |
| `payments_breakdown` | jsonb | Desglose multi-método `[{method, amount, currency, inputAmount}]` |
| `paid_at` | timestamptz | |
| `notes` | text nullable | |
| `created_by` | uuid FK → profiles | |
| `created_at` | timestamptz | |

**Constraints:**
- `local_amount + employee_amount + assistant_amount = total_amount`
- `local_percentage + employee_percentage + assistant_percentage = 100`

---

## Empleados — Pagos y Consumos

### `employee_payments` — Pagos de nómina y débitos por consumo

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `employee_id` | uuid FK → profiles | |
| `amount` | numeric(12,2) | Monto en USD |
| `payment_method` | text | |
| `payment_date` | date | |
| `notes` | text | Prefijo `[VES:monto]` o `[USD:monto]` |
| `type` | text | payment / consumption |
| `concept` | text nullable | Concepto del consumo |
| `created_at` | timestamptz | |

---

## Gastos

### `expenses` — Gastos operativos

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `name` | text | Concepto |
| `amount` | numeric(12,2) | Monto en USD |
| `category` | text | Fijos / Insumos / General |
| `expense_date` | date | |
| `notes` | text | Prefijo `[VES:monto:tasa]` para gastos en bolívares |
| `created_at` | timestamptz | |

---

## Proveedores

### `suppliers`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `first_name` | text | |
| `last_name` | text | |
| `phone` | text | |
| `company` | text nullable | |
| `total_debt` | numeric(12,2) | Deuda en USD |
| `debt_currency` | text | USD / VES |
| `notes` | text nullable | |
| `active` | boolean | Soft delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `supplier_payments` — Pagos a proveedores

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `supplier_id` | uuid FK → suppliers | |
| `amount` | numeric(12,2) | Monto en USD |
| `payment_date` | date | |
| `notes` | text nullable | |
| `currency` | text | USD / VES |
| `original_amount` | numeric(12,2) | Monto original si fue VES |
| `exchange_rate_used` | numeric(12,4) | |
| `created_at` | timestamptz | |

---

## Inventario y Productos

### `product_categories`

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `business_id` | uuid FK → businesses |
| `name` | text |

### `products` — Productos vendibles

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `category_id` | uuid FK → product_categories | |
| `name` | text | |
| `description` | text nullable | |
| `sku` | text unique | |
| `barcode` | text nullable | |
| `unit` | text | unidad, caja, etc. |
| `unit_cost` | numeric(12,4) | Costo unitario |
| `unit_price` | numeric(12,4) | Precio venta |
| `reorder_point` | numeric(12,4) | Punto de reorden |
| `is_sellable` | boolean | Se vende en POS |
| `active` | boolean | Soft delete |
| `metadata` | jsonb | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `product_variants` — Variantes (talla, color)

| Columna | Tipo |
|---|---|
| `id` | uuid PK |
| `product_id` | uuid FK → products |
| `name` | text |
| `sku` | text nullable |
| `unit_cost` | numeric(12,4) |
| `unit_price` | numeric(12,4) |
| `active` | boolean |

### `inventory_locations` — Ubicaciones / almacenes

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `name` | text | |
| `is_default` | boolean | |

### `inventory_stock` — Stock por producto + variante + ubicación

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `product_id` | uuid FK → products | |
| `variant_id` | uuid FK → product_variants | nullable |
| `location_id` | uuid FK → inventory_locations | |
| `quantity` | numeric(12,4) | |
| `reserved_qty` | numeric(12,4) | |

### `inventory_movements` — Historial de movimientos

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `product_id` | uuid FK → products | |
| `variant_id` | uuid FK → product_variants | nullable |
| `location_id` | uuid FK → inventory_locations | |
| `type` | text | purchase / sale / adjustment / transfer_in / transfer_out / return / consumption |
| `quantity` | numeric(12,4) | |
| `unit_cost` | numeric(12,4) | |
| `reference_id` | text nullable | |
| `notes` | text nullable | |
| `exchange_rate_used` | numeric(12,4) | |
| `created_at` | timestamptz | |

---

## Notificaciones

### `notifications`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `user_id` | uuid FK → profiles | |
| `type` | text | |
| `title` | text | |
| `body` | text | |
| `data` | jsonb | |
| `read` | boolean | |
| `created_at` | timestamptz | |

### `reminder_notifications` — Recordatorios de cita

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `appointment_id` | uuid FK → appointments | |
| `business_id` | uuid FK → businesses | |
| `channel` | text | sms, email, etc. |
| `scheduled_for` | timestamptz | |
| `sent_at` | timestamptz nullable | |
| `status` | text | pending / sent / failed |
| `error_message` | text nullable | |

---

## Diagrama de Relaciones

```
businesses ─────────────┬────────────────────────── [maestro]
    │                   │
    ├── profiles ───────┼── employee_schedules
    │   │               │   employee_absences
    │   │               │   employee_services
    │   │               │   employee_payments
    │   │               │   notifications (user_id)
    │   │
    │   ├── appointments ── transactions
    │   │       │              │
    │   │       │              └── (usa exchange_rate_used)
    │   │       │
    │   │       └── reminder_notifications
    │   │
    │   ├── clients ── client_preferred_services
    │   │
    │   ├── services ── service_categories
    │   │   │           service_variants
    │   │   └── employee_services (M:N)
    │   │
    │   ├── expenses
    │   │
    │   ├── suppliers ── supplier_payments
    │   │
    │   └── products ── product_categories
    │       │           product_variants
    │       └── inventory_stock ── inventory_locations
    │           inventory_movements
    │
    └── notifications (business_id)
```

---

## Convenciones de Moneda

- **`total_amount` en transactions** → SIEMPRE en USD
- **`amount` en expenses** → SIEMPRE en USD
- **`amount` en employee_payments** → SIEMPRE en USD
- **`ves_exchange_rate` en businesses** → tasa del día (ej: 40.5)
- **Montos originales en VES** → se guardan en `notes` con prefijo `[VES:monto:tasa]` o `[VES:monto]`
- **`local_amount`** en transactions → porción del negocio (NO es monto en moneda local), `local` = "local del negocio"

## Soft Deletes

Todas las tablas principales usan columna `active` (boolean) en lugar de DELETE físico:
- `businesses`, `profiles`, `services`, `products`, `clients`, `suppliers`
