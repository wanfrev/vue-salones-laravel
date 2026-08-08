<template>
  <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
    <div class="w-full max-w-lg rounded-2xl border-2 border-warning/60 bg-surface p-6 shadow-2xl space-y-6">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/20 text-warning shrink-0">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-text">⚠️ Tasa del Día (Tienda)</h2>
          <p class="text-xs text-text-muted">Verifica o actualiza la tasa de cambio en Bs para las operaciones de hoy.</p>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-text-secondary">Tasa registrada actualmente</span>
          <span class="text-xl font-extrabold text-warning tabular-nums">{{ currentRate }} Bs / USD</span>
        </div>
        <p class="text-xs text-text-muted leading-relaxed">
          Es indispensable mantener la tasa del día actualizada para garantizar el cálculo correcto en el Punto de Venta (POS) y finanzas.
        </p>
      </div>

      <div class="space-y-2">
        <label class="block text-sm font-semibold text-text">Nueva Tasa del Día (Bs / USD)</label>
        <div class="relative">
          <input
            v-model.number="newRate"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ej. 62.50"
            class="w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-lg font-bold text-text outline-none transition-theme focus:border-warning focus:ring-2 focus:ring-warning/20"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">Bs</span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          @click="handleSaveNewRate"
          :disabled="isSubmitting || !newRate || newRate <= 0"
          class="flex-1 rounded-xl bg-warning px-4 py-3 text-sm font-bold text-text-inverse shadow-lg transition-all hover:bg-warning/90 active:scale-[0.98] disabled:opacity-50"
        >
          {{ isSubmitting ? 'Guardando...' : 'Guardar Nueva Tasa' }}
        </button>
        <button
          @click="handleConfirmCurrent"
          :disabled="isSubmitting"
          class="rounded-xl border border-border bg-bg-secondary px-4 py-3 text-sm font-semibold text-text transition-all hover:bg-bg-tertiary active:scale-[0.98]"
        >
          Mantener {{ currentRate }} Bs
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBusinessStore } from '../../store/business'
import { isTiendaNiche } from '../../config/niches'
import { useCurrency } from '../../composables/common/useCurrency'
import { useExchangeRate } from '../../composables/finanzas/useExchangeRate'

import { useAuthStore } from '../../store/auth'
import { isAdminPanelRole } from '../../constants/roles'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const { exchangeRate } = useCurrency()
const { handleUpdate, editRateValue } = useExchangeRate()

const showModal = ref(false)
const isSubmitting = ref(false)
const newRate = ref(0)

const isTienda = computed(() => isTiendaNiche(businessStore.nicheType))
const isAllowedRole = computed(() => isAdminPanelRole(authStore.role ?? undefined))
const currentRate = computed(() => exchangeRate.value || 1)

function getTodayKey() {
  const today = new Date().toISOString().split('T')[0]
  const bizId = businessStore.business?.id || 'default'
  return `luma_rate_confirmed_${bizId}_${today}`
}

function checkNoticeStatus() {
  if (!isTienda.value || !isAllowedRole.value) {
    showModal.value = false
    return
  }
  const key = getTodayKey()
  const confirmed = localStorage.getItem(key)
  if (!confirmed) {
    newRate.value = currentRate.value
    showModal.value = true
  } else {
    showModal.value = false
  }
}

watch(
  [() => businessStore.business?.id, () => authStore.role, isTienda, isAllowedRole],
  () => {
    checkNoticeStatus()
  },
  { immediate: true }
)

onMounted(() => {
  checkNoticeStatus()
})

const markTodayConfirmed = () => {
  const key = getTodayKey()
  localStorage.setItem(key, 'true')
  showModal.value = false
}

const handleConfirmCurrent = () => {
  markTodayConfirmed()
}

const handleSaveNewRate = async () => {
  if (!newRate.value || newRate.value <= 0) return
  isSubmitting.value = true
  try {
    editRateValue.value = newRate.value
    await handleUpdate()
    markTodayConfirmed()
  } finally {
    isSubmitting.value = false
  }
}
</script>
