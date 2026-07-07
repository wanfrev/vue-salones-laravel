<template>
  <FeatureGate feature="gift_cards">
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span>Gift Cards</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Gestión de Gift Cards</h1>
      </div>
      <button
        @click="ctx.openNew()"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva Gift Card
      </button>
    </div>
  </header>

  <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
    <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  </div>

  <div v-else-if="ctx.giftCards.value.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary mb-4">
      <svg class="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    </div>
    <p class="text-lg font-semibold text-text">No hay gift cards</p>
    <p class="mt-1 text-sm text-text-muted">Registra tu primera gift card para empezar.</p>
  </div>

  <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Beneficiario</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted hidden sm:table-cell">Teléfono</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Monto</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted hidden md:table-cell">Estado</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted hidden md:table-cell">Notas</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="gc in ctx.giftCards.value" :key="gc.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {{ getInitials(gc.recipientName) }}
                </div>
                <p class="text-sm font-semibold text-text">{{ gc.recipientName }}</p>
              </div>
            </td>
            <td class="px-4 py-3.5 text-sm text-text-secondary hidden sm:table-cell">{{ gc.recipientPhone || '—' }}</td>
            <td class="px-4 py-3.5 text-right">
              <div class="text-sm font-semibold text-text">{{ formatUSD(gc.amount) }}</div>
              <div class="text-xs text-text-muted">{{ formatVESInline(gc.amount) }} Bs</div>
            </td>
            <td class="px-4 py-3.5 text-center hidden md:table-cell">
              <span :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                gc.status === 'active' ? 'bg-success/10 text-success' : gc.status === 'redeemed' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
              ]">
                {{ gc.status === 'active' ? 'Activa' : gc.status === 'redeemed' ? 'Canjeada' : 'Expirada' }}
              </span>
            </td>
            <td class="px-4 py-3.5 text-sm text-text-secondary hidden md:table-cell max-w-[160px]">
              <span v-if="gc.notes" class="truncate block" :title="gc.notes">{{ gc.notes }}</span>
              <span v-else class="text-text-muted/40">—</span>
            </td>
            <td class="px-4 py-3.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="ctx.openEdit(gc)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Editar">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="ctx.handleDelete(gc.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar">
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
  </div>

  <Teleport to="body">
    <div v-if="ctx.showModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="ctx.closeModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">{{ ctx.editingId.value ? 'Editar Gift Card' : 'Nueva Gift Card' }}</h2>
          <p class="text-sm text-text-muted">{{ ctx.editingId.value ? 'Modifica los datos de la gift card' : 'Registra una nueva tarjeta de regalo' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-recipient">Nombre del beneficiario</label>
            <input id="gc-recipient" v-model="ctx.form.value.recipientName" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Nombre de la persona" required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-phone">Teléfono</label>
            <input id="gc-phone" v-model="ctx.form.value.recipientPhone" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="+58 414-1234567" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-amount">Monto (USD)</label>
            <input id="gc-amount" v-model.number="ctx.form.value.amount" type="number" min="0.01" step="0.01"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="0.00" required />
          </div>
          <div v-if="ctx.editingId.value">
            <label class="mb-1 block text-sm font-medium text-text" for="gc-status">Estado</label>
            <select id="gc-status" v-model="ctx.form.value.status"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="active">Activa</option>
              <option value="redeemed">Canjeada</option>
              <option value="expired">Expirada</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-notes">Notas</label>
            <textarea id="gc-notes" v-model="ctx.form.value.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional" />
          </div>
          <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="ctx.closeModal">Cancelar</button>
            <button type="submit" :disabled="ctx.saveMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.saveMutation.isPending.value ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useGiftCards } from '../composables/useGiftCards'
import { getInitials } from '../lib/formatters'
import { useCurrency } from '../composables/useCurrency'
import { FeatureGate } from '../components/common'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const ctx = useGiftCards(businessId)
const { formatUSD, formatVESInline } = useCurrency()

const handleSave = async () => {
  try {
    await ctx.handleSave()
  } catch { /* handled by composable */ }
}
</script>
