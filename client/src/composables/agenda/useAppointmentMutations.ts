import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useNotification } from '../common/useNotification'
import { saveCita, updateCitaStatus, updateAppointmentTime, deleteCita } from '../../services/agendaService'
import { posKeys, updateTransaction } from '../../services/posService'
import { clientesKeys } from '../../services/clientesService'
import { dashboardKeys } from '../../services/employeeDashboardService'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import { api as supabase, api as mutate } from '../../lib/api'
import { translateError } from '../../lib/errors'
import { distributeGroupPayment } from '../../business/paymentDistribution'
import type { CitaFormData, PaymentEditContext } from '../../types/cita'

export function useAppointmentMutations(options: {
  businessId: import('vue').Ref<string | null>
  createdBy?: import('vue').Ref<string | null | undefined>
  modalRef?: import('vue').Ref<{ close: () => void; onSaveComplete?: () => void } | null>
  invalidateKeys?: ((businessId: string) => readonly any[])
}) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()
  const authStore = useAuthStore()

  const isEmployee = computed(() => authStore.role === 'empleado')

  const allowCreateClient = computed(() =>
    !isEmployee.value || businessStore.hasFeature('employees_create_clients')
  )

  const invalidate = async () => {
    const bid = options.businessId.value
    const brId = businessStore.currentBranchId
    const keys = [
      ['appointments'] as const,
      ['servicios'] as const,
      posKeys.pending(bid, brId),
      clientesKeys.all(bid, brId),
      ['cliente', bid] as const,
      ['cliente-historial', bid] as const,
      ['finanzas-transactions', bid] as const,
      ['financial-summary', bid] as const,
      ['finanzas-employee-payments', bid] as const,
      ['dashboard-services', bid] as const,
      dashboardKeys.payments(bid),
      dashboardKeys.history(bid),
      dashboardKeys.appointments(bid),
      dashboardKeys.earnings(bid),
    ]
    await Promise.allSettled(keys.map(key =>
      queryClient.invalidateQueries({ queryKey: key, exact: false })
    ))
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: ['appointments'], exact: false }),
      queryClient.refetchQueries({ queryKey: posKeys.pending(bid, brId), exact: true }),
    ])
  }

  const saveCitaMutation = useMutation({
    mutationFn: async (input: CitaFormData & { id?: string; clientPhone?: string; _paymentData?: PaymentEditContext }) => {
      const { _paymentData: paymentData, ...data } = input
      const savedCita = await saveCita(options.businessId.value!, data, options.createdBy?.value, businessStore.currentBranchId, allowCreateClient.value)

      if (paymentData) {
        const normalizedGroupId = (savedCita as any).groupId

        if (normalizedGroupId) {
          const { data: groupAppointments, error: groupError } = await supabase
            .from('appointments')
            .select('id, service_id, price_override, services(price)')
            .eq('group_id', normalizedGroupId)

          if (groupError) throw groupError

          const appointmentIds = (groupAppointments ?? []).map((a: any) => a.id)
          if (appointmentIds.length > 0) {
            const { data: groupTransactions, error: txError } = await supabase
              .from('transactions')
              .select('id, appointment_id, total_amount, tip_amount')
              .in('appointment_id', appointmentIds)

            if (txError) throw txError

            const txRows = (groupTransactions ?? []) as Array<{
              id: string
              appointment_id: string
              total_amount: number
              tip_amount?: number | null
            }>

            if (txRows.length > 1) {
              const planned = distributeGroupPayment(
                txRows.map(tx => ({
                  id: tx.id,
                  totalAmount: tx.total_amount,
                  tipAmount: Number(tx.tip_amount ?? 0),
                })),
                Number(paymentData.amount ?? 0),
              )

              await Promise.all(planned.map(row =>
                updateTransaction({
                  transactionId: row.id,
                  amount: row.newTotal,
                  method: paymentData.method,
                  notes: paymentData.notes,
                  exchangeRate: paymentData.exchangeRate,
                })
              ))

              if (paymentData.breakdown) {
                const targetTxId = txRows.find(t => t.id === paymentData.transactionId)?.id ?? txRows[0]?.id
                if (targetTxId) {
                  const { error: breakdownError } = await mutate
                    .from('transactions')
                    .update({ payments_breakdown: paymentData.breakdown })
                    .eq('id', targetTxId)
                  if (breakdownError) throw breakdownError
                }
              }

              return savedCita
            }
          }
        }

        await updateTransaction({
          transactionId: paymentData.transactionId,
          amount: paymentData.amount,
          method: paymentData.method,
          notes: paymentData.notes,
          exchangeRate: paymentData.exchangeRate,
          paymentsBreakdown: paymentData.breakdown,
          tipAmount: paymentData.tipAmount ?? 0,
        })
      }

      return savedCita
    },
    onMutate: async (input) => {
      if (input.id) return null
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const { _paymentData, ...data } = input
      const tempId = `temp-${Date.now()}`
      const optimistic: any = { id: tempId, status: 'pending', paymentStatus: 'unpaid', ...data }
      const previousQueries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
      for (const [key, old] of previousQueries) {
        if (Array.isArray(old)) {
          queryClient.setQueryData(key, [optimistic, ...old])
        }
      }
      return { tempId, previousQueries }
    },
    onSuccess: (_result, _input, context) => {
      if (context?.tempId && context?.previousQueries) {
        for (const [key] of context.previousQueries) {
          queryClient.setQueryData(key, (old: any) =>
            Array.isArray(old) ? old.filter((c: any) => c.id !== context.tempId) : old
          )
        }
      }
      void invalidate()
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita guardada correctamente')
    },
    onError: (err, _input, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      options.modalRef?.value?.onSaveComplete?.()
      showError(translateError(err))
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'cancelled' | 'paid' }) =>
      updateCitaStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
      for (const [key, data] of previousQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, data.map((cita: any) =>
            cita.id === id ? { ...cita, status, paymentStatus: status === 'paid' ? 'paid' : cita.paymentStatus } : cita
          ))
        }
      }
      return { previousQueries }
    },
    onError: (err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      showError(translateError(err))
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, start, end, employeeId }: { id: string; start: string; end: string; employeeId?: string }) =>
      updateAppointmentTime(id, start, end, employeeId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
      return { previousQueries, id }
    },
    onError: (err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      showError(translateError(err))
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const deleteCitaMutation = useMutation({
    mutationFn: (id: string) => deleteCita(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
      for (const [key, old] of previousQueries) {
        if (Array.isArray(old)) {
          queryClient.setQueryData(key, old.filter((c: any) => c.id !== id))
        }
      }
      return { previousQueries }
    },
    onSuccess: () => {
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita eliminada correctamente')
    },
    onError: (err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      options.modalRef?.value?.onSaveComplete?.()
      showError(translateError(err))
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const handleDeleteCita = (id: string) => {
    const msg = '¿Eliminar esta cita?\n\nEsta acción no se puede deshacer.'
    if (window.confirm(msg)) {
      deleteCitaMutation.mutate(id)
    }
  }

  const handleSaveCita = async (data: CitaFormData & { id?: string; clientPhone?: string; paymentData?: PaymentEditContext }) => {
    try {
      await supabase.auth.getSession()
    } catch {
    }
    try {
      const { paymentData, ...formData } = data
      await saveCitaMutation.mutateAsync({
        ...formData,
        ...(paymentData ? { _paymentData: paymentData } : {}),
      })
    } catch (err) {
      showError(translateError(err))
    }
  }

  const handleStatusChange = async ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'cancelled' | 'paid' }) => {
    await updateStatusMutation.mutateAsync({ id, status })
    success(`Estado actualizado a ${status}`)
  }

  const handleEventChange = async ({ id, start, end, employeeId }: { id: string; start: string; end: string; employeeId?: string }) => {
    const newStart = new Date(start)
    const newEnd = new Date(end)

    const allQueries = queryClient.getQueriesData<any[]>({ queryKey: ['appointments'], exact: false })
    const cachedAppts = allQueries.flatMap(([, data]) => (Array.isArray(data) ? data : []))

    const appt = cachedAppts.find((a: any) => a.id === id)
    const empId = employeeId ?? appt?.employeeId ?? appt?.employee_id
    if (empId) {
      const conflict = cachedAppts.some((a: any) => {
        if (a.id === id) return false
        const aStatus = a.status ?? (a as any).paymentStatus
        if (aStatus === 'cancelled') return false
        const aEmpId = a.employeeId ?? a.employee_id
        const aAsstId = a.assistantId ?? a.assistant_employee_id
        if (aEmpId !== empId && aAsstId !== empId) return false
        const aStart = a.start_time
          ? new Date(a.start_time)
          : new Date(`${a.date}T${a.time}:00`)
        const aDuration = (a.duration ?? 30) * 60 * 1000
        const aEnd = new Date(aStart.getTime() + aDuration)
        return aStart < newEnd && aEnd > newStart
      })
      if (conflict) {
        showError('El empleado ya tiene una cita en ese horario')
        await invalidate()
        await queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' })
        return
      }
    }

    await updateTimeMutation.mutateAsync({ id, start, end, employeeId })
    success('Cita reagendada correctamente')
  }

  return {
    saveCitaMutation,
    updateStatusMutation,
    updateTimeMutation,
    deleteCitaMutation,
    handleSaveCita,
    handleStatusChange,
    handleEventChange,
    handleDeleteCita,
  }
}
