<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatTime } from '../../lib/formatters'

const props = defineProps<{
  appt: any
  isSelected: boolean
  variant: 'overdue' | 'upcoming'
  products: any[]
  inlineProductSearch: string
  showInlineDropdown: boolean
}>()

const emit = defineEmits<{
  select: [appt: any]
  goToCalendar: [appt: any]
  'update:inlineProductSearch': [value: string]
  addProduct: [product: any]
  blur: [event: FocusEvent]
  focus: []
}>()

const normalize = (s: string): string =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const inlineFilteredProducts = computed(() => {
  if (!props.inlineProductSearch) return (props.products as any[]).filter((p: any) => Number(p.available_qty ?? 0) > 0).slice(0, 6)
  const q = props.inlineProductSearch.toLowerCase()
  return (props.products as any[]).filter((p: any) => p.name.toLowerCase().includes(q)).slice(0, 8)
})
</script>

<template>
  <div>
    <button
      @click="$emit('select', appt)"
      :class="[
        'w-full text-left rounded-lg border p-2.5 transition-theme',
        isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-border-strong hover:bg-bg-secondary'
      ]"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-text truncate">{{ appt.client?.full_name || appt.clients?.full_name || 'Cliente' }}</p>
          <p class="text-xs text-text-muted truncate">{{ (appt.service?.name ?? appt.services?.name) || 'Servicio' }}<span v-if="appt.employeeName"> · {{ appt.employeeName }}</span></p>
          <div v-if="appt.service?.linked_product_id" class="mt-1 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-1.5 py-0.5 rounded w-fit">
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Consumirá 1x {{ appt.service?.linked_product?.name || 'Insumo' }}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 ml-3">
          <div class="text-right">
            <p class="text-sm font-bold text-text">${{ appt.groupPrice ?? appt.price_override ?? (appt.service?.price ?? appt.services?.price) ?? 0 }}</p>
            <p class="text-xs text-text-muted">{{ formatTime(appt.start_time) }}</p>
          </div>
          <button
            type="button"
            @click.stop="$emit('goToCalendar', appt)"
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
            title="Ir a la cita en el calendario"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </button>

    <!-- Inline product search (shown when this appointment is selected) -->
    <div v-if="isSelected" class="ml-2 mr-1 mb-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2">
      <div class="relative">
        <input
          :value="inlineProductSearch"
          @input="$emit('update:inlineProductSearch', ($event.target as HTMLInputElement).value)"
          @focus="$emit('focus')"
          @blur="$emit('blur', $event)"
          placeholder="Agregar producto..."
          class="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <div class="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div
          v-if="showInlineDropdown && inlineFilteredProducts.length > 0"
          class="absolute z-50 mt-1 left-0 right-0 rounded-xl border border-border bg-surface shadow-lg max-h-40 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;"
        >
          <button
            v-for="product in inlineFilteredProducts" :key="product.id"
            @mousedown.prevent="$emit('addProduct', product)"
            :disabled="Number(product.available_qty ?? 0) <= 0"
            class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50 border-b border-border last:border-b-0"
          >
            <span class="text-text truncate">{{ product.name }}</span>
            <span class="text-text-muted whitespace-nowrap">${{ Number(product.unit_price ?? product.price ?? 0).toFixed(2) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
