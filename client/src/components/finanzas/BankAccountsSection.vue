<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="border-b border-border bg-bg-secondary px-4 py-3">
      <h3 class="text-sm font-semibold text-text">Bancos</h3>
      <p class="text-xs text-text-muted mt-0.5">
        Cuentas para identificar de dónde vino un pago móvil, transferencia o punto de venta en bolívares. Solo tú (dueña/o) puedes agregarlos o quitarlos.
      </p>
    </div>

    <div class="p-4 space-y-4">
      <form class="flex items-center gap-2" @submit.prevent="handleAdd">
        <input
          v-model="newBankName"
          type="text"
          placeholder="Ej: Banesco, BNC, Mercantil..."
          class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          :disabled="!newBankName.trim() || createMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <svg class="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="banks.length === 0" class="py-6 text-center text-sm text-text-muted">
        No has agregado ningún banco todavía.
      </div>

      <div v-else class="divide-y divide-border-subtle rounded-lg border border-border-subtle">
        <div v-for="bank in banks" :key="bank.id" class="flex items-center justify-between px-3 py-2.5">
          <span class="text-sm font-medium text-text">{{ bank.name }}</span>
          <button
            type="button"
            @click="handleDelete(bank)"
            :disabled="deleteMutation.isPending.value"
            title="Eliminar banco"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBanks } from '../../composables/finanzas/useBanks'
import type { Bank } from '../../services/banksService'

const { banks, isLoading, createMutation, deleteMutation } = useBanks()

const newBankName = ref('')

const handleAdd = async () => {
  const name = newBankName.value.trim()
  if (!name) return
  try {
    await createMutation.mutateAsync(name)
    newBankName.value = ''
  } catch { /* handled by composable */ }
}

const handleDelete = (bank: Bank) => {
  if (!window.confirm(`¿Eliminar "${bank.name}" de la lista de bancos?`)) return
  deleteMutation.mutate(bank.id)
}
</script>
