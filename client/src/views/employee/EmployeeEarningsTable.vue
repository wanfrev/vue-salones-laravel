<template>
  <div v-if="earnings.length > 0" class="mb-6">
    <div class="flex items-center justify-between border-b border-border pb-2 mb-3">
      <h3 class="text-sm font-semibold text-text">Desglose de ganancias</h3>
      <span class="text-xs text-text-muted">{{ earnings.length }} servicios</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="py-2 pr-2 text-left font-medium text-text-muted whitespace-nowrap">Fecha</th>
            <th class="py-2 pr-2 text-left font-medium text-text-muted">Cliente</th>
            <th class="py-2 pr-2 text-left font-medium text-text-muted">Servicio</th>
            <th class="py-2 px-2 text-right font-medium text-text-muted">Total</th>
            <th class="py-2 px-2 text-center font-medium text-text-muted">%</th>
            <th class="py-2 pl-2 text-right font-medium text-text-muted">Ganancia</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="row in visibleEarnings" :key="row.id">
            <td class="py-2 pr-2 text-text-secondary whitespace-nowrap">{{ formatDate(row.appointmentDate) }}</td>
            <td class="py-2 pr-2 text-text-secondary">{{ (row as any).clientName || '—' }}</td>
            <td class="py-2 pr-2 text-text">{{ row.serviceName }}</td>
            <td class="py-2 px-2 text-right text-text-secondary">${{ row.totalAmount.toFixed(2) }}</td>
            <td class="py-2 px-2 text-center text-text-secondary">{{ row.employeePercentage }}%</td>
            <td class="py-2 pl-2 text-right font-semibold text-success">
              <div>${{ row.employeeEarnings.toFixed(2) }}</div>
              <div class="text-xs text-text-muted font-normal">{{ formatVESEs(row.vesEarnings) }}</div>
              <span v-if="row.tipAmount > 0" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary mt-0.5">+${{ row.tipAmount.toFixed(2) }} propina</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="hasMore && !showAll" class="mt-1 rounded-lg bg-primary/5 px-3 py-2 text-center text-xs text-primary">
      Mostrando {{ visibleLimit ?? 8 }} de {{ earnings.length }} servicios.
    </div>
    <div class="flex justify-center border-t border-border pt-3" :class="hasMore ? '' : 'hidden'">
      <button type="button"
        class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary transition-theme hover:bg-primary hover:text-text-inverse"
        @click="$emit('toggle')"
      >
        {{ showAll ? 'Ver menos' : `Ver todos los ${earnings.length} servicios` }}
      </button>
    </div>
  </div>
  <div v-else class="mb-6 text-center text-sm text-text-muted py-4">No hay servicios en este período.</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '../../lib/formatters'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  earnings: any[]
  showAll: boolean
  hasMore: boolean
  visibleLimit?: number
}>()

defineEmits<{ toggle: [] }>()

const { formatVESEs } = useCurrency()

const visibleEarnings = computed(() => props.showAll ? props.earnings : props.earnings.slice(0, props.visibleLimit ?? 8))
</script>
