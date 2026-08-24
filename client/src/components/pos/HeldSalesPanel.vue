<template>
  <div class="relative" ref="panelRef">
    <button type="button" @click="isOpen = !isOpen"
      class="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs sm:text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
      <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Ventas en espera</span>
      <span v-if="heldSales.length > 0"
        class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-text-inverse">
        {{ heldSales.length }}
      </span>
    </button>

    <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
      <div v-if="isOpen" class="absolute left-0 top-full z-40 mt-1.5 w-80 max-w-[90vw] rounded-xl border border-border bg-surface p-2 shadow-xl max-h-96 overflow-y-auto">
        <div v-if="isLoading" class="py-6 text-center text-sm text-text-muted">Cargando...</div>
        <div v-else-if="heldSales.length === 0" class="py-6 text-center text-sm text-text-muted">
          No hay ventas en espera.
        </div>
        <div v-else class="space-y-1.5">
          <div v-for="sale in heldSales" :key="sale.id"
            class="rounded-lg border border-border-subtle bg-bg-secondary/40 p-2.5">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">{{ sale.client_name || 'Sin cliente' }}</p>
              <p class="text-xs text-text-muted">
                {{ sale.cart.length }} producto{{ sale.cart.length === 1 ? '' : 's' }} · {{ formatUSD(sale.total_amount) }} · {{ timeAgo(sale.created_at) }}
              </p>
            </div>
            <div class="mt-2 flex items-center gap-1.5">
              <button type="button" @click="handleResume(sale)"
                class="flex-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover">
                Retomar
              </button>
              <button type="button" @click="handleCancel(sale)"
                class="rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/10">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import type { HeldSale } from '../../services/posService'

defineProps<{
  heldSales: HeldSale[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  resume: [sale: HeldSale]
  cancel: [sale: HeldSale]
}>()

const { formatUSD } = useCurrency()
const isOpen = ref(false)
const panelRef = ref<HTMLElement | null>(null)

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.round(diffMs / 60000))
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  return `hace ${hours} h`
}

const handleResume = (sale: HeldSale) => {
  isOpen.value = false
  emit('resume', sale)
}

const handleCancel = (sale: HeldSale) => {
  emit('cancel', sale)
}

const handleClickOutside = (e: MouseEvent) => {
  if (panelRef.value && !panelRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
