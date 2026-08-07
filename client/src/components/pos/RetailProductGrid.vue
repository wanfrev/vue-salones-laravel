<template>
  <div class="flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden mt-4 shadow-sm">
    <div class="px-3 sm:px-4 py-3 border-b border-border bg-bg-secondary flex gap-2 overflow-x-auto no-scrollbar touch-pan-x">
      <button
        @click="selectedCategory = 'all'"
        class="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        :class="selectedCategory === 'all' ? 'bg-primary text-text-inverse shadow-md shadow-primary/20' : 'bg-surface border border-border text-text-secondary hover:text-text hover:border-primary/50'"
      >
        Todos
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        @click="selectedCategory = cat"
        class="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
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
        <p class="text-sm font-medium">No hay productos en esta categoría</p>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          @click="$emit('add-product', { ...product, override_price: product.unit_price })"
          role="button"
          tabindex="0"
          class="relative flex flex-col items-start p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 text-left bg-surface h-full min-h-[152px] sm:min-h-[168px] group active:scale-[0.97]"
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
                class="w-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-2 text-primary"
              >
                <span class="text-[9px] font-bold uppercase">Precio</span>
                <span class="text-sm sm:text-base font-bold">{{ formatDual(product.unit_price) }}</span>
              </div>

              <template v-else>
                <div class="grid grid-cols-2 gap-1.5">
                  <div
                    class="flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg py-1.5 px-1 transition-colors"
                  >
                    <span class="text-[9px] font-bold text-primary/70 uppercase">P1</span>
                    <span class="text-xs sm:text-sm font-bold text-primary">{{ formatDual(product.unit_price) }}</span>
                  </div>
                  <button
                    @click.stop="$emit('add-product', { ...product, override_price: product.unit_price_2 })"
                    :disabled="Number(product.available_qty ?? 0) <= 0"
                    class="flex flex-col items-center justify-center bg-surface hover:bg-bg-secondary border border-border rounded-lg py-1.5 px-1 transition-colors disabled:opacity-50"
                  >
                    <span class="text-[9px] font-bold text-text-muted uppercase">P2</span>
                    <span class="text-xs sm:text-sm font-bold text-text">{{ formatDual(product.unit_price_2) }}</span>
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

const props = defineProps<{
  products: any[]
  isRetailOnly?: boolean
  /** productId -> quantity currently in the cart, for the live "already added" badge. */
  cartQuantities?: Record<string, number>
}>()

defineEmits<{
  'add-product': [product: any]
}>()

const { formatDual } = useCurrency()

const selectedCategory = ref('all')

const categories = computed(() => {
  const cats = new Set<string>()
  for (const p of props.products) {
    if (p.category?.name) cats.add(p.category.name)
  }
  return Array.from(cats).sort()
})

const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') return props.products
  return props.products.filter(p => p.category?.name === selectedCategory.value)
})

const cartQty = (productId: string): number => props.cartQuantities?.[productId] ?? 0
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
