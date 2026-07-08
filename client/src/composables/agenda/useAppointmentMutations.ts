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

  const invalidate = () => {
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
    // Fire and forget to avoid UI freezing
    Promise.allSettled(keys.map(key =>
      queryClient.invalidateQueries({ queryKey: key, exact: false })
    ))
  }

  const saveCitaMutation = useMutation({
    mutationFn: (data: CitaFormData & { id?: string; clientPhone?: string }) =>
      saveCita(options.businessId.value!, data, options.createdBy?.value, businessStore.currentBranchId, allowCreateClient.value),
    onSuccess: () => {
      invalidate()
      queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' }).catch(() => {})
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita guardada correctamente')
    },
    onError: (err) => {
      options.modalRef?.value?.onSaveComplete?.()
      showError(translateError(err))
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'cancelled' | 'paid' }) =>
      updateCitaStatus(id, status),
    onSuccess: () => {
      invalidate()
    },
    onError: (err) => {
      showError(translateError(err))
    },
  })

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, start, end }: { id: string; start: string; end: string }) =>
      updateAppointmentTime(id, start, end),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] })
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
      invalidate()
    },
  })

  const deleteCitaMutation = useMutation({
    mutationFn: (id: string) => deleteCita(id),
    onSuccess: () => {
      invalidate()
      queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' }).catch(() => {})
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita eliminada correctamente')
    },
    onError: (err) => {
      options.modalRef?.value?.onSaveComplete?.()
      showError(translateError(err))
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
          amount: Number((paymentData.amount + Number(paymentData.tipAmount ?? 0)).toFixed(2)),
          method: paymentData.method,
          notes: paymentData.notes,
          exchangeRate: paymentData.exchangeRate,
          paymentsBreakdown: paymentData.breakdown,
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
