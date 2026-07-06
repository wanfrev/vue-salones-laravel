<template>
  <div class="rounded-xl border border-border bg-surface p-4">
    <h3 class="text-sm font-semibold text-text mb-2">Agregar productos</h3>
    <div class="relative">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar producto para añadir..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        @focus="showDropdown = true"
        @blur="onBlur"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div
        v-if="showDropdown && displayedProducts.length > 0"
        class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden max-h-52 overflow-y-auto"
      >
        <button
          v-for="product in displayedProducts"
          :key="product.id"
          @mousedown.prevent="addProduct(product)"
          :disabled="Number(product.available_qty ?? 0) <= 0"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50 border-b border-border last:border-b-0"
        >
          <div class="flex-1 min-w-0">
            <span class="text-text block truncate">{{ product.name }}</span>
            <span class="text-xs text-text-muted">Stock: {{ Number(product.available_qty ?? 0) }}</span>
          </div>
          <span class="text-text-muted text-xs whitespace-nowrap font-medium">{{ formatDual(product.unit_price) }}</span>
        </button>
      </div>
      <div
        v-if="showDropdown && search && displayedProducts.length === 0"
        class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg px-4 py-3 text-center text-sm text-text-muted"
      >
        Sin resultados
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps<{
  products: any[]
}>()

const emit = defineEmits<{
  'add-product': [product: any]
}>()

const { formatDual } = useCurrency()
const search = ref('')
const showDropdown = ref(false)

const displayedProducts = computed(() => {
  if (!search.value) {
    return props.products.filter((p: any) => Number(p.available_qty ?? 0) > 0).slice(0, 6)
  }
  const q = search.value.toLowerCase()
  return props.products.filter((p: any) =>
    p.name.toLowerCase().includes(q)
  ).slice(0, 8)
})

const addProduct = (product: any) => {
  emit('add-product', product)
  search.value = ''
  showDropdown.value = false
}

const onBlur = () => {
  setTimeout(() => { showDropdown.value = false }, 150)
}
</script>
