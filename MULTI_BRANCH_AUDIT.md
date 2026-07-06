# Multi-Branch Readiness Audit

> Auditoría del sistema **Luma** para manejar 2+ sucursales por negocio.
> Evaluado al 2026-07-01.

---

## Resumen ejecutivo

El código frontend está **90% preparado** (filtros, queries, servicios pasan `branch_id` correctamente). Sin embargo, la base de datos tiene **7 constraints obsoletos** y **2 funciones SQL** que no consideran sucursal, dejando el sistema **inutilizable** para sucursal 2+ sin intervención.

---

## P0 — Bloqueantes (rompe funcionalidad)

### 1. Constraints `unique(...)` sin `branch_id`

7 constraints únicos en la DB no incluyen `branch_id`, impidiendo crear datos con el mismo nombre en sucursales distintas.

| Tabla | Constraint actual | Impacto |
|---|---|---|
| `products` | `unique(business_id, name)` | No puedes crear "Shampoo" en sucursal 2 si ya existe en sucursal 1 |
| `products` | `unique(business_id, sku)` | SKU duplicado entre sucursales |
| `product_categories` | `unique(business_id, name)` | Categorías colisionan entre sucursales |
| `product_variants` | `unique(product_id, name)` | Variantes (talla/color) colisionan |
| `service_categories` | `unique(business_id, name)` | Categorías de servicio colisionan |
| `service_variants` | `unique(service_id, name)` | Variantes de servicio colisionan |
| `inventory_locations` | `unique(business_id, name)` | Ubicación "Principal" no se puede crear por sucursal |

**Síntoma:** `duplicate key value violates unique constraint "products_business_id_name_key"` al guardar en sucursal 2.

### 2. `public_book_appointment` no guarda `branch_id`

La función SQL que procesa reservas desde el **link público** inserta citas sin `branch_id`.

```sql
-- 20260511190200 — el INSERT no incluye branch_id
insert into public.appointments (business_id, client_id, employee_id, service_id, ...
```

**Impacto:** Las citas creadas por clientes desde el enlace público quedan con `branch_id = NULL`. No aparecen en la agenda cuando se filtra por sucursal.

### 3. `delete_transaction` restaura stock sin `branch_id`

Al eliminar una transacción, la función `delete_transaction` restaura stock en `inventory_stock` sin filtrar por `branch_id`.

```sql
-- 20260625000006:46-55 — busca (product_id, variant_id, location_id) sin branch_id
update inventory_stock set quantity = quantity + v_qty
where product_id = v_product_id
  and (variant_id = v_variant_id or (variant_id is null and v_variant_id is null))
  and location_id = v_location_id
```

**Impacto:** Si dos sucursales tienen el mismo producto en la misma ubicación, restaurar stock al eliminar una venta de sucursal 1 afecta el stock de sucursal 2. **Corrupción de datos.**

---

## P1 — Alta prioridad

### 4. `employee_schedules` históricos sin `branch_id`

La migración `20260623150001_add_branches.sql` agregó `branch_id` a `employee_schedules` pero el backfill la saltó explícitamente:

```sql
-- employee_schedules has no business_id column; branch can be resolved
-- through profiles.employee_id → profiles.business_id at query time.
```

**Impacto:** Empleados con horarios creados antes de la migración tienen `branch_id = NULL`. Al filtrar empleados por sucursal en **Equipo** (`s.branch_id === branchId`), estos empleados **desaparecen**.

### 5. `employee_services` no tiene `branch_id`

La tabla `employee_services` (asignación empleado ↔ servicio) no tiene columna `branch_id`. Un empleado asignado a "Corte" en sucursal 1, automáticamente ofrece "Corte" en sucursal 2.

**Impacto:** No se puede granular qué servicios ofrece cada empleado por sucursal.

---

## P2 — Medio / Mejorable

| # | Problema | Detalle |
|---|---|---|
| 6 | `get_low_stock_products()` suma stock global | Reporta "stock bajo" sumando todas las sucursales. No alerta por sucursal individual. |
| 7 | `check_employee_overlap` ignora `branch_id` | El trigger de solapamiento de agenda bloquea citas aunque sean en distintas sucursales. |
| 8 | `employee_absences` sin `branch_id` | Ausencias de empleados son globales al negocio. |
| 9 | `record_payment` es `security invoker` | Si se llama directo (no desde `record_sale`), falla silenciosamente por RLS. |

---

## Frontend — Estado por servicio

| Servicio | Lista | Crea | Edita | Elimina | Status |
|---|---|---|---|---|---|
| `clientesService` | ✅ filtra | ✅ envía | ✅ envía | ✅ por ID | Listo |
| `serviciosService` | ✅ filtra | ✅ envía | ✅ envía | ✅ soft-delete | Listo |
| `productosService` | ✅ filtra | ✅ envía | ✅ envía | ✅ soft-delete | Listo |
| `equipoService` | ✅ filtra | ✅ envía | ✅ envía | ✅ por ID | Listo |
| `expensesService` | ✅ filtra | ✅ envía | ✅ envía | ✅ por ID | Listo |
| `employeePaymentsService` | ✅ filtra | ✅ envía | ✅ envía | ✅ por ID | Listo |
| `suppliersService` | ✅ filtra | ✅ envía | ✅ envía | ✅ soft-delete | Listo |
| `agendaService` | ✅ filtra | ✅ envía | ✅ envía | ✅ por ID | Listo |
| `posService` | ✅ filtra | ✅ vía RPC | — | ✅ vía RPC | Listo |
| `inventarioService` | ✅ filtra | ✅ envía | ✅ envía | — | Listo |
| `branchStore` | `currentBranchId` | `setBranch` | `loadBranches` | — | Listo |

---

## Plan de arreglo recomendado

### Fase 1 — P0 (inmediato)

1. **Migración SQL:** agregar `branch_id` a los 7 constraints únicos
2. **Migración SQL:** arreglar `public_book_appointment` para insertar `branch_id`
3. **Migración SQL:** arreglar `delete_transaction` para filtrar `branch_id` en el UPDATE de stock

### Fase 2 — P1 (antes de deploy multi-sucursal)

4. **Backfill SQL:** actualizar `employee_schedules` con `branch_id` para registros históricos
5. **Migración SQL:** agregar `branch_id` a `employee_services` + actualizar PK

### Fase 3 — P2 (post-deploy)

6. Arreglar `get_low_stock_products` para aceptar `p_branch_id`
7. Arreglar `check_employee_overlap` para considerar `branch_id`
8. Agregar `branch_id` a `employee_absences`
9. Cambiar `record_payment` a `security definer`
