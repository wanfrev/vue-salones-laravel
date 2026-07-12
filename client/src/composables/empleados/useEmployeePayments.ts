import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../common/useAuth'
import { useNotification } from '../common/useNotification'
import { useCurrency } from '../common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { translateError } from '../../lib/errors'
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

  const payments = computed(() => (paymentsData.value ?? []).map((p: any) => ({
    id: p.id,
    employeeId: p.employee_id,
    employeeName: p.employee_profile?.full_name ?? '—',
    amount: p.amount,
    currency: p.currency ?? 'USD',
    originalAmount: p.original_amount ?? 0,
    exchangeRateUsed: p.exchange_rate_used ?? 1,
    paymentMethod: p.payment_method,
    type: p.type,
    concept: p.concept,
    notes: p.notes,
    paymentDate: p.payment_date,
  })))

  const paymentsMade = computed(() =>
    payments.value.filter(p => p.type === 'payment'),
  )

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
    debt.value.reduce((s: number, d: any) => s + Number(d.pending ?? 0), 0),
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

  // ── Payment form state ──
  const showPaymentModal = ref(false)
  const showConsumptionModal = ref(false)
  const editingPaymentId = ref<string | null>(null)
  const isSaving = ref(false)
  const saveError = ref('')

  const paymentForm = ref({
    employeeId: '',
    amount: 0,
    currency: 'USD' as 'USD' | 'VES',
    originalAmount: 0,
    paymentMethod: 'transfer',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
    startDate: '',
    endDate: '',
  })

  const consumptionForm = ref({
    employeeId: '',
    concept: '',
    amount: 0,
    currency: 'USD' as 'USD' | 'VES',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  // Employee balance for selected employee + date range
  const { data: selectedBalance, refetch: refetchBalance } = useQuery({
    queryKey: computed(() => [
      'employee-balance', paymentForm.value.employeeId,
      paymentForm.value.startDate, paymentForm.value.endDate,
    ]),
    queryFn: () => getEmployeeBalance(
      businessId.value!,
      paymentForm.value.employeeId,
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

  // ── Employee-specific rate (from balance) ──
  const employeeVesRate = computed(() => {
    const rate = selectedBalance.value?.employee_ves_rate
    if (rate != null && Number(rate) > 0) return Number(rate)
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
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value) }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'] }),
        queryClient.invalidateQueries({ queryKey: ['employee-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary'] }),
      ])
      success('Pago registrado')
      closePaymentModal()
    },
    onError: (err) => showError(translateError(err, 'Error al guardar pago')),
  })

  const saveConsumptionMutation = useMutation({
    mutationFn: () => {
      const f = consumptionForm.value
      return createEmployeeConsumption(businessId.value!, {
        employee_id: f.employeeId,
        amount: f.amount,
        currency: f.currency,
        concept: f.concept,
        notes: f.notes || null,
        payment_date: f.paymentDate,
        branch_id: branchId.value,
      })
    },
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value) }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'] }),
        queryClient.invalidateQueries({ queryKey: ['employee-balance'] }),
        queryClient.invalidateQueries({ queryKey: ['finanzas-summary'] }),
      ])
      success('Consumo registrado')
      closeConsumptionModal()
    },
    onError: (err) => showError(translateError(err, 'Error al registrar consumo')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeePayment(id),
    onSuccess: async () => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: employeePaymentKeys.all(businessId.value) }),
        queryClient.invalidateQueries({ queryKey: ['employee-debt'] }),
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
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: '',
      startDate: '',
      endDate: '',
    }
    editingPaymentId.value = null
    saveError.value = ''
  }

  const openConsumptionModal = () => {
    consumptionForm.value = {
      employeeId: '',
      concept: '',
      amount: 0,
      currency: 'USD',
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: '',
    }
    saveError.value = ''
    showConsumptionModal.value = true
  }
  const closeConsumptionModal = () => {
    showConsumptionModal.value = false
  }

  const handleSavePayment = async () => {
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
    showConsumptionModal,
    consumptionForm,
    isSaving,
    saveError,
    employeeBalance,
    getEmployeePayInfo,
    onEmployeeChange,
    openPaymentModal,
    openEditPayment,
    closePaymentModal,
    openConsumptionModal,
    closeConsumptionModal,
    handleSavePayment,
    handleSaveConsumption,
    handleDelete,
  }
}
