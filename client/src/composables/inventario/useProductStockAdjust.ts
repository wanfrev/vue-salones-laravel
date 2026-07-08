import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { useBusinessStore } from '../../store/business'
import { adjustInventory, inventarioKeys } from '../../services/inventarioService'
import { productosKeys } from '../../services/productosService'
import { posKeys } from '../../services/posService'
import { validateAdjustQuantity } from '../../business/stockRules'
import type { Producto } from '../../types/producto'

export function useProductStockAdjust() {
  const { authStore } = useAuth()
  const { success, error: showError } = useNotification()
  const queryClient = useQueryClient()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const adjustModalOpen = ref(false)
  const adjustProduct = ref<Producto | null>(null)
  const adjustQuantity = ref(0)
  const adjustNotes = ref('')

  const adjustMutation = useMutation({
    mutationFn: (params: { productId: string; quantity: number; notes: string }) =>
      adjustInventory(businessId.value!, params.productId, params.quantity, params.notes, undefined, branchId.value),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: productosKeys.all(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.all(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.movements(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
      ])
      closeAdjustModal()
      success('Stock ajustado correctamente')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al ajustar el stock'))
    },
  })

  const openAdjustModal = (producto: Producto) => {
    adjustProduct.value = producto
    adjustQuantity.value = 0
    adjustNotes.value = ''
    adjustModalOpen.value = true
  }

  const closeAdjustModal = () => {
    adjustModalOpen.value = false
    adjustProduct.value = null
    adjustQuantity.value = 0
    adjustNotes.value = ''
  }

  const confirmAdjust = async () => {
    if (!adjustProduct.value) return
    const qty = Number(adjustQuantity.value)
    try {
      validateAdjustQuantity(qty)
    } catch (err) {
      showError(translateError(err, 'Cantidad inválida'))
      return
    }
    await adjustMutation.mutateAsync({
      productId: adjustProduct.value.id,
      quantity: qty,
      notes: adjustNotes.value,
    })
  }

  return {
    adjustModalOpen,
    adjustProduct,
    adjustQuantity,
    adjustNotes,
    adjustMutation,
    openAdjustModal,
    closeAdjustModal,
    confirmAdjust,
  }
}
