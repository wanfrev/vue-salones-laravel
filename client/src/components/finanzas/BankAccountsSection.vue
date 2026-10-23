<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="border-b border-border-subtle px-4 py-3">
      <h3 class="text-sm font-semibold text-text">Bancos</h3>
      <p class="mt-0.5 text-xs text-text-muted">
        Cuentas para identificar de dónde vino un pago móvil, transferencia o punto de venta en bolívares. Solo tú (dueña/o) puedes agregarlos o quitarlos.
      </p>
    </div>

    <form class="flex items-center gap-2 border-b border-border-subtle px-4 py-3" @submit.prevent="handleAdd">
      <input
        v-model="newBankName"
        type="text"
        placeholder="Ej: Banesco, BNC, Mercantil..."
        class="min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary/40 px-3 py-2.5 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
      />
      <button
        type="submit"
        :disabled="!newBankName.trim() || createMutation.isPending.value"
        class="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Agregar
      </button>
    </form>

    <div v-if="isLoading" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 3" :key="i" class="px-4 py-3.5"><div class="h-3 w-32 animate-pulse rounded bg-bg-secondary"></div></div>
    </div>

    <div v-else-if="banks.length === 0" class="px-4 py-10 text-center text-sm text-text-muted">
      No has agregado ningún banco todavía.
    </div>

    <ul v-else class="divide-y divide-border-subtle">
      <li v-for="bank in banks" :key="bank.id" data-testid="bank-row" class="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-bg-secondary/40">
        <span class="text-sm font-medium text-text">{{ bank.name }}</span>
        <button
          type="button"
          @click="handleDelete(bank)"
          :disabled="deleteMutation.isPending.value"
          title="Eliminar banco"
          aria-label="Eliminar banco"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </li>
    </ul>
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
