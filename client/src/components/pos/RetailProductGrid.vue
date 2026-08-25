<template>
  <div class="flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
    <div v-if="showSearch" class="p-3 sm:p-4 border-b border-border">
      <div class="relative">
        <input
          ref="searchInputRef"
          v-model="search"
          type="text"
          placeholder="Buscar por nombre, SKU o código de barras..."
          class="w-full rounded-lg border border-border bg-surface pl-9 pr-8 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
          @keydown.enter.prevent="onSearchEnter"
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <button
          v-if="search"
          type="button"
          @click="search = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="px-3 sm:px-4 py-3 border-b border-border bg-bg-secondary flex gap-2 overflow-x-auto no-scrollbar touch-pan-x">
      <button
        @click="selectedCategory = 'all'"
        class="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition duration-200"
        :class="selectedCategory === 'all' ? 'bg-primary text-text-inverse shadow-md shadow-primary/20' : 'bg-surface border border-border text-text-secondary hover:text-text hover:border-primary/50'"
      >
        Todos
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        @click="selectedCategory = cat"
        class="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition duration-200"
        :class="selectedCategory === cat ? 'bg-primary text-text-inverse shadow-md shadow-primary/20' : 'bg-surface border border-border text-text-secondary hover:text-text hover:border-primary/50'"
      >
        {{ cat }}
      </button>
    </div>

    <div class="p-3 sm:p-4 overflow-y-auto flex-1 bg-bg-secondary/20">
      <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center py-12 text-text-muted">
        <svg class="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-sm font-medium">{{ search ? 'Sin resultados para tu búsqueda' : 'No hay productos en esta categoría' }}</p>
      </div>

      <div v-else class="grid gap-3 sm:gap-4" style="grid-template-columns: repeat(auto-fill, minmax(168px, 1fr))">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          @click="$emit('add-product', { ...product, override_price: product.unit_price })"
          role="button"
          tabindex="0"
          class="relative flex flex-col items-start p-4 sm:p-5 rounded-2xl border-2 transition duration-150 text-left bg-surface h-full min-h-[152px] sm:min-h-[168px] group"
          :class="[
            Number(product.available_qty ?? 0) > 0
              ? 'border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer'
              : 'border-border/50 opacity-60 cursor-not-allowed bg-bg-secondary pointer-events-none'
          ]"
        >
          <!-- In-cart quantity badge: live feedback that this product is already on the ticket -->
          <div
            v-if="cartQty(product.id) > 0"
            class="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-text-inverse text-xs font-bold shadow-md ring-2 ring-surface z-10"
          >
            {{ cartQty(product.id) }}
          </div>

          <!-- Out-of-stock ribbon -->
          <div v-if="Number(product.available_qty ?? 0) <= 0" class="absolute top-2 right-2 rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-danger">
            Agotado
          </div>

          <div class="mb-2 w-full">
            <span v-if="product.category?.name" class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-bg-secondary text-text-muted mb-1.5 border border-border">
              {{ product.category.name }}
            </span>
            <h4 class="text-sm sm:text-[15px] font-bold text-text line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {{ product.name }}
            </h4>
            <p v-if="product.sku || product.barcode" class="mt-0.5 text-[10px] font-mono text-text-muted/70 truncate">
              {{ product.sku || product.barcode }}
            </p>
          </div>

          <div class="mt-auto w-full space-y-2">
            <p class="text-[11px] font-medium text-text-muted">
              Stock: <span :class="Number(product.available_qty ?? 0) > 5 ? 'text-success' : 'text-warning'">{{ Number(product.available_qty ?? 0) }}</span>
            </p>

            <div class="flex flex-col gap-1.5 w-full">
              <div
                v-if="!isRetailOnly || !product.unit_price_2"
                class="w-full flex flex-col gap-0.5 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-primary"
              >
                <span class="text-[9px] font-bold uppercase text-primary/60">Precio</span>
                <span class="text-sm sm:text-base font-bold leading-tight">{{ formatUSD(product.unit_price) }}</span>
                <span class="text-[10px] text-primary/60 leading-tight">{{ formatVES(product.unit_price) }}</span>
              </div>

              <template v-else>
                <div class="grid grid-cols-2 gap-1.5">
                  <div
                    class="flex flex-col items-center justify-center gap-0.5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg py-2 px-1 transition-colors min-w-0"
                  >
                    <span class="text-[9px] font-bold text-primary/70 uppercase">P1</span>
                    <span class="text-xs sm:text-sm font-bold text-primary leading-tight truncate max-w-full">{{ formatUSD(product.unit_price) }}</span>
                    <span class="text-[9px] text-primary/50 leading-tight truncate max-w-full">{{ formatVES(product.unit_price) }}</span>
                  </div>
                  <button
                    @click.stop="$emit('add-product', { ...product, override_price: product.unit_price_2 })"
                    :disabled="Number(product.available_qty ?? 0) <= 0"
                    class="flex flex-col items-center justify-center gap-0.5 bg-surface hover:bg-bg-secondary border border-border rounded-lg py-2 px-1 transition-colors disabled:opacity-50 min-w-0"
                  >
                    <span class="text-[9px] font-bold text-text-muted uppercase">P2</span>
                    <span class="text-xs sm:text-sm font-bold text-text leading-tight truncate max-w-full">{{ formatUSD(product.unit_price_2) }}</span>
                    <span class="text-[9px] text-text-muted/70 leading-tight truncate max-w-full">{{ formatVES(product.unit_price_2) }}</span>
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'

const props = withDefaults(defineProps<{
  products: any[]
  isRetailOnly?: boolean
  /** productId -> quantity currently in the cart, for the live "already added" badge. */
  cartQuantities?: Record<string, number>
  showSearch?: boolean
}>(), {
  showSearch: true,
})

const emit = defineEmits<{
  'add-product': [product: any]
}>()

const { formatUSD, formatVES } = useCurrency()

const selectedCategory = ref('all')
const search = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const categories = computed(() => {
  const cats = new Set<string>()
  for (const p of props.products) {
    if (p.category?.name) cats.add(p.category.name)
  }
  return Array.from(cats).sort()
})

const filteredProducts = computed(() => {
  let list = selectedCategory.value === 'all' ? props.products : props.products.filter(p => p.category?.name === selectedCategory.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && String(p.sku).toLowerCase().includes(q)) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q))
    )
  }
  return list
})

const cartQty = (productId: string): number => props.cartQuantities?.[productId] ?? 0

/**
 * Scanner-gun workflow: a barcode scanner types the code then sends Enter. An exact
 * sku/barcode match adds and clears immediately so the next scan can start right away.
 * Falls back to "add the only match" for keyboard-only exact-name entry.
 */
const onSearchEnter = () => {
  const q = search.value.trim().toLowerCase()
  if (!q) return
  const exact = props.products.find((p: any) =>
    (p.barcode && String(p.barcode).toLowerCase() === q) ||
    (p.sku && String(p.sku).toLowerCase() === q)
  )
  const target = exact ?? (filteredProducts.value.length === 1 ? filteredProducts.value[0] : null)
  if (!target || Number(target.available_qty ?? 0) <= 0) return
  emit('add-product', { ...target, override_price: target.unit_price })
  search.value = ''
}

defineExpose({
  focusSearch() {
    searchInputRef.value?.focus()
  },
  reset() {
    search.value = ''
    selectedCategory.value = 'all'
  },
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
