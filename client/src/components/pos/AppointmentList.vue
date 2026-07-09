<template>
  <div class="space-y-3">
    <div class="relative mb-3">
      <input v-model="search" type="text" placeholder="Buscar cliente..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15" />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
    </div>

    <div v-if="overdue.length > 0" class="rounded-xl border border-border bg-surface p-4 mb-3">
      <div class="flex items-center gap-2 mb-3">
        <svg class="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <h3 class="text-sm font-semibold text-text">Citas realizadas</h3>
        <span class="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">{{ overdue.length }}</span>
      </div>
      <div class="space-y-1.5">
        <POSAppointmentCard
          v-for="appt in overdue" :key="appt.id"
          :appt="appt" :is-selected="selectedId === appt.id"
          :products="products" :inline-product-search="inlineProductSearch"
          :show-inline-dropdown="showInlineDropdown" variant="overdue"
          @select="$emit('select', appt)" @go-to-calendar="$emit('go-to-calendar', appt)"
          @update:inline-product-search="$emit('update:inline-product-search', $event)"
          @add-product="$emit('add-product', $event)" @blur="$emit('blur')"
        />
      </div>
    </div>

    <div v-if="upcoming.length > 0" class="rounded-xl border border-border bg-surface p-4">
      <div class="flex items-center gap-2 mb-3">
        <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <h3 class="text-sm font-semibold text-text">Citas pendientes</h3>
        <span class="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{{ upcoming.length }}</span>
      </div>
      <div class="space-y-1.5">
        <POSAppointmentCard
          v-for="appt in upcoming" :key="appt.id"
          :appt="appt" :is-selected="selectedId === appt.id"
          :products="products" :inline-product-search="inlineProductSearch"
          :show-inline-dropdown="showInlineDropdown" variant="upcoming"
          @select="$emit('select', appt)" @go-to-calendar="$emit('go-to-calendar', appt)"
          @update:inline-product-search="$emit('update:inline-product-search', $event)"
          @add-product="$emit('add-product', $event)" @blur="$emit('blur')"
        />
      </div>
    </div>

    <div v-if="totalCount === 0" class="py-6 text-center text-sm text-text-muted rounded-xl border border-border bg-surface p-4">
      {{ search ? 'Sin resultados' : 'No hay citas pendientes de pago' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import POSAppointmentCard from './POSAppointmentCard.vue'

const props = defineProps<{
  overdue: any[]
  upcoming: any[]
  totalCount: number
  selectedId: string | null
  products: any[]
  inlineProductSearch: string
  showInlineDropdown: boolean
}>()

const emit = defineEmits<{
  select: [appt: any]
  'go-to-calendar': [appt: any]
  'update:inline-product-search': [value: string]
  'add-product': [product: any]
  blur: []
  'update:search': [value: string]
}>()

const search = ref('')
watch(search, (val) => emit('update:search', val))
</script>
