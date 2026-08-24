import { ref, computed } from 'vue'
import type { POSProductItem } from '../../types/pos'

export function usePOSCart() {
  const cart = ref<POSProductItem[]>([])
  const productSearch = ref('')

  const productsTotal = computed(() =>
    cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  )

  const addProduct = (product: any, priceIndex: 1 | 2 = 1) => {
    const availableQty = Number(product.available_qty ?? 0)
    if (availableQty <= 0) return

    const effectivePriceIndex: 1 | 2 = product.override_price !== undefined
      ? (product.unit_price_2 != null && Number(product.override_price) === Number(product.unit_price_2) ? 2 : 1)
      : priceIndex

    const uPrice1 = Number(product.unit_price ?? product.price ?? 0)
    const uPrice2 = product.unit_price_2 != null ? Number(product.unit_price_2) : null

    const existing = cart.value.find(c => c.productId === product.id)
    if (existing) {
      if (existing.quantity >= availableQty) return
      existing.quantity++
      existing.priceIndex = effectivePriceIndex
      existing.unitPrice = effectivePriceIndex === 2 && uPrice2 != null ? uPrice2 : uPrice1
      existing.unitPrice1 = uPrice1
      existing.unitPrice2 = uPrice2
      existing.subtotal = existing.unitPrice * existing.quantity
    } else {
      const selectedPrice = effectivePriceIndex === 2 && uPrice2 != null ? uPrice2 : uPrice1
      cart.value.push({
        productId: product.id,
        productName: product.name,
        availableQty,
        variantId: null,
        variantName: null,
        quantity: 1,
        unitPrice: selectedPrice,
        unitPrice1: uPrice1,
        unitPrice2: uPrice2,
        unitCost: Number(product.unit_cost ?? 0),
        subtotal: selectedPrice,
        priceIndex: effectivePriceIndex,
      })
    }
    productSearch.value = ''
  }

  const setPriceIndex = (idx: number, pIndex: 1 | 2) => {
    const item = cart.value[idx]
    if (!item) return
    const p1 = item.unitPrice1 ?? item.unitPrice
    const p2 = item.unitPrice2
    const newPrice = pIndex === 2 && p2 != null ? Number(p2) : Number(p1)
    cart.value[idx] = {
      ...item,
      priceIndex: pIndex,
      unitPrice: newPrice,
      subtotal: newPrice * item.quantity
    }
  }

  const incrementQty = (idx: number) => {
    const item = cart.value[idx]
    if (!item || item.quantity >= item.availableQty) return
    const newQty = item.quantity + 1
    cart.value[idx] = {
      ...item,
      quantity: newQty,
      subtotal: item.unitPrice * newQty
    }
  }

  const decrementQty = (idx: number) => {
    const item = cart.value[idx]
    if (!item || item.quantity <= 1) return
    const newQty = item.quantity - 1
    cart.value[idx] = {
      ...item,
      quantity: newQty,
      subtotal: item.unitPrice * newQty
    }
  }

  /** Exact-entry quantity (typed via keyboard/numpad rather than +/- taps). Clamped to [1, availableQty]. */
  const setQuantity = (idx: number, quantity: number) => {
    const item = cart.value[idx]
    if (!item) return
    const clamped = Math.max(1, Math.min(Math.round(quantity) || 1, item.availableQty || 1))
    cart.value[idx] = {
      ...item,
      quantity: clamped,
      subtotal: item.unitPrice * clamped
    }
  }

  const removeItem = (idx: number) => {
    cart.value.splice(idx, 1)
  }

  const clearCart = () => {
    cart.value = []
    productSearch.value = ''
  }

  /** Bulk-replace the cart — used to restore a held sale exactly as it was left. */
  const loadCart = (items: POSProductItem[]) => {
    cart.value = items
    productSearch.value = ''
  }

  return {
    cart,
    productSearch,
    productsTotal,
    addProduct,
    setPriceIndex,
    incrementQty,
    decrementQty,
    setQuantity,
    removeItem,
    clearCart,
    loadCart,
  }
}
