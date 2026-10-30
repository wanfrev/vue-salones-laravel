import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { UNDO_WINDOW_MS, useNotification } from '../common/useNotification'
import { busySlotsFrom, describeConflict, findConflicts } from '../../components/agenda/conflicts'
import { snapshotAppointment } from './undoSnapshot'
import { saveCita, updateCitaStatus, updateAppointmentTime, deleteCita, setAppointmentCheckedIn } from '../../services/agendaService'
import { listConsents } from '../../services/dental/consentService'
import { posKeys, updateTransaction } from '../../services/posService'
import { clientesKeys } from '../../services/clientesService'
import { dashboardKeys } from '../../services/employeeDashboardService'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import { db } from '../../lib/api'
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
  const { success, error: showError, warning, withUndo } = useNotification()
  const businessStore = useBusinessStore()
  const authStore = useAuthStore()

  const isEmployee = computed(() => authStore.role === 'empleado')

  const allowCreateClient = computed(() => {
    if (!isEmployee.value) return true
    const profileCanCreate = authStore.profile?.can_create_clients ?? true
    const businessCanCreate = businessStore.hasFeature('employees_create_clients')
    return profileCanCreate && businessCanCreate
  })

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
      ['client-visits', bid] as const,
      ['finanzas-transactions', bid] as const,
      ['financial-summary', bid] as const,
      ['finanzas-employee-payments', bid] as const,
      ['dashboard-services', bid] as const,
      dashboardKeys.payments(bid),
      dashboardKeys.history(bid),
      dashboardKeys.appointments(bid),
      dashboardKeys.earnings(bid),
      ['notifications'] as const,
    ]
    await Promise.allSettled(keys.map(key =>
      queryClient.invalidateQueries({ queryKey: key, exact: false })
    ))

    const agendaRefreshes = bid ? [
      queryClient.refetchQueries({ queryKey: ['appointments', bid], exact: false, type: 'all' }),
      queryClient.refetchQueries({ queryKey: posKeys.pending(bid, brId), exact: true, type: 'all' }),
    ] : [
      queryClient.refetchQueries({ queryKey: ['appointments'], exact: false, type: 'all' }),
      queryClient.refetchQueries({ queryKey: posKeys.pending(bid, brId), exact: true, type: 'all' }),
    ]
    await Promise.allSettled(agendaRefreshes)
  }

  const saveCitaMutation = useMutation({
    mutationFn: async (input: CitaFormData & { id?: string; clientPhone?: string; _paymentData?: PaymentEditContext }) => {
      const { _paymentData: paymentData, ...data } = input
      const savedCita = await saveCita(options.businessId.value!, data, options.createdBy?.value, businessStore.currentBranchId, allowCreateClient.value)

      if (paymentData) {
        const normalizedGroupId = (savedCita as any).groupId

        if (normalizedGroupId) {
          const { data: groupAppointments, error: groupError } = await db
            .from('appointments')
            .select('id, service_id, price_override, services(price)')
            .eq('group_id', normalizedGroupId)

          if (groupError) throw groupError

          const appointmentIds = (groupAppointments ?? []).map((a: any) => a.id)
          if (appointmentIds.length > 0) {
            const { data: groupTransactions, error: txError } = await db
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
                  const { error: breakdownError } = await db
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
    onMutate: (input) => {
      return undefined
    },
    onSuccess: (_result, _input, _context) => {
      options.modalRef?.value?.close()
      options.modalRef?.value?.onSaveComplete?.()
      success('Cita guardada correctamente')
    },
    onError: (err, _input, _context) => {
      options.modalRef?.value?.onSaveComplete?.()
      showError(translateError(err))
    },
    onSettled: async () => {
      await invalidate()
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'paid' }) =>
      updateCitaStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'], exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
      for (const [key, data] of previousQueries) {
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, data.map((cita: any) =>
            cita.id === id ? { ...cita, status: status === 'paid' ? 'completed' : status, payment_status: status === 'paid' ? 'paid' : 'unpaid' } : cita
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
    onSettled: async () => {
      await invalidate()
    },
  })

  // Odontología-only — see AgendaCalendar.vue's isDentalNiche gate on the button that triggers
  // this. No optimistic cache patch needed: it's a secondary field nobody else reads on the
  // shared appointment list, unlike status/time which drive the calendar's own rendering.
  const checkInMutation = useMutation({
    mutationFn: ({ id, checkedIn }: { id: string; clientId: string; checkedIn: boolean }) =>
      setAppointmentCheckedIn(id, checkedIn),
    onError: (err) => showError(translateError(err)),
    onSettled: async () => {
      await invalidate()
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
    // El modal ya se cerró al pedir el borrado (handleDeleteCita): aquí pasaron unos segundos y la persona puede estar
    // usando otro, que no hay que cerrarle.
    onSuccess: () => {
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

  const hideAppointment = (id: string) => {
    const previous = queryClient.getQueriesData({ queryKey: ['appointments'], exact: false })
    for (const [key, old] of previous) {
      if (Array.isArray(old)) queryClient.setQueryData(key, old.filter((c: any) => c.id !== id))
    }
    return previous
  }

  /**
   * Borrar una cita da un plazo para arrepentirse: se oculta al instante y el borrado real (que no se puede revertir)
   * se hace al vencer el aviso «Deshacer». Si se cierra la pestaña dentro del plazo no se borra nada.
   */
  const handleDeleteCita = (id: string) => {
    const msg = '¿Eliminar esta cita?\n\nPodrás deshacerlo durante unos segundos.'
    if (!window.confirm(msg)) return

    const previous = hideAppointment(id)
    options.modalRef?.value?.close()
    options.modalRef?.value?.onSaveComplete?.()

    const timer = setTimeout(() => { deleteCitaMutation.mutate(id) }, UNDO_WINDOW_MS)
    withUndo('Cita eliminada', () => {
      clearTimeout(timer)
      for (const [key, data] of previous) queryClient.setQueryData(key, data)
      void invalidate()
      success('Cita restaurada')
    })
  }

  const handleSaveCita = async (data: CitaFormData & { id?: string; clientPhone?: string; paymentData?: PaymentEditContext }) => {
    if (saveCitaMutation.isPending.value) return
    try {
      await db.auth.getSession()
    } catch {
    }
    try {
      const { paymentData, ...formData } = data
      await saveCitaMutation.mutateAsync({
        ...formData,
        ...(paymentData ? { _paymentData: paymentData } : {}),
      })
    } catch {
    }
  }

  const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmada', paid: 'Pagada' } as const

  const handleStatusChange = async ({ id, status }: { id: string; status: 'pending' | 'confirmed' | 'paid' }) => {
    if (updateStatusMutation.isPending.value) return
    const cached = queryClient.getQueriesData<any[]>({ queryKey: ['appointments'], exact: false })
      .flatMap(([, data]) => (Array.isArray(data) ? data : []))
    const before = snapshotAppointment(cached, id)

    try {
      await updateStatusMutation.mutateAsync({ id, status })
    } catch {
      return
    }

    const label = `Estado actualizado a ${STATUS_LABELS[status]}`
    const previous = before?.status
    if (!previous || previous === status) {
      success(label)
      return
    }
    withUndo(label, async () => {
      try {
        await updateStatusMutation.mutateAsync({ id, status: previous })
        success(`Estado devuelto a ${STATUS_LABELS[previous]}`)
      } catch {
        // el error ya se muestra desde la mutación
      }
    })
  }

  const handleCheckInToggle = async ({ id, clientId, checkedIn }: { id: string; clientId: string; checkedIn: boolean }) => {
    if (checkInMutation.isPending.value) return
    try {
      await checkInMutation.mutateAsync({ id, clientId, checkedIn })
    } catch {
      return
    }
    success(checkedIn ? 'Paciente marcado en sala de espera' : 'Paciente retirado de sala de espera')

    if (checkedIn) {
      try {
        const consents = await listConsents(clientId)
        if (!consents || consents.length === 0) {
          warning('Este paciente no tiene ningún consentimiento informado firmado.', 6000)
        }
      } catch {
        // Consent check is a courtesy heads-up, not a blocker — swallow failures silently.
      }
    }
  }

  const handleEventChange = async ({ id, start, end, employeeId }: { id: string; start: string; end: string; employeeId?: string }) => {
    if (updateTimeMutation.isPending.value) return
    const newStart = new Date(start)
    const newEnd = new Date(end)

    const allQueries = queryClient.getQueriesData<any[]>({ queryKey: ['appointments'], exact: false })
    const cachedAppts = allQueries.flatMap(([, data]) => (Array.isArray(data) ? data : []))

    const appt = cachedAppts.find((a: any) => a.id === id)
    const before = snapshotAppointment(cachedAppts, id)
    const empId = employeeId ?? appt?.employeeId ?? appt?.employee_id
    if (empId) {
      // Cada cita ocupa su propio inicio y fin (antes, sin `duration` se asumían 30 min).
      const conflicts = findConflicts(empId, newStart.getTime(), newEnd.getTime(), busySlotsFrom(cachedAppts), {
        id,
        groupId: appt?.groupId ?? appt?.group_id,
      })
      if (conflicts.length > 0) {
        showError(describeConflict(conflicts))
        await invalidate()
        await queryClient.refetchQueries({ exact: false, queryKey: ['appointments'], type: 'all' })
        return
      }
    }

    await updateTimeMutation.mutateAsync({ id, start, end, employeeId })
    if (!before) {
      success('Cita reagendada correctamente')
      return
    }
    withUndo('Cita reagendada correctamente', async () => {
      try {
        await updateTimeMutation.mutateAsync({ id, start: before.start, end: before.end, employeeId: before.employeeId ?? undefined })
        success('Cambio deshecho: la cita volvió a su horario')
      } catch {
        // el error ya se muestra desde la mutación (p. ej. si otra persona tomó ese horario mientras tanto)
      }
    })
  }

  return {
    saveCitaMutation,
    updateStatusMutation,
    updateTimeMutation,
    checkInMutation,
    deleteCitaMutation,
    handleSaveCita,
    handleStatusChange,
    handleEventChange,
    handleCheckInToggle,
    handleDeleteCita,
  }
}
