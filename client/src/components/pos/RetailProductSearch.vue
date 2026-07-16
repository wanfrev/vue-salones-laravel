<template>
  <div class="flex flex-col sm:flex-row gap-2">
    <div class="relative w-full sm:w-72">
      <input v-model="productSearch" type="text" placeholder="Buscar producto..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        @focus="showProductDropdown = true" @blur="onProductBlur" />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <div v-if="showProductDropdown && filteredProducts.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-52 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;">
        <button v-for="product in filteredProducts" :key="product.id"
          @mousedown.prevent="$emit('add-product', product)"
          :disabled="Number(product.available_qty ?? 0) <= 0"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50 border-b border-border last:border-b-0">
          <div class="flex-1 min-w-0"><span class="text-text block truncate">{{ product.name }}</span><span class="text-xs text-text-muted">Stock: {{ Number(product.available_qty ?? 0) }}</span></div>
          <span class="text-text-muted text-xs whitespace-nowrap font-medium">{{ formatDual(product.unit_price) }}</span>
        </button>
      </div>
    </div>

    <div class="relative w-full sm:w-56">
      <input v-model="clientSearch" type="text" placeholder="Cliente (opcional)..."
        class="w-full rounded-lg border border-border bg-surface pl-3 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        @focus="showClientDropdown = true" @blur="onClientBlur" @input="onClientInput" />
      <div v-if="showClientDropdown && clientSuggestions.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-52 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;">
        <button v-for="client in clientSuggestions" :key="client.id"
          @mousedown.prevent="$emit('select-client', client)"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0">
          <div class="flex-1 min-w-0"><span class="text-text block truncate">{{ client.full_name }}</span><span class="text-xs text-text-muted">{{ client.phone }}</span></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  products: any[]
  clientSuggestions: { id: string; full_name: string; phone: string }[]
  businessId: string | null
  branchId: string | null
}>()

const emit = defineEmits<{
  'add-product': [product: any]
  'select-client': [client: any]
  'search-clients': [query: string]
}>()

const { formatDual } = useCurrency()

const productSearch = ref('')
const showProductDropdown = ref(false)

const filteredProducts = computed(() => {
  const all = (props.products as any[])
  if (!productSearch.value) return all
  const q = productSearch.value.toLowerCase()
  return all.filter((p: any) => p.name.toLowerCase().includes(q)).slice(0, 8)
})

const clientSearch = ref('')
const showClientDropdown = ref(false)
let clientTimeout: ReturnType<typeof setTimeout> | null = null

const onProductBlur = () => setTimeout(() => { showProductDropdown.value = false }, 150)

const onClientBlur = () => setTimeout(() => { showClientDropdown.value = false }, 150)

const onClientInput = () => {
  if (clientTimeout) clearTimeout(clientTimeout)
  const q = clientSearch.value.trim()
  if (q.length < 1) { showClientDropdown.value = false; return }
  clientTimeout = setTimeout(() => emit('search-clients', q), 200)
}

defineExpose({
  reset() {
    productSearch.value = ''
    clientSearch.value = ''
  },
})
</script>
