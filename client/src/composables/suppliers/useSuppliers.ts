import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { resolvePeriodDates } from '../../lib/periodUtils'
import { useCurrency } from '../common/useCurrency'
import { useBusinessStore } from '../../store/business'
import {
  supplierKeys,
  supplierPaymentKeys,
  listSuppliers,
  listSupplierPayments,
  saveSupplier,
  deleteSupplier,
  createSupplierPayment,
  deleteSupplierPayment,
  type SupplierRow,
  type SupplierFormData,
  type SupplierPaymentFormData,
} from '../../services/suppliersService'

export function useSuppliers(businessId: import('vue').Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const { data, isLoading } = useQuery({
    queryKey: computed(() => supplierKeys.all(businessId.value, branchId.value)),
    queryFn: () => listSuppliers(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value),
  })

  const suppliers = computed(() => data.value ?? [])

  const saveMutation = useMutation({
    mutationFn: (formData: SupplierFormData & { id?: string }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveSupplier(businessId.value, formData, branchId.value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all(businessId.value, branchId.value), exact: false }).catch(() => {})
      success('Proveedor guardado correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al guardar el proveedor'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all(businessId.value, branchId.value), exact: false }).catch(() => {})
      success('Proveedor eliminado correctamente')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al eliminar el proveedor'))
    },
  })

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const saveError = ref('')

  const form = ref<SupplierFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    totalDebt: 0,
    debtCurrency: 'USD',
    notes: '',
  })

  const resetForm = () => {
    form.value = {
      firstName: '',
      lastName: '',
      phone: '',
      company: '',
      totalDebt: 0,
      debtCurrency: 'USD',
      notes: '',
    }
    editingId.value = null
    saveError.value = ''
  }

  const openNew = () => {
    resetForm()
    showModal.value = true
  }

  const openEdit = (supplier: SupplierRow) => {
    editingId.value = supplier.id
    form.value = {
      firstName: supplier.firstName,
      lastName: supplier.lastName,
      phone: supplier.phone,
      company: supplier.company,
      totalDebt: supplier.debtCurrency === 'VES' ? supplier.debtOriginalAmount : supplier.totalDebt,
      debtCurrency: supplier.debtCurrency,
      notes: supplier.notes,
    }
    saveError.value = ''
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
      await saveMutation.mutateAsync({ ...form.value, id: editingId.value ?? undefined })
    } catch (err) {
      saveError.value = translateError(err, 'Error al guardar el proveedor')
      throw err
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este proveedor? Se marcará como inactivo.')) {
      deleteMutation.mutate(id)
    }
  }

  return {
    suppliers,
    isLoading,
    saveMutation,
    deleteMutation,
    saveError,
    showModal,
    editingId,
    form,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}

export function useSupplierPayments(
  businessId: import('vue').Ref<string | null>,
  selectedPeriod?: import('vue').Ref<'month' | 'quarter' | 'year'>,
  selectedMonth?: import('vue').Ref<string>,
) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const { exchangeRate } = useCurrency()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const periodDates = computed(() => {
    if (!selectedPeriod) return { start: '', end: '' }
    return resolvePeriodDates(selectedPeriod.value, selectedMonth?.value)
  })

  const queryKey = computed(() =>
    supplierPaymentKeys.filtered(businessId.value, branchId.value, periodDates.value.start, periodDates.value.end)
  )

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey,
    queryFn: () => listSupplierPayments(businessId.value!, branchId.value, periodDates.value.start, periodDates.value.end),
    enabled: computed(() => !!businessId.value),
  })

  const payments = computed(() => data.value ?? [])

  const { data: suppliersData } = useQuery({
    queryKey: computed(() => supplierKeys.all(businessId.value, branchId.value)),
    queryFn: () => listSuppliers(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value),
  })

  const supplierOptions = computed(() =>
    (suppliersData.value ?? []).map(s => ({ id: s.id, name: s.fullName }))
  )

  const createMutation = useMutation({
    mutationFn: (formData: SupplierPaymentFormData) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return createSupplierPayment(businessId.value, formData, branchId.value, exchangeRate.value)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: supplierPaymentKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value], exact: false }),
      ])
      success('Abono registrado correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al registrar el abono'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplierPayment(id),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: supplierPaymentKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.all(businessId.value, branchId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary', businessId.value], exact: false }),
      ])
      success('Abono eliminado correctamente')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al eliminar el abono'))
    },
  })

  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const showModal = ref(false)
  const saveError = ref('')

  const form = ref<SupplierPaymentFormData>({
    supplierId: '',
    amount: 0,
    currency: 'USD',
    paymentMethod: 'cash',
    paymentDate: todayStr(),
    notes: '',
  })

  const resetForm = () => {
    form.value = {
      supplierId: '',
      amount: 0,
      currency: 'USD',
      paymentMethod: 'cash',
      paymentDate: todayStr(),
      notes: '',
    }
    saveError.value = ''
  }

  const openNew = () => {
    resetForm()
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    resetForm()
  }

  const handleSave = async () => {
    if (createMutation.isPending.value) return
    saveError.value = ''
    try {
      await createMutation.mutateAsync({ ...form.value })
    } catch (err) {
      saveError.value = translateError(err, 'Error al registrar el abono')
      throw err
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este abono? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id)
    }
  }

  const paymentTotal = computed(() =>
    payments.value.reduce((sum, p) => sum + p.amount, 0)
  )

  const paymentsBySupplier = computed(() => {
    const map: Record<string, number> = {}
    for (const p of payments.value) {
      map[p.supplierId] = (map[p.supplierId] ?? 0) + p.amount
    }
    return map
  })

  const supplierMap = computed(() => {
    const map: Record<string, { totalDebt: number; name: string }> = {}
    for (const s of (suppliersData.value ?? [])) {
      map[s.id] = { totalDebt: s.totalDebt, name: s.fullName }
    }
    return map
  })

  const selectedSupplierPendingBalance = computed(() => {
    const sid = form.value.supplierId
    if (!sid) return 0
    const supplier = supplierMap.value[sid]
    if (!supplier) return 0
    const paid = paymentsBySupplier.value[sid] ?? 0
    return Math.max(0, supplier.totalDebt - paid)
  })

  const selectedSupplierPendingAfter = computed(() => {
    const pending = selectedSupplierPendingBalance.value
    if (!pending) return 0
    const isVES = form.value.currency === 'VES'
    const currentAmount = form.value.amount || 0
    if (!currentAmount) return pending
    const rate = exchangeRate.value > 0 ? exchangeRate.value : 1
    const currentAmountUSD = isVES ? currentAmount / rate : currentAmount
    return Math.max(0, pending - currentAmountUSD)
  })

  return {
    payments,
    paymentTotal,
    isLoading,
    isError,
    queryError,
    supplierOptions,
    supplierMap,
    selectedSupplierPendingBalance,
    selectedSupplierPendingAfter,
    createMutation,
    deleteMutation,
    saveError,
    showModal,
    form,
    openNew,
    closeModal,
    handleSave,
    handleDelete,
  }
}
