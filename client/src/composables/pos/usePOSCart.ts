import { ref, computed } from 'vue'
import type { POSProductItem } from '../../types/pos'

export function usePOSCart() {
  const cart = ref<POSProductItem[]>([])
  const productSearch = ref('')

  const productsTotal = computed(() =>
    cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  )

  const addProduct = (product: any) => {
    const availableQty = Number(product.available_qty ?? 0)
    if (availableQty <= 0) return

    const existing = cart.value.find(c => c.productId === product.id)
    if (existing) {
      if (existing.quantity >= availableQty) return
      existing.quantity++
      existing.subtotal = existing.unitPrice * existing.quantity
    } else {
      cart.value.push({
        productId: product.id,
        productName: product.name,
        availableQty,
        variantId: null,
        variantName: null,
        quantity: 1,
        unitPrice: Number(product.unit_price ?? product.price ?? 0),
        unitCost: Number(product.unit_cost ?? 0),
        subtotal: Number(product.unit_price ?? product.price ?? 0),
      })
    }
    productSearch.value = ''
  }

  const incrementQty = (idx: number) => {
    if (cart.value[idx].quantity >= cart.value[idx].availableQty) return
    cart.value[idx].quantity++
    cart.value[idx].subtotal = cart.value[idx].unitPrice * cart.value[idx].quantity
  }

  const decrementQty = (idx: number) => {
    if (cart.value[idx].quantity > 1) {
      cart.value[idx].quantity--
      cart.value[idx].subtotal = cart.value[idx].unitPrice * cart.value[idx].quantity
    }
  }

  const removeItem = (idx: number) => {
    cart.value.splice(idx, 1)
  }

  const clearCart = () => {
    cart.value = []
    productSearch.value = ''
  }

  return {
    cart,
    productSearch,
    productsTotal,
    addProduct,
    incrementQty,
    decrementQty,
    removeItem,
    clearCart,
  }
}
