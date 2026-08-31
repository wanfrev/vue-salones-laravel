import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useCurrency } from '../common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { translateError } from '../../lib/errors'
import { employeePaymentFormSchema } from '../../lib/validation'

const toYmdLocal = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
import {
  employeePaymentKeys,
  listEmployeePayments,
  createEmployeePayment,
  createEmployeeConsumption,
  updateEmployeePayment,
  deleteEmployeePayment,
  getCommissions,
  getEmployeeDebt,
  getEmployeeBalance,
  listSchedules,
} from '../../services/employeePaymentsService'
import { listEquipo } from '../../services/equipoService'

export function useEmployeePayments(
  businessId: import('vue').Ref<string | null>,
  periodDates: import('vue').Ref<{ start: string; end: string }>,
) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const { authStore } = useAuth()
  const businessStore = useBusinessStore()
  const { exchangeRate } = useCurrency()
  const branchId = computed(() => businessStore.currentBranchId)

  // ── Payments list ──
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: computed(() => [
      ...employeePaymentKeys.all(businessId.value),
      branchId.value,
      periodDates.value.start,
      periodDates.value.end,
    ]),
    queryFn: () => listEmployeePayments(
      businessId.value!,
      periodDates.value.start,
      periodDates.value.end,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value),
  })

  const payments = computed(() => (paymentsData.value ?? []).map((p: any) => {
    const currency = p.currency === 'VES' ? 'VES' : 'USD'
    const profileRate = p.employee_profile?.employee_ves_rate
    const empRate = profileRate != null && Number(profileRate) > 0 ? Number(profileRate) : null
    const businessEmpRate = businessStore.employeeExchangeRate
    const fallbackRate = empRate ?? (businessEmpRate != null ? businessEmpRate : null)
    return {
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_profile?.full_name ?? '—',
      amount: p.amount,
      currency,
      originalAmount: Number(p.original_amount ?? 0),
      exchangeRateUsed: p.exchange_rate_used ?? 1,
      employeeVesRate: fallbackRate,
      paymentMethod: p.payment_method,
      type: p.type,
      concept: p.concept,
      notes: p.notes,
      paymentDate: p.payment_date,
    }
  }))

  const paymentsMade = computed(() =>
    payments.value.filter(p => p.type === 'payment'),
  )

  // ── All payments (current year, for Nómina table) ──
  const defaultYearStart = computed(() => `${new Date().getFullYear()}-01-01`)
  const defaultYearEnd = computed(() => `${new Date().getFullYear()}-12-31`)
  const { data: allPaymentsData } = useQuery({
    queryKey: computed(() => [
      ...employeePaymentKeys.all(businessId.value),
      'all', branchId.value,
      defaultYearStart.value,
    ]),
    queryFn: () => listEmployeePayments(
      businessId.value!,
      defaultYearStart.value,
      defaultYearEnd.value,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value),
  })

  const allPayments = computed(() => (allPaymentsData.value ?? []).map((p: any) => {
    const currency = p.currency === 'VES' ? 'VES' : 'USD'
    const profileRate = p.employee_profile?.employee_ves_rate
    const empRate = profileRate != null && Number(profileRate) > 0 ? Number(profileRate) : null
    const businessEmpRate = businessStore.employeeExchangeRate
    const fallbackRate = empRate ?? (businessEmpRate != null ? businessEmpRate : null)
    return {
      id: p.id,
      employeeId: p.employee_id,
      employeeName: p.employee_profile?.full_name ?? '—',
      amount: p.amount,
      currency,
      originalAmount: Number(p.original_amount ?? 0),
      exchangeRateUsed: p.exchange_rate_used ?? 1,
      employeeVesRate: fallbackRate,
      paymentMethod: p.payment_method,
      type: p.type,
      concept: p.concept,
      notes: p.notes,
      paymentDate: p.payment_date,
    }
  }))

  // ── Commissions (Servicios Realizados) ──
  const { data: commissionsData } = useQuery({
    queryKey: computed(() => [
      'employee-commissions', businessId.value, branchId.value,
      periodDates.value.start, periodDates.value.end,
    ]),
    queryFn: () => getCommissions(
      businessId.value!,
      periodDates.value.start,
      periodDates.value.end,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value),
  })

  const commissions = computed(() => commissionsData.value ?? [])

  const commissionsTotal = computed(() =>
    commissions.value.reduce((s: number, c: any) => s + Number(c.employee_amount ?? 0) + Number(c.tip_amount ?? 0), 0),
  )

  // ── Employee Debt ──
  const { data: debtData } = useQuery({
    queryKey: computed(() => [
      'employee-debt', businessId.value, branchId.value,
      periodDates.value.start, periodDates.value.end,
    ]),
    queryFn: () => getEmployeeDebt(
      businessId.value!,
      periodDates.value.start,
      periodDates.value.end,
      branchId.value,
    ),
    enabled: computed(() => !!businessId.value),
  })

  const debt = computed(() => debtData.value ?? [])

  const debtTotal = computed(() =>
    debt.value.reduce((s: number, d: any) => {
      const total = Number(d.total ?? 0)
      const paid = Number(d.paid ?? 0)
      const consumed = Number(d.consumed ?? 0)
      return s + Math.max(0, total - paid - consumed)
    }, 0),
  )

  // ── Schedules ──
  const { data: schedulesData } = useQuery({
    queryKey: computed(() => ['employee-schedules', businessId.value]),
    queryFn: () => listSchedules(businessId.value!),
    enabled: computed(() => !!businessId.value),
  })

  const schedules = computed(() => (schedulesData.value ?? []).map((s: any) => ({
    id: s.id,
    employeeId: s.employee_id,
    name: s.employee?.full_name ?? '—',
    weekday: s.weekday,
    start: s.start_time,
    end: s.end_time,
    available: true,
    break: '—',
  })))

  // ── Employee list for dropdowns (exclude cajeros) ──
  const { data: employeeListData } = useQuery({
    queryKey: computed(() => ['employees-for-payment', businessId.value, branchId.value]),
    queryFn: () => listEquipo(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value),
    staleTime: 5 * 60 * 1000,
  })
  const employeeList = computed(() => (employeeListData.value ?? []).filter(e => !e.isCajero))

  // ── Payment form state ──
  const showPaymentModal = ref(false)
  const showConsumptionModal = ref(false)
  const editingPaymentId = ref<string | null>(null)
  const isSaving = ref(false)
  const saveError = ref('')
  const formErrors = ref<Record<string, string>>({})

  const paymentForm = ref({
    employeeId: '',
    amount: 0,
    currency: 'USD' as 'USD' | 'VES',
    originalAmount: 0,
    paymentMethod: 'transfer',
    paymentDate: toYmdLocal(new Date()),
    notes: '',
    startDate: '',
    endDate: '',
  })

  const consumptionForm = ref({
    employeeId: '',
    concept: '',
    amount: 0,
    currency: 'USD' as 'USD' | 'VES',
    paymentDate: toYmdLocal(new Date()),
    notes: '',
  })

  const dayRateForm = ref({
    divisas: 0,
    tasa: 0,
    bolivares: 0,
  })

  // Employee balance for selected employee + date range
  const { data: selectedBalance, refetch: refetchBalance } = useQuery({
    queryKey: computed(() => [
      'employee-balance', paymentForm.value.employeeId,
      branchId.value,
      paymentForm.value.startDate, paymentForm.value.endDate,
    ]),
    queryFn: () => getEmployeeBalance(
      businessId.value!,
      paymentForm.value.employeeId,
      branchId.value,
      paymentForm.value.startDate || undefined,
      paymentForm.value.endDate || undefined,
    ),
    enabled: computed(() => !!businessId.value && !!paymentForm.value.employeeId),
  })

  const employeeBalance = computed(() => selectedBalance.value ?? {
    commission: 0, tips: 0, base_salary: 0, total_earned: 0,
    total_paid: 0, total_consumed: 0, pending: 0,
  })

  // Get employee pay info
  const getEmployeePayInfo = (employeeId: string): { payType: string; payPercentage: number } | null => {
    // Look through debt data for this employee
    const d = debt.value.find((d: any) => d.employee_id === employeeId)
    if (d) return { payType: d.pay_type, payPercentage: Number(d.pay_percentage ?? 0) }
    return null
  }

  const onEmployeeChange = () => {
    if (paymentForm.value.employeeId && paymentForm.value.startDate && paymentForm.value.endDate) {
      refetchBalance()
    }
  }

  // ── Employee-specific rate (from balance, then business, then global) ──
  const employeeVesRate = computed(() => {
    const profileRate = selectedBalance.value?.employee_ves_rate
    if (profileRate != null && Number(profileRate) > 0) return Number(profileRate)
    const businessEmpRate = businessStore.employeeExchangeRate
    if (businessEmpRate != null && businessEmpRate > 0) return businessEmpRate
    return exchangeRate.value
  })

  // ── Mutations ──
  const savePaymentMutation = useMutation({
    mutationFn: () => {
      const rate = employeeVesRate.value
      const f = paymentForm.value
      const payload: any = {
        employee_id: f.employeeId,
        amount: f.amount,
        currency: f.currency,
        payment_method: f.paymentMethod,
        type: 'payment',
        payment_date: f.paymentDate,
        notes: f.notes || null,
        branch_id: branchId.value,
      }
      if (f.currency === 'VES') {
        payload.original_amount = f.amount
        payload.exchange_rate_used = rate
        payload.amount = f.amount / rate
      }
      return editingPaymentId.value
        ? updateEmployeePayment(editingPaymentId.value, payload)
        : createEmployeePayment(businessId.value!, payload)
    },
    onSuccess: async () => {
      const empId = paymentForm.value.employeeId
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-balance'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-payment-history', businessId.value, empId], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value, empId], exact: false }),
      ])
      success('Pago registrado')
      closePaymentModal()
    },
    onError: (err) => showError(translateError(err, 'Error al guardar pago')),
  })

  const saveConsumptionMutation = useMutation({
    mutationFn: () => {
      const rate = employeeVesRate.value
      const f = consumptionForm.value
      const payload: any = {
        employee_id: f.employeeId,
        amount: f.amount,
        currency: f.currency,
        concept: f.concept,
        notes: f.notes || null,
        payment_date: f.paymentDate,
        branch_id: branchId.value,
      }
      if (f.currency === 'VES') {
        payload.original_amount = f.amount
        payload.exchange_rate_used = rate
        payload.amount = f.amount / rate
      }
      return createEmployeeConsumption(businessId.value!, payload)
    },
    onSuccess: async () => {
      const empId = consumptionForm.value.employeeId
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-balance'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-payment-history', businessId.value, empId], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value, empId], exact: false }),
      ])
      success('Consumo registrado')
      closeConsumptionModal()
    },
    onError: (err) => showError(translateError(err, 'Error al registrar consumo')),
  })

  const saveDayRatePaymentMutation = useMutation({
    mutationFn: async () => {
      const f = dayRateForm.value
      const employeeId = paymentForm.value.employeeId
      const paymentDate = paymentForm.value.paymentDate
      const notes = paymentForm.value.notes
        ? `${paymentForm.value.notes} [Tasa promedio: ${f.tasa} Bs/$]`
        : `Tasa promedio: ${f.tasa} Bs/$`

      if (f.divisas > 0) {
        await createEmployeePayment(businessId.value!, {
          employee_id: employeeId,
          amount: f.divisas,
          currency: 'USD',
          exchange_rate_used: f.tasa,
          payment_method: 'day_average_rate',
          type: 'payment',
          payment_date: paymentDate,
          notes,
          branch_id: branchId.value,
        })
      }
      if (f.bolivares > 0) {
        await createEmployeePayment(businessId.value!, {
          employee_id: employeeId,
          amount: f.bolivares / f.tasa,
          currency: 'VES',
          original_amount: f.bolivares,
          exchange_rate_used: f.tasa,
          payment_method: 'day_average_rate',
          type: 'payment',
          payment_date: paymentDate,
          notes,
          branch_id: branchId.value,
        })
      }
    },
    onSuccess: async () => {
      const empId = paymentForm.value.employeeId
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-balance'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-payment-history', businessId.value, empId], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-earnings', businessId.value, empId], exact: false }),
      ])
      success('Pago registrado')
      closePaymentModal()
    },
    onError: (err) => showError(translateError(err, 'Error al guardar pago')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeePayment(id),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value), exact: false }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'], exact: false }),
      ])
      success('Eliminado')
    },
    onError: (err) => showError(translateError(err, 'Error al eliminar')),
  })

  // Payment totals
  const totalPaid = computed(() => paymentsMade.value.reduce((s, p) => s + p.amount, 0))
  const totalConsumed = computed(() =>
    payments.value.filter(p => p.type === 'consumption').reduce((s, p) => s + p.amount, 0),
  )
  const totalNet = computed(() => totalPaid.value - totalConsumed.value)

  // Modal helpers
  const openPaymentModal = () => {
    resetPaymentForm()
    showPaymentModal.value = true
  }
  const openEditPayment = (payment: any) => {
    editingPaymentId.value = payment.id
    paymentForm.value = {
      employeeId: payment.employeeId,
      amount: payment.currency === 'VES' ? payment.originalAmount : payment.amount,
      currency: payment.currency ?? 'USD',
      originalAmount: payment.originalAmount ?? 0,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate ?? '',
      notes: payment.notes ?? '',
      startDate: '',
      endDate: '',
    }
    saveError.value = ''
    showPaymentModal.value = true
  }
  const closePaymentModal = () => {
    showPaymentModal.value = false
    editingPaymentId.value = null
  }
  const resetPaymentForm = () => {
    paymentForm.value = {
      employeeId: '',
      amount: 0,
      currency: 'USD',
      originalAmount: 0,
      paymentMethod: 'transfer',
      paymentDate: toYmdLocal(new Date()),
      notes: '',
      startDate: '',
      endDate: '',
    }
    dayRateForm.value = { divisas: 0, tasa: 0, bolivares: 0 }
    editingPaymentId.value = null
    saveError.value = ''
  }

  const openConsumptionModal = () => {
    consumptionForm.value = {
      employeeId: '',
      concept: '',
      amount: 0,
      currency: 'USD',
      paymentDate: toYmdLocal(new Date()),
      notes: '',
    }
    saveError.value = ''
    showConsumptionModal.value = true
  }
  const closeConsumptionModal = () => {
    showConsumptionModal.value = false
  }

  const handleSavePayment = async () => {
    formErrors.value = {}
    const parsed = employeePaymentFormSchema.safeParse(paymentForm.value)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (!formErrors.value[field]) {
          formErrors.value[field] = issue.message
        }
      }
      return
    }

    isSaving.value = true
    saveError.value = ''
    try {
      await savePaymentMutation.mutateAsync()
    } catch (err) {
      saveError.value = translateError(err, 'Error')
    } finally {
      isSaving.value = false
    }
  }

  const handleSaveDayRatePayment = async () => {
    saveError.value = ''
    const f = dayRateForm.value
    if (!paymentForm.value.employeeId) {
      saveError.value = 'Selecciona un empleado'
      return
    }
    if (!(f.tasa > 0)) {
      saveError.value = 'Ingresa una tasa válida'
      return
    }
    if (!(f.divisas > 0) && !(f.bolivares > 0)) {
      saveError.value = 'Ingresa un monto en divisas o en bolívares'
      return
    }

    isSaving.value = true
    try {
      await saveDayRatePaymentMutation.mutateAsync()
    } catch (err) {
      saveError.value = translateError(err, 'Error')
    } finally {
      isSaving.value = false
    }
  }

  const handleSaveConsumption = async () => {
    isSaving.value = true
    saveError.value = ''
    try {
      await saveConsumptionMutation.mutateAsync()
    } catch (err) {
      saveError.value = translateError(err, 'Error')
    } finally {
      isSaving.value = false
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este registro?')) {
      deleteMutation.mutate(id)
    }
  }

  return {
    payments,
    allPayments,
    paymentsMade,
    commissions,
    commissionsTotal,
    debt,
    debtTotal,
    schedules,
    totalPaid,
    totalConsumed,
    totalNet,
    isLoading: isPaymentsLoading,
    // Payment modal
    showPaymentModal,
    editingPaymentId,
    paymentForm,
    employeeList,
    showConsumptionModal,
    consumptionForm,
    dayRateForm,
    isSaving,
    saveError,
    formErrors,
    employeeBalance,
    getEmployeePayInfo,
    onEmployeeChange,
    openPaymentModal,
    openEditPayment,
    closePaymentModal,
    openConsumptionModal,
    closeConsumptionModal,
    handleSavePayment,
    handleSaveDayRatePayment,
    handleSaveConsumption,
    handleDelete,
  }
}
