import { computed, ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { api as supabase } from '../../lib/api'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { useCurrency } from '../common/useCurrency'
import { useBusinessStore } from '../../store/business'
import {
  listEmployeePayments,
  createEmployeePayment,
  createEmployeeConsumption,
  updateEmployeePayment,
  deleteEmployeePayment,
  employeePaymentKeys,
} from '../../services/employeePaymentsService'

interface EmployeeOption {
  id: string
  name: string
}

function localDateStr(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function useEmployeePayments(
  businessId: import('vue').Ref<string | null>,
  periodDates?: import('vue').Ref<{ start: string; end: string }>,
) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const { employeeRate } = useCurrency()
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)
  const employeePaymentsRate = computed(() => employeeRate.value)

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: computed(() => [
      ...employeePaymentKeys.all(businessId.value, branchId.value),
      periodDates?.value.start ?? null,
      periodDates?.value.end ?? null,
    ] as const),
    queryFn: () => listEmployeePayments(
      businessId.value!,
      branchId.value,
      periodDates?.value.start,
      periodDates?.value.end,
    ),
    enabled: computed(() => !!businessId.value),
  })

  const paymentsMade = computed(() => paymentsData.value ?? [])

  const createMutation = useMutation({
    mutationFn: (params: {
      employeeId: string
      amount: number
      method: string
      notes: string
      date: string
      currency: 'USD' | 'VES'
    }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return createEmployeePayment(
        businessId.value,
        params.employeeId,
        params.amount,
        params.method,
        params.notes,
        params.date,
        params.currency,
        employeePaymentsRate.value,
        branchId.value,
      )
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['employee-payments', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-history', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-employee-payments'], exact: false }),
      ])
      await queryClient.refetchQueries({ queryKey: ['employee-payments', businessId.value], exact: false })
      success('Pago registrado correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al registrar el pago'))
    },
  })

  const paymentError = ref('')

  const showPaymentModal = ref(false)
  const paymentForm = ref({
    employeeId: '',
    amount: 0,
    method: 'cash',
    date: localDateStr(),
    notes: '',
    currency: 'USD' as 'USD' | 'VES',
  })
  const employeeList = ref<EmployeeOption[]>([])

  const loadEmployees = async () => {
    if (!businessId.value) {
      showError('No se pudo cargar la lista de empleados: no hay negocio activo')
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, employee_schedules(branch_id)')
      .eq('business_id', businessId.value)
      .eq('role', 'empleado')
      .eq('active', true)
      .order('full_name')
    if (error) {
      console.error('[loadEmployees]', error)
      showError('Error al cargar empleados')
      return
    }
    let rows = (data ?? []) as any[]
    if (branchId.value) {
      rows = rows.filter((p: any) =>
        p.employee_schedules?.some((s: any) => s.branch_id === branchId.value)
      )
    }
    employeeList.value = rows.map((p: any) => ({
      id: p.id, name: p.full_name,
    }))
  }

  const openModal = async () => {
    paymentForm.value = {
      employeeId: '',
      amount: 0,
      method: 'cash',
      date: localDateStr(),
      notes: '',
      currency: 'USD',
    }
    paymentError.value = ''
    showPaymentModal.value = true
    await loadEmployees()
  }

  const closeModal = () => {
    showPaymentModal.value = false
  }

  const handleSave = async () => {
    if (createMutation.isPending.value) return
    if (!paymentForm.value.employeeId) {
      paymentError.value = 'Selecciona un empleado'
      return
    }
    if (paymentForm.value.amount <= 0) {
      paymentError.value = 'El monto debe ser mayor a 0'
      return
    }
    paymentError.value = ''
    try {
      await createMutation.mutateAsync(paymentForm.value)
    } catch (err) {
      paymentError.value = translateError(err, 'Error al registrar el pago')
      throw err
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeePayment(id),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['employee-payments', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-history', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-employee-payments'], exact: false }),
      ])
      await queryClient.refetchQueries({ queryKey: ['employee-payments', businessId.value], exact: false })
      success('Registro eliminado correctamente')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al eliminar el pago'))
    },
  })

  const handleDelete = (id: string) => {
    const msg = '¿Eliminar este pago?\n\nEsta acción no se puede deshacer.'
    if (window.confirm(msg)) {
      deleteMutation.mutate(id)
    }
  }

  // --- Consumption / Debit flow ---
  const showConsumptionModal = ref(false)
  const consumptionForm = ref({
    employeeId: '',
    amount: 0,
    concept: '',
    date: localDateStr(),
    currency: 'USD' as 'USD' | 'VES',
  })
  const consumptionError = ref('')

  const consumeMutation = useMutation({
    mutationFn: (params: {
      employeeId: string
      amount: number
      concept: string
      date: string
      currency: 'USD' | 'VES'
    }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return createEmployeeConsumption(
        businessId.value,
        params.employeeId,
        params.amount,
        params.concept,
        params.date,
        params.currency,
        employeePaymentsRate.value,
        branchId.value,
      )
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['employee-payments', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-history', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-employee-payments'], exact: false }),
      ])
      await queryClient.refetchQueries({ queryKey: ['employee-payments', businessId.value], exact: false })
      success('Consumo registrado correctamente')
      closeConsumptionModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al registrar el consumo'))
    },
  })

  const openConsumptionModal = async () => {
    consumptionForm.value = {
      employeeId: '',
      amount: 0,
      concept: '',
      date: localDateStr(),
      currency: 'USD',
    }
    consumptionError.value = ''
    showConsumptionModal.value = true
    await loadEmployees()
  }

  const closeConsumptionModal = () => {
    showConsumptionModal.value = false
  }

  const handleSaveConsumption = async () => {
    if (consumeMutation.isPending.value) return
    if (!consumptionForm.value.employeeId) {
      consumptionError.value = 'Selecciona un empleado'
      return
    }
    if (consumptionForm.value.amount <= 0) {
      consumptionError.value = 'El monto debe ser mayor a 0'
      return
    }
    if (!consumptionForm.value.concept.trim()) {
      consumptionError.value = 'Describe el consumo (servicio o producto)'
      return
    }
    consumptionError.value = ''
    try {
      await consumeMutation.mutateAsync(consumptionForm.value)
    } catch (err) {
      consumptionError.value = translateError(err, 'Error al registrar el consumo')
      throw err
    }
  }

  const editingPaymentId = ref<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (params: {
      id: string
      amount: number
      method: string
      notes: string
      date: string
      currency: 'USD' | 'VES'
    }) => {
      return updateEmployeePayment(
        params.id,
        params.amount,
        params.method,
        params.notes,
        params.date,
        params.currency,
        employeePaymentsRate.value,
      )
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['employee-payments', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-history', businessId.value], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-transactions'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-employee-payments'], exact: false }),
      ])
      await queryClient.refetchQueries({ queryKey: ['employee-payments', businessId.value], exact: false })
      success('Registro actualizado correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al actualizar el pago'))
    },
  })

  const openEditModal = (payment: {
    id: string
    amount: number
    originalAmount: number
    currency: 'USD' | 'VES'
    paymentMethod: string
    paymentDate: string
    notes: string | null
  }) => {
    editingPaymentId.value = payment.id
    paymentForm.value = {
      employeeId: '',
      amount: payment.currency === 'VES' ? payment.originalAmount : payment.amount,
      method: payment.paymentMethod,
      date: payment.paymentDate,
      notes: payment.notes ?? '',
      currency: payment.currency,
    }
    paymentError.value = ''
    showPaymentModal.value = true
  }

  const handleUpdate = async () => {
    if (updateMutation.isPending.value || !editingPaymentId.value) return
    if (paymentForm.value.amount <= 0) {
      paymentError.value = 'El monto debe ser mayor a 0'
      return
    }
    paymentError.value = ''
    try {
      await updateMutation.mutateAsync({
        id: editingPaymentId.value,
        amount: paymentForm.value.amount,
        method: paymentForm.value.method,
        notes: paymentForm.value.notes,
        date: paymentForm.value.date,
        currency: paymentForm.value.currency,
      })
    } catch (err) {
      paymentError.value = translateError(err, 'Error al actualizar el pago')
      throw err
    }
  }

  return {
    paymentsMade,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    consumeMutation,
    paymentError,
    showPaymentModal,
    showConsumptionModal,
    paymentForm,
    consumptionForm,
    employeeList,
    editingPaymentId,
    consumptionError,
    openModal,
    openEditModal,
    closeModal,
    openConsumptionModal,
    closeConsumptionModal,
    handleSave,
    handleUpdate,
    handleSaveConsumption,
    handleDelete,
  }
}
