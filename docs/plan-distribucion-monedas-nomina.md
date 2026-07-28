# Plan: Distribución de Nómina por Moneda (Bs / USD)

## Objetivo

Cuando un cliente paga un servicio con mezcla de bolívares y dólares (pago mixto), la comisión del empleado debe distribuirse en la misma proporción. Así, al momento de pagar nómina, el negocio sabe exactamente cuánto pagar en Bs y cuánto en USD.

---

## 1. Problema actual

- Un servicio de $100 genera $50 de comisión (50%).
- El cliente pagó $30 en cash USD + 5250 Bs ($70 equiv. a tasa 75).
- El sistema actual solo dice: "debes $50 al empleado".
- El negocio no sabe cuánto de esos $50 dar en USD y cuánto en Bs.

---

## 2. Solución: split proporcional al cobro

En el momento de procesar el pago (`PosService::processSale`), se calcula qué porcentaje del total fue pagado en USD y qué porcentaje en Bs, y se aplica ese mismo porcentaje a la comisión del empleado, del asistente y al local.

```
Total pagado:       $30 USD + $70 equiv. Bs = $100 total
% en USD:           30%
% en Bs:            70%

Comisión empleado:  $50 × 30% = $15 USD
                    $50 × 70% = $35 equiv. → 2625 Bs (tasa 75)
```

---

## 3. Cambios en base de datos

### Nueva migration: agregar columnas de split a `transactions`

```sql
ALTER TABLE transactions ADD COLUMN employee_amount_usd  DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN employee_amount_bs   DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN assistant_amount_usd DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN assistant_amount_bs  DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN local_amount_usd     DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN local_amount_bs      DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN tip_amount_usd       DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN tip_amount_bs        DECIMAL(15,2) DEFAULT 0;
```

**Regla de integridad:**

```
employee_amount = employee_amount_usd + (employee_amount_bs / exchange_rate_used)
assistant_amount = assistant_amount_usd + (assistant_amount_bs / exchange_rate_used)
local_amount     = local_amount_usd     + (local_amount_bs     / exchange_rate_used)
tip_amount       = tip_amount_usd       + (tip_amount_bs       / exchange_rate_used)
```

---

## 4. Cambios en backend

### 4.1 `PosService::processSale()` — Cálculo del split

**Archivo:** `backend/app/Services/PosService.php`

Después de calcular `$employeeAmount`, `$assistantAmount`, `$localAmount` y `$tipAmount`, agregar:

```php
// --- Currency split basado en payments_breakdown ---
$totalPaidUsd = 0;
$totalPaidBsEquiv = 0;

foreach ($paymentsBreakdown as $split) {
    $splitCurrency = strtoupper($split['currency'] ?? 'USD');
    $splitAmount = (float)($split['amount'] ?? 0);
    if ($splitCurrency === 'USD') {
        $totalPaidUsd += $splitAmount;
    } else {
        $totalPaidBsEquiv += $splitAmount / $rate; // rate = exchange_rate_used
    }
}

$totalEquiv = $totalPaidUsd + $totalPaidBsEquiv;
$usdRatio = $totalEquiv > 0 ? $totalPaidUsd / $totalEquiv : 1;
$bsRatio = 1 - $usdRatio;

$employeeAmountUsd = round($employeeAmount * $usdRatio, 2);
$employeeAmountBs  = round($employeeAmount * $bsRatio * $rate, 2);
$assistantAmountUsd = round($assistantAmount * $usdRatio, 2);
$assistantAmountBs  = round($assistantAmount * $bsRatio * $rate, 2);
$localAmountUsd     = round($localAmount * $usdRatio, 2);
$localAmountBs      = round($localAmount * $bsRatio * $rate, 2);
$tipAmountUsd       = round($tipAmount * $usdRatio, 2);
$tipAmountBs        = round($tipAmount * $bsRatio * $rate, 2);
```

Incluir las nuevas columnas en el `Transaction::create([...])`.

### 4.2 `EmployeeCommissionService::getEmployeeBalance()` — Sumar splits

**Archivo:** `backend/app/Services/EmployeeCommissionService.php`

Modificar las queries para sumar también:

```php
SUM(transactions.employee_amount_usd) as commission_usd,
SUM(transactions.employee_amount_bs)  as commission_bs,
SUM(transactions.tip_amount_usd)      as tips_usd,
SUM(transactions.tip_amount_bs)       as tips_bs,
```

Y lo mismo para el asistente (`assistant_amount_usd`, `assistant_amount_bs`).

**Nuevo formato de respuesta:**

```json
{
  "commission": 250.00,
  "commission_usd": 180.00,
  "commission_bs": 5250.00,
  "tips": 30.00,
  "tips_usd": 20.00,
  "tips_bs": 750.00,
  "total_earned_usd": 200.00,
  "total_earned_bs": 6000.00,
  "total_paid": 100.00,
  "total_consumed": 0,
  "pending": 180.00,
  "pending_usd": 110.00,
  "pending_bs": 5250.00,
  "pay_type": "percentage",
  "pay_percentage": 50
}
```

### 4.3 `EmployeeCommissionService::getEmployeeDebt()` — Sumar splits

Mismas columnas nuevas, mismo formato. Aplica a todos los empleados del negocio.

### 4.4 `FinancialSummaryService` — Incluir splits en KPIs

Agregar a `getKPIs()`:

```php
'total_income_usd' => SUM(transactions.employee_amount_usd + transactions.local_amount_usd),
'total_income_bs'  => SUM(transactions.employee_amount_bs + transactions.local_amount_bs),
```

### 4.5 `EmployeePaymentService` — Permitir pago mixto al empleado

**Archivo:** `backend/app/Services/EmployeePaymentService.php`

Agregar campos `amount_usd` y `amount_bs` al modelo `EmployeePayment`, o registrar dos registros separados (uno en USD y uno en Bs) con un `group_id` que los vincule.

**Alternativa más limpia:** Un solo registro con `amount` (USD total), `amount_usd` (porción USD), `amount_bs` (porción Bs pagada en Bs), `exchange_rate_used` (tasa usada para convertir la porción Bs).

---

## 5. Cambios en frontend

### 5.1 `EmployeeBalance` type — Agregar campos de moneda

**Archivo:** `client/src/services/employeePaymentsService.ts`

```typescript
interface EmployeeBalance {
  // existentes
  commission: number
  tips: number
  total_earned: number
  total_paid: number
  total_consumed: number
  pending: number

  // nuevos
  commission_usd: number
  commission_bs: number
  tips_usd: number
  tips_bs: number
  total_earned_usd: number
  total_earned_bs: number
  pending_usd: number
  pending_bs: number
}
```

### 5.2 `useEmployeePayments.ts` — Exponer split sugerido

**Archivo:** `client/src/composables/empleados/useEmployeePayments.ts`

Agregar computadas:

```typescript
const suggestedUsdPayment = computed(() => balance.value?.pending_usd ?? 0)
const suggestedBsPayment = computed(() => balance.value?.pending_bs ?? 0)
```

### 5.3 `EmployeePaymentModal.vue` — Mostrar split y permitir pago mixto

**Archivo:** `client/src/components/equipo/EmployeePaymentModal.vue`

Al abrir el modal para un empleado:

```
┌─────────────────────────────────────────┐
│  Pago sugerido                          │
│  ┌──────────────┬──────────────────────┐│
│  │  $180 USD    │  5250 Bs             ││
│  │  (Zelle, Ef) │  (Pago Móvil, Transf)││
│  └──────────────┴──────────────────────┘│
│                                         │
│  Monto a pagar:                         │
│  [$180     ] USD  [5250      ] Bs       │
│                                         │
│  Método USD: [Zelle          ▼]         │
│  Método Bs:  [Pago Móvil      ▼]        │
│  Fecha:      [2026-07-27]               │
│                                         │
│  Total equivalente: $250 USD            │
│                                         │
│  [Cancelar]           [Registrar Pago]  │
└─────────────────────────────────────────┘
```

Al guardar, enviar ambos montos al backend.

### 5.4 `EmployeeRecibo.vue` — Mostrar split en recibos

**Archivo:** `client/src/components/equipo/EmployeeRecibo.vue`

Mostrar cuánto se pagó en USD y cuánto en Bs, con la tasa usada.

---

## 6. Casos de prueba

### Caso 1: Pago 100% USD
- Servicio: $100, comisión 50% → $50
- Cliente paga: $100 en efectivo USD
- Resultado: `employee_amount_usd = $50`, `employee_amount_bs = 0 Bs`

### Caso 2: Pago 100% Bs
- Servicio: $100, comisión 50% → $50, tasa = 75
- Cliente paga: 7500 Bs en pago móvil
- Resultado: `employee_amount_usd = $0`, `employee_amount_bs = 3750 Bs`

### Caso 3: Pago mixto
- Servicio: $100, comisión 50% → $50, tasa = 75
- Cliente paga: $60 USD + 3000 Bs ($40 equiv.)
- % USD = 60%, % Bs = 40%
- Resultado: `employee_amount_usd = $30`, `employee_amount_bs = 1500 Bs`

### Caso 4: Varios empleados en grupo
- Grupo con 2 servicios, mismo cliente
- Empleado A: servicio $100 (50%), Empleado B: servicio $60 (50%)
- Cliente paga $160 mixto: $100 USD + 4500 Bs ($60 equiv.)
- % USD = 62.5%, % Bs = 37.5%
- Empleado A: $31.25 USD + 1406.25 Bs
- Empleado B: $18.75 USD + 843.75 Bs

### Caso 5: Asistente
- Servicio: $100, empleado 40%, asistente 10%, local 50%
- Cliente paga mixto: 50% USD, 50% Bs, tasa = 75
- Empleado: $20 USD + 1500 Bs
- Asistente: $5 USD + 375 Bs
- Local: $25 USD + 1875 Bs

### Caso 6: Propina
- Servicio: $100, comisión 50% → $50, propina $10
- Cliente paga $110 mixto: $60 USD + 3750 Bs ($50 equiv.)
- % USD ≈ 54.5%, % Bs ≈ 45.5%
- Propina: $5.45 USD + 341.25 Bs

---

## 7. Archivos a modificar (orden de implementación)

### Fase 1 — Base de datos
| # | Archivo | Acción |
|---|---|---|
| 1 | `backend/database/migrations/*_add_currency_split_to_transactions.php` | **Crear** — 8 columnas nuevas |

### Fase 2 — Backend
| # | Archivo | Acción |
|---|---|---|
| 2 | `backend/app/Models/Transaction.php` | **Modificar** — `$fillable` + `$casts` |
| 3 | `backend/app/Services/PosService.php` | **Modificar** — Calcular split en `processSale()`, `processDirectSale()`, `processDirectServiceSale()` |
| 4 | `backend/app/Services/EmployeeCommissionService.php` | **Modificar** — `getEmployeeBalance()`, `getEmployeeDebt()`, `getEmployeeHistory()` — incluir columnas de split |
| 5 | `backend/app/Services/FinancialSummaryService.php` | **Modificar** — `getKPIs()` — incluir income por moneda |
| 6 | `backend/app/Services/EmployeePaymentService.php` | **Modificar** — Permitir registrar pago mixto (USD + Bs en mismo registro) |

### Fase 3 — Frontend
| # | Archivo | Acción |
|---|---|---|
| 7 | `client/src/services/employeePaymentsService.ts` | **Modificar** — Interfaces `EmployeeBalance`, `EmployeeDebtItem` |
| 8 | `client/src/composables/empleados/useEmployeePayments.ts` | **Modificar** — Exponer `suggestedUsdPayment`, `suggestedBsPayment` |
| 9 | `client/src/components/equipo/EmployeePaymentModal.vue` | **Modificar** — UI de pago mixto con split sugerido |
| 10 | `client/src/components/equipo/EmployeeRecibo.vue` | **Modificar** — Mostrar split USD/Bs en recibos |
| 11 | `client/src/views/employee/EmployeeEarningsCards.vue` | **Modificar** — Mostrar ganancias desglosadas por moneda |

---

## 8. Notas

- **Transacciones existentes:** Las columnas nuevas tienen `DEFAULT 0`. Para migrar datos históricos, asumir que todo fue USD (antes no había split). Un comando de migración puede calcular el split correcto para transacciones con `payments_breakdown` con múltiples monedas.

- **Tasa de cambio:** Se usa `exchange_rate_used` de la transacción (congelada al momento del cobro), NO la tasa actual. Esto evita inconsistencias si la tasa cambió entre el cobro y el pago de nómina.

- **Redondeo:** Por diferencias de centavos, el último split (local) absorbe el residuo para que la suma coincida exactamente.

- **Propinas:** Las propinas siguen la misma distribución que el pago del servicio, porque el cliente las dejó en la misma(s) moneda(s) del pago.
