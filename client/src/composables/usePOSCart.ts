import { ref, computed } from 'vue'
import type { POSProductItem } from '../types/pos'
import { useNotification } from './useNotification'

export function usePOSCart() {
  const cart = ref<POSProductItem[]>([])
  const productSearch = ref('')
  const { error: showError } = useNotification()

  const productsTotal = computed(() =>
    cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  )

  const addProduct = (product: any) => {
    const availableQty = Number(product.available_qty ?? 0)
    if (availableQty <= 0) {
      showError('Este producto no tiene stock disponible')
      return
    }

    const existing = cart.value.find(c => c.productId === product.id)
    if (existing) {
      if (existing.quantity >= existing.availableQty) {
        showError('No puedes agregar mas de lo disponible en inventario')
        return
      }
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
        unitPrice: Number(product.unit_price),
        unitCost: Number(product.unit_cost),
        subtotal: Number(product.unit_price),
      })
    }
    productSearch.value = ''
  }

  const incrementQty = (idx: number) => {
      if (cart.value[idx].quantity >= cart.value[idx].availableQty) {
        showError('No puedes superar la cantidad disponible')
        return
      }
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