<template>
  <FeatureGate feature="proveedores">
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span>Proveedores</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Gestión de Proveedores</h1>
      </div>
      <button
        @click="suppliersCtx.openNew()"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo proveedor
      </button>
    </div>
  </header>

  <div v-if="suppliersCtx.isLoading.value" class="flex items-center justify-center py-16">
    <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  </div>

  <div v-else-if="suppliersCtx.suppliers.value.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary mb-4">
      <svg class="h-7 w-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </div>
    <p class="text-lg font-semibold text-text">No hay proveedores</p>
    <p class="mt-1 text-sm text-text-muted">Agrega tu primer proveedor para empezar.</p>
  </div>

  <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-bg-secondary">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Nombre</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted hidden sm:table-cell">Empresa</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted hidden md:table-cell">Teléfono</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">Deuda</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="supplier in suppliersCtx.suppliers.value" :key="supplier.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {{ getInitials(supplier.fullName) }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-text">{{ supplier.fullName }}</p>
                  <p v-if="supplier.notes" class="text-xs text-text-muted truncate max-w-[180px]">{{ supplier.notes }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3.5 text-sm text-text-secondary hidden sm:table-cell">{{ supplier.company || '—' }}</td>
            <td class="px-4 py-3.5 text-sm text-text-secondary hidden md:table-cell">{{ supplier.phone || '—' }}</td>
            <td class="px-4 py-3.5 text-right">
              <div class="text-sm font-semibold text-text">
                {{ supplier.debtCurrency === 'VES' ? formatVESEs(supplier.debtOriginalAmount) : formatUSD(supplier.totalDebt) }}
              </div>
              <div class="text-xs text-text-muted">
                {{ supplier.debtCurrency === 'VES' ? formatUSD(supplier.totalDebt) : formatVESInline(supplier.totalDebt) + ' Bs' }}
              </div>
            </td>
            <td class="px-4 py-3.5 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="suppliersCtx.openEdit(supplier)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Editar">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="suppliersCtx.handleDelete(supplier.id)" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar">
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
    <div v-if="suppliersCtx.showModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="suppliersCtx.closeModal"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">{{ suppliersCtx.editingId.value ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
          <p class="text-sm text-text-muted">{{ suppliersCtx.editingId.value ? 'Modifica los datos del proveedor' : 'Registra un nuevo proveedor' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sup-first-name">Nombre</label>
              <input id="sup-first-name" v-model="suppliersCtx.form.value.firstName" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Nombre" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sup-last-name">Apellido</label>
              <input id="sup-last-name" v-model="suppliersCtx.form.value.lastName" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Apellido" required />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sup-company">Empresa</label>
            <input id="sup-company" v-model="suppliersCtx.form.value.company" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Distribuidora Cosmética, C.A." />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sup-phone">Teléfono</label>
            <input id="sup-phone" v-model="suppliersCtx.form.value.phone" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="+58 414-1234567" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sup-debt">Deuda asignada</label>
              <input id="sup-debt" v-model.number="suppliersCtx.form.value.totalDebt" type="number" min="0" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="sup-debt-currency">Moneda</label>
              <select id="sup-debt-currency" v-model="suppliersCtx.form.value.debtCurrency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="sup-notes">Notas</label>
            <textarea id="sup-notes" v-model="suppliersCtx.form.value.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional" />
          </div>
          <p v-if="suppliersCtx.saveError.value" class="text-sm text-danger">{{ suppliersCtx.saveError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="suppliersCtx.closeModal">Cancelar</button>
            <button type="submit" :disabled="suppliersCtx.saveMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ suppliersCtx.saveMutation.isPending.value ? 'Guardando...' : 'Guardar' }}
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
import { useAuth } from '../composables/common/useAuth'
import { useSuppliers } from '../composables/suppliers/useSuppliers'
import { getInitials } from '../lib/formatters'
import { useCurrency } from '../composables/common/useCurrency'
import { FeatureGate } from '../components/common'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const suppliersCtx = useSuppliers(businessId)
const { formatUSD, formatVESEs, formatVESInline } = useCurrency()

const handleSave = async () => {
  try {
    await suppliersCtx.handleSave()
  } catch { /* handled by composable */ }
}
</script>
