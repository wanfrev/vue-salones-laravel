import { computed, ref } from 'vue'
import type { PaymentMethod } from '../../types/database'
import type { PaymentBreakdownItem } from '../../types/pos'
import type { TransactionRow } from '../composables/finanzas/useFinancialSummary'

type Currency = 'USD' | 'VES'

export function useTransactionEdit(
  showError: (msg: string) => void,
) {
  const showEditModal = ref(false)
  const editingTransaction = ref<TransactionRow | null>(null)
  const editingAmount = ref(0)
  const editingCurrency = ref<Currency>('USD')
  const editingExchangeRate = ref(1)
  const editingMethod = ref<PaymentMethod>('cash')
  const editingBreakdown = ref<PaymentBreakdownItem[]>([])
  const editingNotes = ref('')

  const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Efectivo ($)' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'pago_movil', label: 'Pago Móvil' },
    { value: 'punto_venta', label: 'Punto de Venta (Bs)' },
    { value: 'mixed', label: 'Mixto' },
    { value: 'other', label: 'Otro' },
  ]

  const isEditingMixed = computed(() => editingMethod.value === 'mixed')

  const editingTotalAmount = computed(() => {
    if (editingMethod.value === 'mixed') {
      return editingBreakdown.value.reduce((sum, item) => sum + item.amount, 0)
    }
    return editingAmount.value
  })

  const startEdit = (tx: TransactionRow) => {
    editingTransaction.value = tx
    editingCurrency.value = (tx.primaryCurrency as Currency) || 'USD'
    editingExchangeRate.value = tx.exchangeRateUsed ?? 1
    editingAmount.value = editingCurrency.value === 'VES' ? (tx.primaryAmount ?? tx.amount) : tx.amount
    editingMethod.value = tx.rawMethod
    editingNotes.value = tx.notes ?? ''

    if (tx.breakdown && tx.breakdown.length > 0) {
      editingBreakdown.value = tx.breakdown.map((item: PaymentBreakdownItem) => ({ ...item }))
    } else {
      editingBreakdown.value = tx.rawMethod !== 'mixed'
        ? []
        : [{ method: 'cash' as PaymentMethod, inputAmount: editingAmount.value, currency: editingCurrency.value, amount: editingAmount.value }]
    }

    showEditModal.value = true
  }

  const setEditingCurrency = (currency: Currency) => {
    if (currency === editingCurrency.value) return
    const rate = editingExchangeRate.value
    if (currency === 'VES') {
      editingAmount.value = parseFloat((editingAmount.value * rate).toFixed(2))
    } else {
      editingAmount.value = parseFloat((editingAmount.value / rate).toFixed(2))
    }
    editingCurrency.value = currency
  }

  const cancelEdit = () => {
    showEditModal.value = false
    editingTransaction.value = null
    editingAmount.value = 0
    editingMethod.value = 'cash'
    editingBreakdown.value = []
    editingNotes.value = ''
  }

  const setEditingMethod = (method: PaymentMethod) => {
    editingMethod.value = method
    if (method === 'mixed' && editingBreakdown.value.length === 0) {
      editingBreakdown.value = [{ method: 'cash' as PaymentMethod, inputAmount: editingAmount.value, currency: editingCurrency.value, amount: editingAmount.value }]
    }
    if (method !== 'mixed') {
      editingAmount.value = editingTotalAmount.value
    }
  }

  const updateBreakdownItem = (index: number, field: 'method' | 'amount', value: PaymentMethod | number) => {
    const items = [...editingBreakdown.value]
    if (field === 'method') {
      items[index] = { ...items[index], method: value as PaymentMethod }
    } else {
      const numValue = value as number
      items[index] = { ...items[index], inputAmount: numValue, amount: numValue }
    }
    editingBreakdown.value = items
  }

  const addBreakdownItem = () => {
    editingBreakdown.value = [...editingBreakdown.value, { method: 'cash' as PaymentMethod, inputAmount: 0, currency: editingCurrency.value, amount: 0 }]
  }

  const removeBreakdownItem = (index: number) => {
    editingBreakdown.value = editingBreakdown.value.filter((_, i) => i !== index)
    if (editingBreakdown.value.length <= 1 && editingMethod.value === 'mixed') {
      editingMethod.value = editingBreakdown.value[0]?.method ?? 'cash'
    }
  }

  const saveEdit = (
    onSave: (params: { transactionId: string; amount: number; method: PaymentMethod; notes?: string; paymentsBreakdown?: PaymentBreakdownItem[] }) => void,
  ) => {
    if (!editingTransaction.value) return
    const displayTotal = editingTotalAmount.value
    if (displayTotal <= 0) {
      showError('El monto debe ser mayor a 0')
      return
    }

    const rate = editingExchangeRate.value
    const usdTotal = editingCurrency.value === 'VES' ? parseFloat((displayTotal / rate).toFixed(2)) : displayTotal

    const effectiveMethod: PaymentMethod = editingBreakdown.value.length > 1
      ? 'mixed'
      : editingMethod.value

    const breakdown = effectiveMethod === 'mixed' && editingBreakdown.value.length > 0
      ? editingBreakdown.value.map(item => {
          const itemUsd = editingCurrency.value === 'VES' ? parseFloat((item.amount / rate).toFixed(2)) : item.amount
          return {
            method: item.method,
            inputAmount: item.amount,
            currency: editingCurrency.value,
            amount: itemUsd,
          }
        })
      : undefined

    onSave({
      transactionId: editingTransaction.value.id,
      amount: usdTotal,
      method: effectiveMethod,
      notes: editingNotes.value || undefined,
      paymentsBreakdown: breakdown,
    })
    cancelEdit()
  }

  const confirmDeleteTransaction = (
    txId: string,
    onDelete: (txId: string) => void,
  ) => {
    if (window.confirm('¿Eliminar este cobro?\n\nSe revertirá el inventario si aplica. Esta acción no se puede deshacer.')) {
      onDelete(txId)
    }
  }

  return {
    showEditModal,
    editingTransaction,
    editingAmount,
    editingCurrency,
    setEditingCurrency,
    editingMethod,
    editingBreakdown,
    editingNotes,
    isEditingMixed,
    editingTotalAmount,
    paymentMethodOptions,
    startEdit,
    cancelEdit,
    setEditingMethod,
    updateBreakdownItem,
    addBreakdownItem,
    removeBreakdownItem,
    saveEdit,
    confirmDeleteTransaction,
  }
}
