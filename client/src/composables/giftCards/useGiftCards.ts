import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { giftCardFormSchema } from '../../lib/validation'
import { useBusinessStore } from '../../store/business'
import { giftCardsKeys, listGiftCards, saveGiftCard, deleteGiftCard } from '../../services/giftCardsService'
import type { GiftCard, GiftCardFormData } from '../../types/giftCard'

import { findOrCreateClientByPhone } from '../../services/clientesService'

export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'GC-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function useGiftCards(businessId: import('vue').Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const queryKey = computed(() => giftCardsKeys.all(businessId.value, branchId.value))

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listGiftCards(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value && !!businessStore.features.gift_cards),
  })

  const giftCards = computed(() => data.value ?? [])
  const activeGiftCards = computed(() => giftCards.value.filter(g => g.status === 'active'))
  const usedGiftCards = computed(() => giftCards.value.filter(g => g.status === 'redeemed' || g.status === 'expired'))

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
      showError(translateError(err, 'Error al guardar gift card'))
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
      showError(translateError(err, 'Error al eliminar gift card'))
    },
  })

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const saveError = ref('')
  const formErrors = ref<Record<string, string>>({})

  const saveBuyerAsClient = ref(true)
  const saveRecipientAsClient = ref(true)

  const form = ref<GiftCardFormData>({
    code: '',
    buyerName: '',
    buyerPhone: '',
    recipientName: '',
    recipientPhone: '',
    amount: 0,
    notes: '',
  })

  const resetForm = () => {
    form.value = { code: '', buyerName: '', buyerPhone: '', recipientName: '', recipientPhone: '', amount: 0, notes: '' }
    editingId.value = null
    saveError.value = ''
    formErrors.value = {}
    saveBuyerAsClient.value = true
    saveRecipientAsClient.value = true
  }

  const openNew = () => {
    resetForm()
    form.value.code = generateGiftCardCode()
    showModal.value = true
  }

  const openEdit = (giftCard: GiftCard) => {
    editingId.value = giftCard.id
    form.value = {
      id: giftCard.id,
      code: giftCard.code ?? generateGiftCardCode(),
      buyerName: giftCard.buyerName ?? '',
      buyerPhone: giftCard.buyerPhone ?? '',
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
    formErrors.value = {}

    if (!form.value.code) {
      form.value.code = generateGiftCardCode()
    }

    const parsed = giftCardFormSchema.safeParse(form.value)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (!formErrors.value[field]) {
          formErrors.value[field] = issue.message
        }
      }
      return
    }

    // Auto-save buyer and recipient into clients table if requested
    if (businessId.value) {
      if (saveBuyerAsClient.value && form.value.buyerName.trim() && form.value.buyerPhone.trim()) {
        try {
          await findOrCreateClientByPhone(businessId.value, {
            fullName: form.value.buyerName,
            phone: form.value.buyerPhone,
          }, branchId.value)
        } catch { /* ignore if exists */ }
      }
      if (saveRecipientAsClient.value && form.value.recipientName.trim() && form.value.recipientPhone.trim()) {
        try {
          await findOrCreateClientByPhone(businessId.value, {
            fullName: form.value.recipientName,
            phone: form.value.recipientPhone,
          }, branchId.value)
        } catch { /* ignore if exists */ }
      }
    }

    try {
      await saveMutation.mutateAsync({ ...form.value })
    } catch (err) {
      saveError.value = translateError(err, 'Error al guardar')
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
    activeGiftCards,
    usedGiftCards,
    isLoading,
    saveMutation,
    deleteMutation,
    showModal,
    editingId,
    form,
    saveError,
    formErrors,
    saveBuyerAsClient,
    saveRecipientAsClient,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}
