<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg-secondary px-4 py-3">
      <div>
        <h3 class="text-sm font-semibold text-text">Propinas directas</h3>
        <p class="text-xs text-text-muted mt-0.5">Propinas cobradas en el POS sin estar asociadas a una cita — 100% del empleado, no cuentan como ingreso del negocio</p>
      </div>
      <div class="text-right" v-if="ctx.standaloneTips.value.length > 0">
        <p class="text-xs text-text-muted">Total del período</p>
        <p class="text-sm font-semibold text-primary">{{ formatUSD(ctx.standaloneTipsTotal.value) }}</p>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-10">
      <svg class="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="ctx.standaloneTips.value.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
      No hay propinas directas en este período.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">Fecha</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs">Empleado</th>
            <th class="px-4 py-2.5 text-left font-medium text-text-muted text-xs hidden md:table-cell">Método</th>
            <th class="px-4 py-2.5 text-right font-medium text-text-muted text-xs">Propina</th>
            <th class="px-4 py-2.5 text-center font-medium text-text-muted text-xs">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="row in ctx.standaloneTips.value" :key="row.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-2.5 text-text-secondary">{{ row.date }}</td>
            <td class="px-4 py-2.5">
              <div class="font-medium text-text">{{ row.employee }}</div>
              <div v-if="row.notes" class="text-xs text-text-muted truncate max-w-[200px]" :title="row.notes">{{ row.notes }}</div>
            </td>
            <td class="px-4 py-2.5 text-text-secondary hidden md:table-cell">{{ row.method }}</td>
            <td class="px-4 py-2.5 text-right font-medium text-primary">{{ formatUSD(row.amount) }}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center justify-center gap-1">
                <button @click="ctx.startEdit(row)"
                  :disabled="ctx.editTransactionMutation.isPending.value || ctx.deleteTransactionMutation.isPending.value"
                  class="rounded-lg p-1.5 text-text-muted hover:text-primary hover:bg-bg-secondary transition-colors" title="Editar">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="ctx.confirmDeleteTransaction(row.id)"
                  :disabled="ctx.editTransactionMutation.isPending.value || ctx.deleteTransactionMutation.isPending.value"
                  class="rounded-lg p-1.5 text-text-muted hover:text-danger hover:bg-bg-secondary transition-colors" title="Eliminar">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EditCobroModal :show="ctx.showEditModal.value" :summary-ctx="ctx" @close="ctx.cancelEdit()" />
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import EditCobroModal from './EditCobroModal.vue'

defineProps<{ ctx: any }>()

const { formatUSD } = useCurrency()
</script>
