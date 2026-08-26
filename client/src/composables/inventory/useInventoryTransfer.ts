import { ref, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { useBusinessStore } from '../../store/business'
import { transferStock, inventarioKeys } from '../../services/inventarioService'
import { productosKeys } from '../../services/productosService'
import { posKeys } from '../../services/posService'
import type { Producto } from '../../types/producto'

export function useInventoryTransfer() {
  const { authStore } = useAuth()
  const { success, error: showError } = useNotification()
  const queryClient = useQueryClient()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const transferModalOpen = ref(false)
  const transferProduct = ref<Producto | null>(null)
  const transferFromBranchId = ref<string>('')
  const transferToBranchId = ref<string>('')
  const transferQuantity = ref(0)
  const transferNotes = ref('')

  const transferMutation = useMutation({
    mutationFn: (params: { productId: string; fromBranchId: string; toBranchId: string; quantity: number; notes: string }) =>
      transferStock(params.productId, params.fromBranchId, params.toBranchId, params.quantity, params.notes),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ exact: false, queryKey: productosKeys.all(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.all(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: inventarioKeys.movements(businessId.value, branchId.value) }),
        queryClient.invalidateQueries({ exact: false, queryKey: posKeys.products(businessId.value, branchId.value) }),
      ])
      closeTransferModal()
      success('Stock transferido correctamente')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al transferir el stock'))
    },
  })

  const openTransferModal = (producto: Producto) => {
    transferProduct.value = producto
    transferFromBranchId.value = businessStore.currentBranchId ?? businessStore.branches[0]?.id ?? ''
    transferToBranchId.value = ''
    transferQuantity.value = 0
    transferNotes.value = ''
    transferModalOpen.value = true
  }

  const closeTransferModal = () => {
    transferModalOpen.value = false
    transferProduct.value = null
    transferFromBranchId.value = ''
    transferToBranchId.value = ''
    transferQuantity.value = 0
    transferNotes.value = ''
  }

  const confirmTransfer = async () => {
    if (!transferProduct.value) return
    const qty = Number(transferQuantity.value)
    if (!qty || qty <= 0) {
      showError('Ingresa una cantidad válida')
      return
    }
    if (!transferFromBranchId.value || !transferToBranchId.value) {
      showError('Elige sucursal de origen y destino')
      return
    }
    if (transferFromBranchId.value === transferToBranchId.value) {
      showError('La sucursal de origen y destino no pueden ser la misma')
      return
    }
    await transferMutation.mutateAsync({
      productId: transferProduct.value.id,
      fromBranchId: transferFromBranchId.value,
      toBranchId: transferToBranchId.value,
      quantity: qty,
      notes: transferNotes.value,
    })
  }

  return {
    transferModalOpen,
    transferProduct,
    transferFromBranchId,
    transferToBranchId,
    transferQuantity,
    transferNotes,
    transferMutation,
    openTransferModal,
    closeTransferModal,
    confirmTransfer,
  }
}
