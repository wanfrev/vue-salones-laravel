<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text">Propinas directas</h3>
        <p class="mt-0.5 text-xs text-text-muted">Propinas cobradas en el POS sin estar asociadas a una cita — 100% del empleado, no cuentan como ingreso del negocio</p>
      </div>
      <div class="text-right" v-if="ctx.standaloneTips.value.length > 0">
        <p class="text-xs text-text-muted">Total del período</p>
        <p class="text-sm font-semibold tabular-nums text-primary">{{ formatUSD(ctx.standaloneTipsTotal.value) }}</p>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 3" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-3 w-20 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-32 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
      </div>
    </div>

    <div v-else-if="ctx.standaloneTips.value.length === 0" class="px-4 py-10 text-center text-sm text-text-muted">
      No hay propinas directas en este período.
    </div>

    <div v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
        <span :class="headClass">Fecha</span>
        <span :class="headClass">Empleado</span>
        <span :class="headClass">Método</span>
        <span :class="[headClass, 'text-right']">Propina</span>
        <span :class="[headClass, 'text-center']">Acción</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="row in ctx.standaloneTips.value" :key="row.id" data-testid="tip-row"
          :class="[gridClass, 'relative px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']">
          <p class="text-xs text-text-muted md:text-sm md:text-text-secondary">{{ row.date }}</p>

          <div class="min-w-0 pr-20 md:pr-0">
            <div class="font-medium text-text">{{ row.employee }}</div>
            <div v-if="row.notes" class="max-w-[200px] truncate text-xs text-text-muted" :title="row.notes">{{ row.notes }}</div>
            <div class="text-xs text-text-muted md:hidden">{{ row.method }}</div>
          </div>

          <div class="hidden text-text-secondary md:block">{{ row.method }}</div>

          <div class="mt-1 font-medium tabular-nums text-primary md:mt-0 md:text-right">{{ formatUSD(row.amount) }}</div>

          <div class="absolute right-2 top-2 flex items-center md:static md:justify-center">
            <button @click="ctx.startEdit(row)"
              :disabled="ctx.editTransactionMutation.isPending.value || ctx.deleteTransactionMutation.isPending.value"
              class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary disabled:opacity-50" title="Editar" aria-label="Editar">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button @click="ctx.confirmDeleteTransaction(row.id)"
              :disabled="ctx.editTransactionMutation.isPending.value || ctx.deleteTransactionMutation.isPending.value"
              class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50" title="Eliminar" aria-label="Eliminar">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </div>

    <EditCobroModal :show="ctx.showEditModal.value" :summary-ctx="ctx" @close="ctx.cancelEdit()" />
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import EditCobroModal from './EditCobroModal.vue'

defineProps<{ ctx: any }>()

const { formatUSD } = useCurrency()

// Fecha · Empleado · Método · Propina · Acción (última columna de ancho fijo).
const gridClass = 'md:grid md:grid-cols-[6.5rem_minmax(0,1fr)_8rem_7rem_5rem] md:items-center md:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
</script>
