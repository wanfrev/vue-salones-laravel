<template>
  <div class="space-y-4">
    <p class="text-xs text-text-muted">
      Todo lo que hace falta para cuadrar la caja del período seleccionado arriba, junto en un solo lugar —
      en vez de ir y venir entre Resumen, Ingresos, Créditos y Reportes.
    </p>

    <!-- Total cobrado, por método -- misma fuente que Resumen (ya excluye crédito y corrige
         pagos mixtos con datos viejos), solo que fija en pantalla en vez de una tarjeta que se
         abre y se cierra. -->
    <CurrencyBreakdown :data="incomeBreakdown" hide-close />

    <div v-if="isLoading" class="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-busy="true">
      <div class="h-3 w-40 animate-pulse rounded bg-bg-secondary"></div>
      <div class="h-3 w-64 animate-pulse rounded bg-bg-secondary"></div>
      <div class="h-3 w-52 animate-pulse rounded bg-bg-secondary"></div>
    </div>

    <div v-else class="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <!-- Por banco -- igual que en Reportes, anidado bajo el método al que pertenece. -->
      <div v-if="bankSections.length > 0" class="px-4 py-4">
        <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">Por Banco (Bs)</h3>
        <div class="space-y-3">
          <div v-for="section in bankSections" :key="section.field">
            <p class="mb-1 text-xs font-semibold text-text-muted">{{ section.label }}</p>
            <div class="space-y-1 border-l-2 border-border-subtle pl-3">
              <div v-for="bank in section.banks" :key="bank.name" class="flex items-center justify-between text-sm">
                <span class="text-text-secondary">{{ bank.name }}</span>
                <span class="font-medium tabular-nums text-text">{{ formatCurrency(bank.amount_bs) }} Bs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Crédito pendiente -- de la tabla real de créditos (lo que sigue sin cobrarse a hoy),
           no de lo que se vendió a crédito ese día (eso ya se ve arriba, aparte del total). -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div class="min-w-0">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Crédito Pendiente</h3>
          <p class="mt-0.5 text-xs text-text-muted">Ventas a crédito de este período que siguen sin cobrarse</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold tabular-nums" :class="pendingCreditTotal > 0 ? 'text-warning' : 'text-text-muted'">
            ${{ formatCurrency(pendingCreditTotal) }}
          </span>
          <button v-if="pendingCreditTotal > 0" type="button" @click="$emit('view-creditos')"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/30 transition-theme hover:bg-primary/10">
            Ver créditos
          </button>
        </div>
      </div>

      <!-- Por persona -- solo admin/superadmin. El backend ya quita esto de la respuesta para
           cualquier otro rol; isStrictAdmin además evita pintar la sección vacía. -->
      <div v-if="isStrictAdmin && byCashier.length > 0">
        <div class="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Por Persona</h3>
          <span class="text-[11px] text-text-muted">Para cuadrar cada caja por separado</span>
        </div>
        <div class="overflow-hidden">
          <div class="-mb-px -mr-px mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="cashier in byCashier" :key="cashier.user_id ?? cashier.name"
              class="border-b border-r border-border-subtle p-4">
              <p class="mb-2 text-sm font-semibold text-text">{{ cashier.name }}</p>
              <div class="mb-2 flex items-baseline gap-3">
                <span class="text-base font-bold tabular-nums text-text">${{ formatCurrency(cashier.usd_total) }}</span>
                <span v-if="cashier.ves_total > 0" class="text-sm font-medium tabular-nums text-text-secondary">{{ formatCurrency(cashier.ves_total) }} Bs</span>
              </div>
              <div class="space-y-1">
                <div v-for="item in cashier.usd_items" :key="'usd-' + item.method" class="flex items-center justify-between text-xs">
                  <span class="text-text-muted">{{ formatMethod(item.method) }}</span>
                  <span class="font-medium tabular-nums text-text-secondary">${{ formatCurrency(item.amount) }}</span>
                </div>
                <div v-for="item in cashier.ves_items" :key="'ves-' + item.method" class="flex items-center justify-between text-xs">
                  <span class="text-text-muted">{{ formatMethod(item.method) }}</span>
                  <span class="font-medium tabular-nums text-text-secondary">{{ formatCurrency(item.amount) }} Bs</span>
                </div>
              </div>
              <p v-if="cashier.credito_issued > 0" class="mt-2 border-t border-border-subtle pt-1.5 text-[11px] text-warning">
                + ${{ formatCurrency(cashier.credito_issued) }} en ventas a crédito (no cobrado)
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Correcciones y eliminaciones -- solo admin/superadmin. El backend devuelve 403 para
           cualquier otro rol (ver TransactionController::auditLogs()), así que ni se consulta si
           isStrictAdmin es false. -->
      <div v-if="isStrictAdmin">
        <div class="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Correcciones y Eliminaciones</h3>
          <span class="text-[11px] text-text-muted">Para que una corrección no se confunda con un cobro fantasma</span>
        </div>
        <div v-if="isLoadingAuditLogs" class="px-4 py-4 text-center text-xs text-text-muted">Cargando...</div>
        <div v-else-if="auditLogs.length === 0" class="px-4 py-4 text-center text-xs text-text-muted">
          Ningún cobro fue editado ni eliminado en este período.
        </div>
        <ul v-else class="divide-y divide-border-subtle border-t border-border-subtle">
          <li v-for="log in auditLogs" :key="log.id" class="px-4 py-3 text-xs">
            <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                  :class="log.action === 'deleted' ? 'text-danger' : 'text-warning'">
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
                  {{ log.action === 'deleted' ? 'Eliminado' : 'Editado' }}
                </span>
                <span class="font-medium text-text">{{ log.client_name || 'Venta directa' }}</span>
              </div>
              <span class="text-text-muted">{{ formatDateTime(log.created_at) }} · {{ log.performed_by }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-text-secondary">
              <span>{{ formatMethod(log.before.method ?? '') }} ${{ formatCurrency(log.before.total_amount ?? 0) }}</span>
              <template v-if="log.after">
                <span class="text-text-muted">→</span>
                <span class="font-medium text-text">{{ formatMethod(log.after.method ?? '') }} ${{ formatCurrency(log.after.total_amount ?? 0) }}</span>
              </template>
              <span v-else class="text-text-muted">→ (eliminado, sin reemplazo)</span>
            </div>
            <p v-if="log.reason" class="mt-1 text-text-muted">Motivo: {{ log.reason }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatMethod } from '../../lib/formatters'
import { useCuadreDelDia } from '../../composables/finanzas/useCuadreDelDia'
import { useTransactionAuditLogs } from '../../composables/finanzas/useTransactionAuditLogs'
import CurrencyBreakdown, { type CurrencyBreakdownData } from './CurrencyBreakdown.vue'

const props = defineProps<{
  businessId: string | null
  periodDates: { start: string; end: string }
  branchId: string | null
  incomeBreakdown: CurrencyBreakdownData
  pendingCreditTotal: number
  isStrictAdmin: boolean
}>()

defineEmits<{ 'view-creditos': [] }>()

const formatCurrency = (val: number) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDateTime = (iso: string) => {
  try { return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

const businessIdRef = computed(() => props.businessId)
const periodDatesRef = computed(() => props.periodDates)
const branchIdRef = computed(() => props.branchId)
const isStrictAdminRef = computed(() => props.isStrictAdmin)
const { isLoading, banks, byCashier } = useCuadreDelDia(businessIdRef, periodDatesRef, branchIdRef)
const { logs: auditLogs, isLoading: isLoadingAuditLogs } = useTransactionAuditLogs(businessIdRef, periodDatesRef, branchIdRef, isStrictAdminRef)

// Solo estos 3 campos del reporte pueden tener banco (ver Finanzas > Bancos) -- mismo mapeo que
// ReportesFinancialDashboard, aquí duplicado a propósito porque son solo 3 etiquetas fijas y no
// vale la pena una constante compartida para eso.
const BANK_FIELD_LABELS: Record<string, string> = {
  pago_movil_bs: 'Pago Móvil',
  transfer_bs: 'Transferencia',
  pos_bs: 'Punto de Venta',
}

const bankSections = computed(() => {
  return Object.entries(banks.value)
    .filter(([, rows]) => (rows?.length ?? 0) > 0)
    .map(([field, rows]) => ({
      field,
      label: BANK_FIELD_LABELS[field] ?? field,
      banks: rows ?? [],
    }))
})
</script>
