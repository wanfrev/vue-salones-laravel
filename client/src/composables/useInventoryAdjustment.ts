import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from './useAuth'
import { useNotification } from './useNotification'
import { useBusinessStore } from '../store/business'
import { adjustInventory, inventarioKeys } from '../services/inventarioService'
import { posKeys } from '../services/posService'
import { validateAdjustQuantity } from '../business/stockRules'
import type { InventarioItem } from '../types/inventario'

export function useInventoryAdjustment() {
  const { authStore } = useAuth()
  const { success, error: showError } = useNotification()
  const queryClient = useQueryClient()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const adjustModalOpen = ref(false)
  const adjustItem = ref<InventarioItem | null>(null)
  const adjustQuantity = ref(0)
  const adjustNotes = ref('')

  const adjustMutation = useMutation({
    mutationFn: (params: { productId: string; quantity: number; notes: string; variantId?: string | null }) =>
      adjustInventory(businessId.value!, params.productId, params.quantity, params.notes, params.variantId, branchId.value),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.all(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.movements(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
      ])
      closeAdjustModal()
      success('Stock ajustado correctamente')
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Error al ajustar el stock')
    },
  })

  const openAdjustModal = (item: InventarioItem) => {
    adjustItem.value = item
    adjustQuantity.value = 0
    adjustNotes.value = ''
    adjustModalOpen.value = true
  }

  const closeAdjustModal = () => {
    adjustModalOpen.value = false
    adjustItem.value = null
    adjustQuantity.value = 0
    adjustNotes.value = ''
  }

  const confirmAdjust = async () => {
    if (!adjustItem.value) return
    const qty = Number(adjustQuantity.value)
    try {
      validateAdjustQuantity(qty)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Cantidad inválida')
      return
    }
    await adjustMutation.mutateAsync({
      productId: adjustItem.value.productId,
      quantity: qty,
      notes: adjustNotes.value,
      variantId: adjustItem.value.variantId,
    })
  }

  return {
    adjustModalOpen,
    adjustItem,
    adjustQuantity,
    adjustNotes,
    adjustMutation,
    openAdjustModal,
    closeAdjustModal,
    confirmAdjust,
  }
}
