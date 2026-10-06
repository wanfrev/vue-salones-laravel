<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="py-8 text-center text-sm text-text-muted">Cargando...</div>
    <p v-else-if="isError" class="py-8 text-center text-sm text-danger">No se pudo cargar el reporte.</p>

    <template v-else-if="report">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div v-for="b in AGING_BUCKETS" :key="b.key" class="rounded-lg border border-border bg-surface px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider text-text-muted">{{ b.label }}</p>
          <p class="text-sm font-bold tabular-nums" :class="b.key === 'current' ? 'text-text' : report.totals[b.key] > 0 ? 'text-danger' : 'text-text'">
            {{ formatUSD(report.totals[b.key]) }}
          </p>
        </div>
        <div class="rounded-lg border border-border bg-bg-secondary px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider text-text-muted">Total por cobrar</p>
          <p class="text-sm font-bold tabular-nums text-text">{{ formatUSD(report.totals.total) }}</p>
        </div>
      </div>

      <p v-if="report.companies.length === 0" class="py-8 text-center text-sm text-text-muted">
        No hay facturas pendientes de cobro.
      </p>

      <div v-else class="overflow-x-auto rounded-xl border border-border bg-surface">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2.5">Empresa</th>
              <th v-for="b in AGING_BUCKETS" :key="b.key" class="px-3 py-2.5 text-right">{{ b.label }}</th>
              <th class="px-3 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <template v-for="company in report.companies" :key="company.company_id">
              <tr class="cursor-pointer hover:bg-bg-secondary/40" @click="toggle(company.company_id)">
                <td class="px-3 py-2 font-medium text-text">
                  <span class="mr-1 inline-block w-3 text-text-muted">{{ expanded.has(company.company_id) ? '▾' : '▸' }}</span>{{ company.company_name }}
                </td>
                <td v-for="b in AGING_BUCKETS" :key="b.key" class="px-3 py-2 text-right tabular-nums"
                  :class="company[b.key] > 0 && b.key !== 'current' ? 'font-semibold text-danger' : 'text-text-secondary'">
                  {{ company[b.key] ? formatUSD(company[b.key]) : '—' }}
                </td>
                <td class="px-3 py-2 text-right font-semibold tabular-nums text-text">{{ formatUSD(company.total) }}</td>
              </tr>
              <tr v-if="expanded.has(company.company_id)">
                <td :colspan="AGING_BUCKETS.length + 2" class="bg-bg-secondary/40 px-3 py-2">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="text-left text-[10px] uppercase tracking-wider text-text-muted">
                        <th class="py-1">Factura</th><th class="py-1">Emitida</th><th class="py-1">Vence</th>
                        <th class="py-1 text-right">Días vencida</th><th class="py-1 text-right">Total</th><th class="py-1 text-right">Pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="inv in company.invoices" :key="inv.id">
                        <td class="py-1 font-medium text-text">#{{ inv.invoice_number }}</td>
                        <td class="py-1 text-text-secondary">{{ formatDateUS(inv.issue_date) }}</td>
                        <td class="py-1 text-text-secondary">{{ formatDateUS(inv.due_date) }}</td>
                        <td class="py-1 text-right tabular-nums" :class="inv.days_overdue > 0 ? 'font-semibold text-danger' : 'text-text-muted'">
                          {{ inv.days_overdue > 0 ? inv.days_overdue : '—' }}
                        </td>
                        <td class="py-1 text-right tabular-nums text-text-secondary">{{ formatUSD(inv.total) }}</td>
                        <td class="py-1 text-right tabular-nums font-medium text-text">{{ formatUSD(inv.outstanding) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p class="text-[11px] text-text-muted">
        Al {{ formatDateUS(report.as_of) }}. Los abonos "a cuenta" se aplican primero a la factura más antigua de cada empresa.
        El plazo de pago se configura por empresa en Empresas.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useReceivablesAging } from '../../composables/staffing/useReceivablesAging'
import { AGING_BUCKETS } from '../../services/staffing/receivablesService'
import { formatDateUS } from '../../lib/formatters'

const props = defineProps<{ businessId: string | null }>()

const { formatUSD } = useCurrency()
const { report, isLoading, isError } = useReceivablesAging(toRef(props, 'businessId'), ref(true))

const expanded = ref(new Set<string>())
const toggle = (id: string) => {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}
</script>
