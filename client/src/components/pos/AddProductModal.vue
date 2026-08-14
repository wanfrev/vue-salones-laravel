<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" @click.self="$emit('close')">
        <Transition
          enter-active-class="transition-transform duration-150 ease-out"
          enter-from-class="translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="translate-y-0 sm:scale-100"
          leave-active-class="transition-transform duration-100 ease-in"
          leave-from-class="translate-y-0 sm:scale-100"
          leave-to-class="translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div v-if="show" class="flex h-[85vh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl sm:h-[80vh] sm:max-w-3xl sm:rounded-2xl">
            <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 class="text-sm font-bold text-text">Agregar producto</h3>
                <p v-if="clientName" class="text-xs text-text-muted">A la cuenta de <span class="font-medium text-text">{{ clientName }}</span></p>
              </div>
              <button @click="$emit('close')" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="min-h-0 flex-1 p-3 sm:p-4">
              <RetailProductGrid
                ref="gridRef"
                :products="products"
                :cart-quantities="cartQuantities"
                :is-retail-only="false"
                @add-product="$emit('add-product', $event)"
                class="h-full"
              />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import RetailProductGrid from './RetailProductGrid.vue'

const props = defineProps<{
  show: boolean
  products: any[]
  cartQuantities?: Record<string, number>
  clientName?: string | null
}>()

defineEmits<{
  'add-product': [product: any]
  close: []
}>()

const gridRef = ref<InstanceType<typeof RetailProductGrid> | null>(null)

watch(() => props.show, async (open) => {
  if (!open) return
  await nextTick()
  gridRef.value?.reset()
  gridRef.value?.focusSearch()
})
</script>
