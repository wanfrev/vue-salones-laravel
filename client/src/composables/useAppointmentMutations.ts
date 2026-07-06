import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useNotification } from './useNotification'
import { saveCita, updateCitaStatus, updateAppointmentTime, deleteCita } from '../services/agendaService'
import { posKeys } from '../services/posService'
import { clientesKeys } from '../services/clientesService'
import { dashboardKeys } from '../services/employeeDashboardService'
import { useBusinessStore } from '../store/business'
import { useAuthStore } from '../store/auth'
import { api as supabase, api as mutate } from '../lib/api'
import { translateError } from '../lib/errors'
import type { CitaFormData } from '../types/cita'

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

  const handleSaveCita = async (data: CitaFormData & { id?: string; clientPhone?: string }) => {
    try {
      await supabase.auth.getSession()
    } catch {
      // Proceed anyway — the mutation will trigger its own token check
    }
    try {
      await saveCitaMutation.mutateAsync(data)
    } catch {
      // Error handled by onError callback
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
