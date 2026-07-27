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
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-lg border border-border bg-bg-secondary p-1">
          <button @click="activeTab = 'active'" :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeTab === 'active' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text']">
            Activas ({{ ctx.activeGiftCards.value.length }})
          </button>
          <button @click="activeTab = 'used'" :class="['rounded-md px-3 py-1.5 text-sm font-medium transition-colors', activeTab === 'used' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text']">
            Historial ({{ ctx.usedGiftCards.value.length }})
          </button>
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
    </div>
  </header>

  <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
    <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  </div>

  <div v-else-if="currentGiftCards.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary mb-4">
      <svg class="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    </div>
    <p class="text-lg font-semibold text-text">No hay gift cards {{ activeTab === 'active' ? 'activas' : 'en el historial' }}</p>
    <p class="mt-1 text-sm text-text-muted">{{ activeTab === 'active' ? 'Registra tu primera gift card para empezar.' : 'Las gift cards consumidas o expiradas aparecerán aquí.' }}</p>
  </div>

  <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div
      v-for="gc in currentGiftCards"
      :key="gc.id"
      class="relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div>
        <div class="flex items-center justify-between gap-2 border-b border-border pb-3 mb-3">
          <div class="flex items-center gap-2">
            <span class="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary tracking-wider">
              {{ gc.code || 'SIN CÓDIGO' }}
            </span>
          </div>
          <span :class="[
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
            gc.status === 'active' ? 'bg-success/10 text-success' : gc.status === 'redeemed' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
          ]">
            {{ gc.status === 'active' ? 'Activa' : gc.status === 'redeemed' ? 'Canjeada / Consumida' : 'Expirada' }}
          </span>
        </div>

        <div class="space-y-2 mb-4">
          <div class="rounded-xl bg-bg-secondary p-2.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">Comprador</p>
            <p class="text-sm font-semibold text-text truncate">{{ gc.buyerName || '—' }}</p>
            <p class="text-xs text-text-muted">{{ gc.buyerPhone || 'Sin teléfono' }}</p>
          </div>

          <div class="rounded-xl bg-bg-secondary p-2.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">Beneficiario (Recibe)</p>
            <p class="text-sm font-semibold text-text truncate">{{ gc.recipientName }}</p>
            <p class="text-xs text-text-muted">{{ gc.recipientPhone || 'Sin teléfono' }}</p>
          </div>
        </div>

        <div v-if="gc.notes" class="text-xs text-text-muted mb-3 italic">
          "{{ gc.notes }}"
        </div>
      </div>

      <div class="pt-3 border-t border-border flex items-center justify-between">
        <div>
          <p class="text-[11px] font-medium text-text-muted uppercase">Saldo Restante</p>
          <div class="text-lg font-bold text-success">{{ formatUSD(gc.amount) }}</div>
          <div class="text-xs text-text-muted">{{ formatVESInline(gc.amount) }} Bs</div>
        </div>

        <div class="flex items-center gap-1">
          <button @click="ctx.openEdit(gc)" class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Editar">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button @click="ctx.handleDelete(gc.id)" class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="ctx.showModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="ctx.closeModal"
    >
      <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-text">{{ ctx.editingId.value ? 'Editar Gift Card' : 'Nueva Gift Card' }}</h2>
            <p class="text-sm text-text-muted">{{ ctx.editingId.value ? 'Modifica los datos de la gift card' : 'Registra una nueva tarjeta de regalo' }}</p>
          </div>
          <button @click="ctx.closeModal" class="rounded-lg p-1 text-text-muted hover:text-text">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleSave">
          <!-- Código único -->
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Código único de Gift Card</label>
            <div class="flex gap-2">
              <input
                v-model="ctx.form.value.code"
                type="text"
                class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono uppercase text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="GC-XXXXXX"
                required
              />
              <button
                type="button"
                @click="ctx.form.value.code = generateGiftCardCode()"
                class="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
              >
                ⚡ Generar
              </button>
            </div>
          </div>

          <!-- Comprador con Autocompletar -->
          <div class="rounded-xl border border-border p-3.5 space-y-3 bg-bg-secondary/30">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-text-muted">1. Comprador (Quien paga)</span>
              <label class="flex items-center gap-1.5 cursor-pointer text-xs text-text-muted">
                <input type="checkbox" v-model="ctx.saveBuyerAsClient.value" class="rounded border-border text-primary focus:ring-primary" />
                Guardar como cliente
              </label>
            </div>

            <div class="relative">
              <label class="mb-1 block text-xs font-medium text-text">Buscar o Nombre</label>
              <input
                v-model="ctx.form.value.buyerName"
                @input="onSearchBuyer(($event.target as HTMLInputElement).value)"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="Escribe para buscar o ingresar nombre"
                required
              />

              <!-- Suggestions dropdown -->
              <div v-if="buyerSuggestions.length > 0" class="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
                <button
                  v-for="cli in buyerSuggestions"
                  :key="cli.id"
                  type="button"
                  @click="selectBuyerSuggestion(cli)"
                  class="w-full rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-bg-secondary flex items-center justify-between"
                >
                  <span class="font-semibold text-text">{{ cli.full_name }}</span>
                  <span class="text-text-muted">{{ cli.phone || 'Sin teléfono' }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-text">Teléfono del comprador (Opcional)</label>
              <input
                v-model="ctx.form.value.buyerPhone"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="+58 414-1234567"
              />
            </div>
          </div>

          <!-- Beneficiario con Autocompletar -->
          <div class="rounded-xl border border-border p-3.5 space-y-3 bg-bg-secondary/30">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-text-muted">2. Beneficiario (Quien recibe)</span>
              <label class="flex items-center gap-1.5 cursor-pointer text-xs text-text-muted">
                <input type="checkbox" v-model="ctx.saveRecipientAsClient.value" class="rounded border-border text-primary focus:ring-primary" />
                Guardar como cliente
              </label>
            </div>

            <div class="relative">
              <label class="mb-1 block text-xs font-medium text-text">Buscar o Nombre</label>
              <input
                v-model="ctx.form.value.recipientName"
                @input="onSearchRecipient(($event.target as HTMLInputElement).value)"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="Escribe para buscar o ingresar nombre"
                required
              />

              <!-- Suggestions dropdown -->
              <div v-if="recipientSuggestions.length > 0" class="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
                <button
                  v-for="cli in recipientSuggestions"
                  :key="cli.id"
                  type="button"
                  @click="selectRecipientSuggestion(cli)"
                  class="w-full rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-bg-secondary flex items-center justify-between"
                >
                  <span class="font-semibold text-text">{{ cli.full_name }}</span>
                  <span class="text-text-muted">{{ cli.phone || 'Sin teléfono' }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-text">Teléfono del beneficiario (Opcional)</label>
              <input
                v-model="ctx.form.value.recipientPhone"
                type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                placeholder="+58 414-1234567"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-amount">Monto / Saldo Inicial (USD)</label>
            <input id="gc-amount" v-model.number="ctx.form.value.amount" type="number" min="0.01" step="0.01"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="0.00" required />
          </div>

          <div v-if="ctx.editingId.value">
            <label class="mb-1 block text-sm font-medium text-text" for="gc-status">Estado</label>
            <select id="gc-status" v-model="ctx.form.value.status"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
              <option value="active">Activa</option>
              <option value="redeemed">Canjeada / Consumida</option>
              <option value="expired">Expirada</option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="gc-notes">Notas</label>
            <textarea id="gc-notes" v-model="ctx.form.value.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Notas opcionales" />
          </div>

          <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>
          <p v-if="ctx.formErrors.value?.recipientName" class="text-xs text-danger">{{ ctx.formErrors.value.recipientName }}</p>
          <p v-if="ctx.formErrors.value?.amount" class="text-xs text-danger">{{ ctx.formErrors.value.amount }}</p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="ctx.closeModal">Cancelar</button>
            <button type="submit" :disabled="ctx.saveMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.saveMutation.isPending.value ? 'Guardando...' : 'Guardar Gift Card' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useGiftCards, generateGiftCardCode } from '../composables/giftCards/useGiftCards'
import { useCurrency } from '../composables/common/useCurrency'
import { FeatureGate } from '../components/common'
import { searchClients } from '../services/clientesService'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const ctx = useGiftCards(businessId)
const { formatUSD, formatVESInline } = useCurrency()

const activeTab = ref<'active' | 'used'>('active')
const currentGiftCards = computed(() => activeTab.value === 'active' ? ctx.activeGiftCards.value : ctx.usedGiftCards.value)

const buyerSuggestions = ref<any[]>([])
const recipientSuggestions = ref<any[]>([])

const onSearchBuyer = async (query: string) => {
  if (!businessId.value || !query.trim()) {
    buyerSuggestions.value = []
    return
  }
  try {
    buyerSuggestions.value = await searchClients(businessId.value, query)
  } catch {
    buyerSuggestions.value = []
  }
}

const selectBuyerSuggestion = (cli: any) => {
  ctx.form.value.buyerName = cli.full_name
  ctx.form.value.buyerPhone = cli.phone ?? ''
  buyerSuggestions.value = []
}

const onSearchRecipient = async (query: string) => {
  if (!businessId.value || !query.trim()) {
    recipientSuggestions.value = []
    return
  }
  try {
    recipientSuggestions.value = await searchClients(businessId.value, query)
  } catch {
    recipientSuggestions.value = []
  }
}

const selectRecipientSuggestion = (cli: any) => {
  ctx.form.value.recipientName = cli.full_name
  ctx.form.value.recipientPhone = cli.phone ?? ''
  recipientSuggestions.value = []
}

const handleSave = async () => {
  try {
    await ctx.handleSave()
    buyerSuggestions.value = []
    recipientSuggestions.value = []
  } catch { /* handled by composable */ }
}
</script>
