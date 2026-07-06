# Roadmap — Salones

Plan de mejoras para escalar el sistema a múltiples negocios, usuarios y datos.

---

## Fase 1 — Estabilización (alta prioridad, bajo esfuerzo)

### 1.1 Centralizar patrón de invalidación de queries

**Problema**: Cada mutación repite manualmente 5-15 `invalidateQueries` con `queryKey`. Un solo typo o `branchId` faltante rompe toda la UI.

**Solución**: Extraer helpers a `lib/queryKeys.ts` (o `lib/queryClient.ts`):

```ts
export const queryKeys = {
  appointments:     (bid, brId) => ['appointments', bid, brId] as const,
  servicios:        (bid, brId) => ['servicios', bid, brId] as const,
  inventario: {
    all:            (bid, brId) => ['inventario', bid, brId] as const,
    movements:      (bid, brId) => ['inventario-movements', bid, brId] as const,
  },
  pos: {
    pending:        (bid, brId) => ['pos-pending', bid, brId] as const,
    products:       (bid, brId) => ['pos-products', bid, brId] as const,
  },
  finanzas: {
    transactions:   (bid) => ['finanzas-transactions', bid] as const,
    summary:        (bid) => ['financial-summary', bid] as const,
    productSales:   (bid) => ['finanzas-product-sales', bid] as const,
    employeePayments: (bid) => ['finanzas-employee-payments', bid] as const,
  },
  empleados:        (bid) => ['equipo', bid] as const,
  clientes:         (bid, brId) => ['clientes', bid, brId] as const,
  dashboard:        (bid) => ['dashboard-services', bid] as const,
}

export function invalidateFinanzasQueries(queryClient, bid) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.finanzas.transactions(bid), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.finanzas.summary(bid), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.finanzas.productSales(bid), exact: false }),
    queryClient.invalidateQueries({ queryKey: queryKeys.finanzas.employeePayments(bid), exact: false }),
  ])
}
```

**Impacto**: Ningún bug futuro de invalidación. Un solo cambio cubre todas las mutaciones.

**Esfuerzo**: ~2 horas. Cambiar todas las mutaciones existentes para usar los helpers.

---

### 1.2 Tests de regresión para mutaciones

**Problema**: Cada vez que se toca una mutación, hay que recordar invalidar manualmente 5-10 query keys.
No hay forma de saber si falta alguno hasta que falla en producción.

**Solución**: Tests que verifiquen que después de cada mutación, las queries correctas se invalidan:

```ts
it('saveCita invalida todas las queries afectadas', async () => {
  const spy = vi.spyOn(queryClient, 'invalidateQueries')
  await handleSaveCita(mockData)
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({
    queryKey: queryKeys.appointments('bid-123', null), exact: false,
  }))
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({
    queryKey: queryKeys.finanzas.transactions('bid-123'), exact: false,
  }))
  // ... all expected patterns
})
```

**Impacto**: CI atrapa regresiones antes de llegar a producción.

**Esfuerzo**: ~3 horas. 1 archivo de test por cada composable de mutación principal.

---

### 1.3 Refactor de `Finanzas.vue` (891 líneas → ~300)

**Problema**: La vista más grande del proyecto. Sobrepasa el límite de 200 líneas del [AGENTS.md](AGENTS.md).

**Solución**: Extraer componentes por tab:

```
components/finanzas/
├── DetalleMovimientosCard.vue  ← container con tabs
├── tabs/
│   ├── CobrosTab.vue           ← tabla cobros + estado vacío
│   ├── VentasTab.vue           ← tabla ventas productos
│   ├── GastosTab.vue           ← tabla gastos operativos
│   └── ServiciosTab.vue        ← tabla catálogo servicios
├── EmployeePaymentsSection.vue  ← YA EXISTE (recientemente activado)
├── SupplierPaymentsSection.vue  ← YA EXISTE
├── ExchangeRateCard.vue         ← YA EXISTE
├── KpiCards.vue                 ← YA EXISTE
└── CurrencyBreakdown.vue        ← YA EXISTE
```

**Impacto**: `Finanzas.vue` baja a ~300 líneas. Cada tab es testeable individualmente. El detalle de movimientos se puede reutilizar en otras vistas.

**Esfuerzo**: ~4 horas.

---

## Fase 2 — Robustez multi-negocio (esfuerzo medio)

### 2.1 Auditoría de funciones SQL `security invoker`

**Problema**: Funciones SQL con DML interno (UPDATE/DELETE) que usan `security invoker` hacen que el DML pase por RLS. Si la política RLS no existe o no matchea, Postgres silenciosamente afecta 0 filas y no lanza error.

Ya se corrigió en `record_sale`, `delete_transaction`, `update_transaction`. Falta auditar TODAS las funciones restantes:

- `record_payment` (¿sigue siendo `security invoker`?)
- Cualquier trigger que modifique datos
- Funciones de notificaciones

**Checklist**:
```
[ ] Todas las funciones con DML interno son security definer
[ ] set search_path = public, pg_temp en todas
[ ] is_admin_of() como chequeo de autorización interno
[ ] NO security invoker para funciones que tocan múltiples tablas
```

**Impacto**: Evita fallos silenciosos de datos en producción.

**Esfuerzo**: ~3 horas.

---

### 2.2 Sistema de pruebas para migraciones

**Problema**: Las migraciones SQL se prueban manualmente (`supabase db reset` local). Un typo puede llegar a producción.

**Solución**: Script de CI que:
1. Levanta Supabase local (`supabase start`)
2. Aplica migraciones (`supabase db push`)
3. Ejecuta smoke tests (crear cita, cobrar, recibo, inventario) via API
4. Limpia y reporta

```yaml
# .github/workflows/db-smoke.yml
name: DB Smoke Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db push
      - run: npm run test:db
```

**Impacto**: Confianza en deploys de migraciones.

**Esfuerzo**: ~2 horas.

---

### 2.3 Consistencia de `branch_id`

**Problema**: Hoy vimos que muchas invalidaciones fallaban porque la query incluye `branch_id` pero el write omitía el filtro. Además, no todas las tablas operativas tienen `branch_id`.

**Solución**: Auditoría completa:

```
[ ] Todas las tablas operativas tienen branch_id:
    [x] transactions
    [x] appointments
    [x] employee_payments
    [x] expenses
    [x] inventory_stock
    [x] inventory_movements
    [ ] services (verificar)
    [ ] products (verificar)
    [ ] clients (verificar)

[ ] RLS incluye branch_id en el predicate
[ ] Mock data incluye branch_id en registros de ejemplo
```

**Impacto**: Multi-sucursal confiable. Sin datos "fantasma" entre sucursales.

**Esfuerzo**: ~2 horas (migración SQL + verificación de tipos).

---

## Fase 3 — Observabilidad y operaciones (esfuerzo medio)

### 3.1 Logging estructurado

**Problema**: Hoy los errores van a `console.error`. No hay trazabilidad.

**Solución**:

```ts
// lib/logger.ts
const LOG_ENDPOINT = import.meta.env.VITE_LOG_ENDPOINT

interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  userId?: string
  businessId?: string
  branchId?: string
  route?: string
  timestamp: string
  stack?: string
}

export const logger = {
  error: (message: string, ctx?: Partial<LogEntry>) => { /* enviar a endpoint */ },
  warn:  (message: string, ctx?: Partial<LogEntry>) => { /* ... */ },
  info:  (message: string, ctx?: Partial<LogEntry>) => { /* ... */ },
}
```

**Opciones de backend**: Supabase Edge Function que recibe logs y los inserta en `error_logs`. O servicio externo (Sentry, PostHog, Logtail).

**Impacto**: Depuración post-mortem. Alertas proactivas.

**Esfuerzo**: ~2 horas.

---

### 3.2 Feature flags gestionables por superadmin

**Problema**: `businesses.features` JSONB ya existe pero no hay UI para togglearlos. Hoy es hardcoded.

**Solución**: Agregar una sección en `SuperadminBusinessDetail.vue` con toggles para cada feature. La Edge Function `superadmin-invite` ya tiene el whitelist, solo falta la UI.

**Impacto**: Activar/desactivar features sin deploys.

**Esfuerzo**: ~3 horas.

---

### 3.3 Métricas de uso básicas

**Problema**: Sin telemetría. ¿Cuántas citas al día? ¿Cuánto tiempo abierta la app?

**Solución**: Tabla `usage_metrics` con `business_id`, `event`, `count`, `period` (día). Actualizada por triggers en las tablas principales.

```sql
create table public.usage_metrics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id),
  event text not null,
  count integer not null default 1,
  period date not null default current_date,
  unique (business_id, event, period)
);
```

**Impacto**: Datos para pricing futuro. Sin dependencias externas.

**Esfuerzo**: ~1 hora.

---

## Fase 4 — Features diferenciales (esfuerzo medio-alto)

### 4.1 Realtime selectivo (solo si necesario)

**Contexto**: Hoy cada usuario ve su propia vista. Si en el futuro 2+ personas modifican la misma agenda simultáneamente (ej: 2 recepcionistas), se necesita realtime.

**Solución**: Patrón de "invalidación via realtime" (no pintar directo):

```ts
// composables/useAgendaRealtime.ts
export function useAgendaRealtime(businessId, branchId) {
  const queryClient = useQueryClient()
  let channel: RealtimeChannel | null = null

  onMounted(() => {
    channel = supabase
      .channel(`agenda-${businessId}-${branchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments',
          filter: `business_id=eq.${businessId}` },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments(businessId, branchId),
            exact: false
          })
        }
      )
      .subscribe()
  })

  onUnmounted(() => {
    channel?.unsubscribe()
  })
}
```

**Impacto**: Pantalla se actualiza sola sin recargar cuando otro usuario hace cambios.

**Esfuerzo**: ~1 día. Requiere activar Realtime en Supabase Dashboard.

---

### 4.2 Onboarding público (registro de nuevos negocios)

**Problema**: Hoy el superadmin crea negocios manualmente.

**Solución**: Landing page + formulario de registro + Edge Function que crea:
1. `businesses` row
2. `profiles` para el admin
3. `branches` (default branch)
4. Configuración inicial (features, terminology, exchange rate)

Todo via Edge Function con `service_role` para saltar RLS.

**Impacto**: Escalar sin intervención manual.

**Esfuerzo**: ~1 semana (formulario + Edge Function + validación + emails).

---

### 4.3 Billing / Suscripciones (Stripe)

**Problema**: Sin modelo de cobro. Todos los negocios usan el sistema gratis.

**Solución**:
- `subscriptions` table: `id`, `business_id`, `plan`, `status`, `current_period_start`, `current_period_end`, `stripe_subscription_id`
- Edge Function `stripe-webhook` que recibe eventos de Stripe y actualiza la tabla
- Middleware/Ruta que verifique `subscriptions.status = 'active'` antes de permitir acceso
- UI en superadmin para ver/editar suscripciones

**Flujo**: Registro → Stripe Checkout → webhook activa → acceso concedido.

**Impacto**: Monetización.

**Esfuerzo**: ~2 semanas.

---

## Resumen de prioridades

| # | Tarea | Esfuerzo | Impacto |
|---|---|---|---|
| 1.1 | Centralizar query keys + invalidation | 2h | Alto |
| 1.2 | Tests de regresión para mutaciones | 3h | Alto |
| 1.3 | Refactor Finanzas.vue | 4h | Medio |
| 2.1 | Auditar security invoker | 3h | Alto |
| 2.2 | CI smoke tests migraciones | 2h | Medio |
| 2.3 | Consistencia branch_id | 2h | Alto |
| 3.1 | Logging estructurado | 2h | Medio |
| 3.2 | Feature flags superadmin UI | 3h | Medio |
| 3.3 | Métricas de uso | 1h | Bajo |
| 4.1 | Realtime selectivo | 1d | Bajo |
| 4.2 | Onboarding público | 1s | Alto |
| 4.3 | Billing Stripe | 2s | Alto |

---

## Lo que NO se recomienda

- **Migrar a Nuxt** — No necesitas SSR para un SaaS B2B interno. Tu stack actual escala.
- **Mover lógica a Edge Functions** — La lógica transaccional debe quedarse en funciones PostgreSQL (atómico, rápido). Edge Functions para tareas async (recordatorios, webhooks, integraciones).
- **Realtime ahora** — Complejidad sin beneficio hasta que haya 2+ usuarios concurrentes en la misma vista.
