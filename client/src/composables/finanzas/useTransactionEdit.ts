import { ref } from 'vue'
import type { PaymentBreakdownItem } from '../../types/pos'

export function useTransactionEdit(_showError: (msg: string) => void) {
  const showEditModal = ref(false)
  const editingTransaction = ref<any>(null)
  const editingAmount = ref(0)
  const editingCurrency = ref<'USD' | 'VES'>('USD')
  const editingMethod = ref('')
  const editingBreakdown = ref<PaymentBreakdownItem[]>([])
  const editingNotes = ref('')
  const isEditingMixed = ref(false)
  const editingTotalAmount = ref(0)
  const paymentMethodOptions = ref<{ label: string; value: string }[]>([])

  const setEditingCurrency = (_v: 'USD' | 'VES') => {}

  const startEdit = (_item: any) => {
    showEditModal.value = true
  }

  const cancelEdit = () => {
    showEditModal.value = false
  }

  const setEditingMethod = (_v: string) => {}

  const updateBreakdownItem = (_idx: number, _data: any) => {}
  const addBreakdownItem = () => {}
  const removeBreakdownItem = (_idx: number) => {}

  const saveEdit = (_callback: (params: any) => void) => {}

  const confirmDeleteTransaction = (_txId: string, _deleteFn: (id: string) => void) => {}

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
