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
    mutationFn: (data: CitaFormData & { id?: string; clientPhone?: string }) =>
      saveCita(options.businessId.value!, data, options.createdBy?.value, businessStore.currentBranchId, allowCreateClient.value),
    onMutate: async (data) => {
      if (data.id) return null
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const tempId = `temp-${Date.now()}`
      const optimistic: any = { id: tempId, status: 'pending', paymentStatus: 'unpaid', ...data }
      queryClient.setQueryData(['appointments'], (old: any) =>
        Array.isArray(old) ? [optimistic, ...old] : old
      )
      return { tempId }
    },
    onSuccess: (_result, data, context) => {
      if (context?.tempId) {
        queryClient.setQueryData(['appointments'], (old: any) =>
          Array.isArray(old) ? old.filter((c: any) => c.id !== context.tempId) : old
        )
      }
      void invalidate()
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita guardada correctamente')
    },
    onError: (err, _data, context) => {
      if (context?.tempId) {
        queryClient.setQueryData(['appointments'], (old: any) =>
          Array.isArray(old) ? old.filter((c: any) => c.id !== context.tempId) : old
        )
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
    mutationFn: ({ id, start, end }: { id: string; start: string; end: string }) =>
      updateAppointmentTime(id, start, end),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const previousData = queryClient.getQueryData(['appointments'])
      return { previousData, id }
    },
    onError: (err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['appointments'], context.previousData)
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
      const previous = queryClient.getQueryData(['appointments'])
      queryClient.setQueryData(['appointments'], (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c.id !== id) : old
      )
      return { previous }
    },
    onSuccess: () => {
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita eliminada correctamente')
    },
    onError: (err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['appointments'], context.previous)
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
      const paymentData = data.paymentData
      delete (data as any).paymentData
      const savedCita = await saveCitaMutation.mutateAsync(data)
      if (paymentData) {
        const normalizedGroupId = savedCita?.groupId

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

              invalidate()
              return
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
        invalidate()
      }
    } catch (err) {
      showError(translateError(err))
    }
  }

  const handleStatusChange = async ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'cancelled' | 'paid' }) => {
    await updateStatusMutation.mutateAsync({ id, status })
    success(`Estado actualizado a ${status}`)
  }

  const handleEventChange = async ({ id, start, end, employeeId }: { id: string; start: string; end: string; employeeId?: string }) => {
    // Check for overlap before updating
    const cachedAppts = queryClient.getQueryData<any[]>(['appointments']) ?? []
    const newStart = new Date(start)
    const newEnd = new Date(end)
    const appt = cachedAppts.find((a: any) => a.id === id)
    const empId = employeeId ?? appt?.employeeId
    if (empId) {
      const conflict = cachedAppts.some((a: any) => {
        if (a.id === id) return false
        if (a.status === 'cancelled' || (a as any).paymentStatus === 'cancelled') return false
        if (a.employeeId !== empId && a.assistantId !== empId) return false
        const aStart = new Date(`${a.date}T${a.time}:00`)
        const aEnd = new Date(aStart.getTime() + ((a.duration || 30)) * 60 * 1000)
        return aStart < newEnd && aEnd > newStart
      })
      if (conflict) {
        showError('El empleado ya tiene una cita en ese horario')
        await invalidate()
        await queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' })
        return
      }
    }

    await updateTimeMutation.mutateAsync({ id, start, end })
    if (employeeId && options.businessId.value) {
      await mutate
        .from('appointments')
        .update({ employee_id: employeeId })
        .eq('id', id)
      await invalidate()
      await queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' })
    }
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
