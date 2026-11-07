import { ref, computed, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { giftCardFormSchema } from '../../lib/validation'
import { useBusinessStore } from '../../store/business'
import {
  giftCardsKeys, listGiftCards, saveGiftCard, deleteGiftCard, saveGiftCardPayment, deleteGiftCardPayment,
  type GiftCardPaymentPayload,
} from '../../services/giftCardsService'
import { amountForUsd, paymentError, toPayload, type PaymentLine } from '../../lib/giftCardPayment'
import { useAuthStore } from '../../store/auth'
import { useBanks } from '../finanzas/useBanks'
import { useCurrency } from '../common/useCurrency'
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
  const authStore = useAuthStore()
  const { banks } = useBanks()
  const { exchangeRate } = useCurrency()
  const branchId = computed(() => businessStore.currentBranchId)

  // Misma regla que «Fecha del cobro» en el POS y los abonos de crédito (el servidor la vuelve a exigir).
  const canBackdate = computed(() =>
    !!businessStore.features.pos_backdate_enabled && ['admin', 'superadmin', 'encargado'].includes(authStore.role ?? ''))

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
    mutationFn: (params: { form: GiftCardFormData; payment: GiftCardPaymentPayload | null }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveGiftCard(businessId.value, params.form, branchId.value, params.payment)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: giftCardsKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['daily-reports'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['daily-reports-dashboard'], exact: false }),
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

  // Registrar el cobro de una gift card ya creada (las que se vendieron antes, o si se omitió al crearla).
  const paymentTarget = ref<GiftCard | null>(null)

  const invalidate = () => Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: giftCardsKeys.all(businessId.value, branchId.value), exact: false }),
    // El cobro de una gift card entra al Cuadre del Día.
    queryClient.invalidateQueries({ queryKey: ['daily-reports'], exact: false }),
    queryClient.invalidateQueries({ queryKey: ['daily-reports-dashboard'], exact: false }),
  ])

  const savePaymentMutation = useMutation({
    mutationFn: (params: { id: string; payment: GiftCardPaymentPayload }) => saveGiftCardPayment(params.id, params.payment),
    onSuccess: () => {
      invalidate()
      success('Cobro registrado')
      paymentTarget.value = null
    },
    onError: (err: unknown) => showError(translateError(err, 'Error al registrar el cobro')),
  })

  const removePaymentMutation = useMutation({
    mutationFn: (id: string) => deleteGiftCardPayment(id),
    onSuccess: () => {
      invalidate()
      success('Cobro quitado')
    },
    onError: (err: unknown) => showError(translateError(err, 'Error al quitar el cobro')),
  })

  const handleRemovePayment = (gc: GiftCard) => {
    if (window.confirm('¿Quitar el cobro registrado de esta gift card? Deja de contarse en el Cuadre del Día; la gift card se queda.')) {
      removePaymentMutation.mutate(gc.id)
    }
  }

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

  // Cobro de una gift card NUEVA: empieza en efectivo por el monto y sigue al monto mientras no se toque.
  const newPaymentLines = () => [{ method: 'cash', amount: null, bankId: null } as PaymentLine]
  const paymentLines = ref<PaymentLine[]>(newPaymentLines())
  const paymentRate = ref(exchangeRate.value || 0)
  const skipPayment = ref(false)
  let syncedAmount: number | null = null

  watch(() => form.value.amount, (amount) => {
    const only = paymentLines.value.length === 1 ? paymentLines.value[0] : null
    if (!only || !(amount > 0)) return
    // Solo se acomoda si la persona no escribió otro monto en esa línea.
    if (only.amount == null || only.amount === syncedAmount) {
      syncedAmount = amountForUsd(only.method, amount, paymentRate.value)
      paymentLines.value = [{ ...only, amount: syncedAmount }]
    }
  })

  const resetForm = () => {
    paymentLines.value = newPaymentLines()
    paymentRate.value = exchangeRate.value || 0
    skipPayment.value = false
    syncedAmount = null
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

    // Al crear, hay que decir cómo se pagó (o marcar que se registra después): ese dinero entra al Cuadre del Día.
    let payment: GiftCardPaymentPayload | null = null
    if (!editingId.value && !skipPayment.value) {
      const problem = paymentError(paymentLines.value, paymentRate.value, form.value.amount)
      if (problem) {
        saveError.value = problem
        return
      }
      payment = toPayload(paymentLines.value, paymentRate.value)
    }

    try {
      await saveMutation.mutateAsync({ form: { ...form.value }, payment })
    } catch (err) {
      saveError.value = translateError(err, 'Error al guardar')
      throw err
    }
  }

  const handleDelete = (gc: GiftCard) => {
    const withPayment = gc.payment ? ' También se quita el cobro registrado, que deja de contarse en el Cuadre del Día.' : ''
    if (window.confirm(`¿Eliminar esta gift card? Esta acción no se puede deshacer.${withPayment}`)) {
      deleteMutation.mutate(gc.id)
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
    paymentLines,
    paymentRate,
    skipPayment,
    banks,
    canBackdate,
    exchangeRate,
    paymentTarget,
    savePaymentMutation,
    handleRemovePayment,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}
