import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { useBusinessStore } from '../../store/business'
import { giftCardsKeys, listGiftCards, saveGiftCard, deleteGiftCard } from '../../services/giftCardsService'
import type { GiftCard, GiftCardFormData } from '../../types/giftCard'

export function useGiftCards(businessId: import('vue').Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const queryKey = computed(() => giftCardsKeys.all(businessId.value, branchId.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listGiftCards(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value),
  })

  const giftCards = computed(() => data.value ?? [])

  const saveMutation = useMutation({
    mutationFn: (form: GiftCardFormData) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveGiftCard(businessId.value, form, branchId.value)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: giftCardsKeys.all(businessId.value, branchId.value), exact: false }),
      ])
      success('Gift card guardada correctamente')
      closeModal()
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al guardar gift card')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGiftCard(id),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: giftCardsKeys.all(businessId.value, branchId.value), exact: false }),
      ])
      success('Gift card eliminada correctamente')
    },
    onError: (err: unknown) => {
      showError(err instanceof Error ? err.message : 'Error al eliminar gift card')
    },
  })

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const saveError = ref('')

  const form = ref<GiftCardFormData>({
    recipientName: '',
    recipientPhone: '',
    amount: 0,
    notes: '',
  })

  const resetForm = () => {
    form.value = { recipientName: '', recipientPhone: '', amount: 0, notes: '' }
    editingId.value = null
    saveError.value = ''
  }

  const openNew = () => {
    resetForm()
    showModal.value = true
  }

  const openEdit = (giftCard: GiftCard) => {
    editingId.value = giftCard.id
    form.value = {
      id: giftCard.id,
      recipientName: giftCard.recipientName,
      recipientPhone: giftCard.recipientPhone ?? '',
      amount: giftCard.amount,
      notes: giftCard.notes ?? '',
      status: giftCard.status,
    }
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    resetForm()
  }

  const handleSave = async () => {
    if (saveMutation.isPending.value) return
    saveError.value = ''
    try {
      await saveMutation.mutateAsync({ ...form.value })
    } catch (err) {
      saveError.value = err instanceof Error ? err.message : 'Error al guardar'
      throw err
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar esta gift card? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id)
    }
  }

  return {
    giftCards,
    isLoading,
    saveMutation,
    deleteMutation,
    showModal,
    editingId,
    form,
    saveError,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}
