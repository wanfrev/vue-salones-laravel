<template>
  <div v-if="payments.length > 0 || consumptions.length > 0" class="mb-6">
    <p class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Pagos realizados en este período</p>

    <div v-for="p in visiblePayments" :key="p.id" class="flex justify-between items-center py-2 border-b border-border last:border-b-0">
      <div>
        <p class="text-sm font-medium text-text">{{ p.displayAmount }}</p>
        <p class="text-xs text-text-muted">{{ p.displayVES }}</p>
        <p class="text-xs text-text-muted">{{ formatDate(p.payment_date) }} · {{ formatMethod(p.payment_method) }}
          <span v-if="p.type === 'consumption'" class="ml-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Consumo</span>
        </p>
        <p v-if="p.concept" class="text-xs text-text-muted italic">"{{ p.concept }}"</p>
      </div>
      <span v-if="p.type === 'consumption'"
        class="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">Consumo</span>
      <span v-else class="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Pagado</span>
    </div>

    <div v-if="hasMore" class="flex justify-center pt-3">
      <button type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition-theme hover:bg-bg-secondary"
        @click="$emit('toggle')"
      >
        {{ showAll ? 'Ver menos' : `Ver todos (${payments.length})` }}
      </button>
    </div>

    <div v-if="consumptions.length > 0" class="border-t border-border mt-3 pt-3">
      <div class="flex justify-between py-2 text-sm">
        <span class="text-text-muted">Total pagado</span>
        <span class="font-medium text-success">${{ totalPayments }}</span>
      </div>
      <div class="flex justify-between py-2 text-sm">
        <span class="text-text-muted">Total consumido</span>
        <span class="font-medium text-warning">${{ totalConsumed }}</span>
      </div>
      <div class="flex justify-between border-t border-border pt-2 text-sm">
        <span class="font-semibold text-text">Total pagado neto</span>
        <span class="font-bold text-text">${{ totalNet }}</span>
      </div>
    </div>
  </div>
  <div v-else class="mb-6 text-center text-sm text-text-muted">
    No hay pagos ni consumos registrados en este período.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, formatMethod } from '../../lib/formatters'

const props = defineProps<{
  payments: any[]
  consumptions: any[]
  showAll: boolean
  hasMore: boolean
  totalPayments: string
  totalConsumed: string
  totalNet: string
}>()

defineEmits<{ toggle: [] }>()

const visiblePayments = computed(() => props.showAll ? props.payments : props.payments.slice(0, 5))
</script>
