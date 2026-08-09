<template>
  <div class="flex flex-col sm:flex-row gap-4 w-full">
    <div class="relative flex-1">
      <input v-model="productSearch" type="text" :placeholder="isRetailOnly ? 'Buscar por nombre, SKU o código de barras...' : 'Buscar producto...'"
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        @focus="showProductDropdown = true" @blur="onProductBlur" @keydown.enter.prevent="onSearchEnter" />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <div v-if="showProductDropdown && filteredProducts.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-52 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;">
        <button v-for="product in filteredProducts" :key="product.id"
          @mousedown.prevent="$emit('add-product', { ...product, override_price: product.unit_price })"
          :disabled="Number(product.available_qty ?? 0) <= 0"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed">
          <div class="flex-1 min-w-0">
            <span class="text-text block truncate font-medium">{{ product.name }}</span>
            <span class="text-xs text-text-muted">
              Stock: {{ Number(product.available_qty ?? 0) }}
              <span v-if="product.sku || product.barcode" class="ml-1.5 font-mono text-text-muted/80">· {{ product.sku || product.barcode }}</span>
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0" @mousedown.stop>
            <button @mousedown.prevent="$emit('add-product', { ...product, override_price: product.unit_price })" :disabled="Number(product.available_qty ?? 0) <= 0" class="rounded border border-primary/30 bg-surface px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-theme disabled:opacity-50">
              <template v-if="isRetailOnly && product.unit_price_2">P1: </template>{{ formatDual(product.unit_price) }}
            </button>
            <button v-if="isRetailOnly && product.unit_price_2" @mousedown.prevent="$emit('add-product', { ...product, override_price: product.unit_price_2 })" :disabled="Number(product.available_qty ?? 0) <= 0" class="rounded border border-primary/30 bg-surface px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition-theme disabled:opacity-50">
              P2: {{ formatDual(product.unit_price_2) }}
            </button>
          </div>
        </button>
      </div>
    </div>

    <div class="relative w-full sm:w-72 flex flex-col gap-2 shrink-0">
      <div class="relative">
        <input v-model="localClientSearch" type="text" placeholder="Cliente (opcional)..."
          class="w-full rounded-lg border border-border bg-surface pl-3 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
          @focus="showClientDropdown = true" @blur="onClientBlur" @input="onClientInput" />
        <div v-if="showClientDropdown && clientSuggestions.length > 0" class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-52 overflow-y-auto touch-pan-y overscroll-contain" style="overflow-x: clip; -webkit-overflow-scrolling: touch;">
          <button v-for="client in clientSuggestions" :key="client.id"
            @mousedown.prevent="onSelectClient(client)"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0">
            <div class="flex-1 min-w-0"><span class="text-text block truncate">{{ client.full_name }}</span><span class="text-xs text-text-muted">{{ client.phone }}</span></div>
          </button>
        </div>
      </div>
      <input v-if="localClientSearch && !hasSelectedClient" v-model="localClientPhone" type="text" placeholder="Teléfono (opcional)..."
        class="w-full rounded-lg border border-border bg-surface pl-3 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        @input="$emit('update:client-phone', localClientPhone)" />
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
  isRetailOnly?: boolean
}>()

const emit = defineEmits<{
  'add-product': [product: any]
  'select-client': [client: any]
  'search-clients': [query: string]
  'update:client-name': [name: string]
  'update:client-phone': [phone: string]
}>()

const { formatDual } = useCurrency()

const productSearch = ref('')
const showProductDropdown = ref(false)

const filteredProducts = computed(() => {
  const all = (props.products as any[])
  if (!productSearch.value) return all
  const q = productSearch.value.trim().toLowerCase()
  return all.filter((p: any) =>
    p.name.toLowerCase().includes(q) ||
    (p.sku && String(p.sku).toLowerCase().includes(q)) ||
    (p.barcode && String(p.barcode).toLowerCase().includes(q))
  ).slice(0, 8)
})

/**
 * Scanner-gun workflow: a barcode scanner types the code then sends Enter. An exact
 * sku/barcode match adds and clears immediately so the next scan can start right away.
 * Falls back to "add the only match" for keyboard-only exact-name entry.
 */
const onSearchEnter = () => {
  const q = productSearch.value.trim().toLowerCase()
  if (!q) return
  const all = (props.products as any[])
  const exact = all.find((p: any) =>
    (p.barcode && String(p.barcode).toLowerCase() === q) ||
    (p.sku && String(p.sku).toLowerCase() === q)
  )
  const target = exact ?? (filteredProducts.value.length === 1 ? filteredProducts.value[0] : null)
  if (!target || Number(target.available_qty ?? 0) <= 0) return
  emit('add-product', { ...target, override_price: target.unit_price })
  productSearch.value = ''
}

const localClientSearch = ref('')
const localClientPhone = ref('')
const hasSelectedClient = ref(false)
const showClientDropdown = ref(false)
let clientTimeout: ReturnType<typeof setTimeout> | null = null

const onProductBlur = () => setTimeout(() => { showProductDropdown.value = false }, 150)

const onClientBlur = () => setTimeout(() => { showClientDropdown.value = false }, 150)

const onClientInput = () => {
  hasSelectedClient.value = false
  emit('update:client-name', localClientSearch.value)
  if (clientTimeout) clearTimeout(clientTimeout)
  const q = localClientSearch.value.trim()
  if (q.length < 1) { showClientDropdown.value = false; return }
  clientTimeout = setTimeout(() => emit('search-clients', q), 200)
}

const onSelectClient = (client: any) => {
  hasSelectedClient.value = true
  localClientSearch.value = client.full_name
  localClientPhone.value = client.phone
  emit('select-client', client)
}

defineExpose({
  reset() {
    productSearch.value = ''
    localClientSearch.value = ''
    localClientPhone.value = ''
    hasSelectedClient.value = false
  },
})
</script>
