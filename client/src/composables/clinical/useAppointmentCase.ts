import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getCaseOfAppointment, linkAppointmentToCase, listClientCases, unlinkAppointmentFromCase } from '../../services/clinical/caseService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

/**
 * Caso al que pertenece una cita + vincular/desvincular (detalle de la cita en el calendario).
 * Solo consulta cuando `enabled` (nicho clínico, con permiso y popup abierto).
 */
export function useAppointmentCase(appointmentId: () => string | null, clientId: () => string | null, enabled: () => boolean) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const on = computed(() => enabled() && !!appointmentId())

  const caseQuery = useQuery({
    queryKey: computed(() => ['clinical-appointment-case', appointmentId()]),
    queryFn: async () => getCaseOfAppointment(appointmentId()!),
    enabled: on,
    staleTime: 0,
  })

  // Casos activos de los que el paciente de la cita es integrante: lo único que se le puede ofrecer vincular.
  const clientCasesQuery = useQuery({
    queryKey: computed(() => ['clinical-client-cases', clientId()]),
    queryFn: async () => listClientCases(clientId()!),
    enabled: computed(() => on.value && !!clientId()),
    staleTime: 0,
  })

  const linkableCases = computed(() => (clientCasesQuery.data.value ?? []).filter(c => c.status === 'active' && c.active_member))

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clinical-appointment-case'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['clinical-case-appointments'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['clinical-follow-up'], exact: false })
  }

  const linkMutation = useMutation({
    mutationFn: (caseId: string) => linkAppointmentToCase(caseId, appointmentId()!),
    onSuccess: () => { refresh(); success('Sesión vinculada al caso') },
    onError: err => showError(translateError(err, 'No se pudo vincular la sesión al caso')),
  })

  const unlinkMutation = useMutation({
    mutationFn: (caseId: string) => unlinkAppointmentFromCase(caseId, appointmentId()!),
    onSuccess: () => { refresh(); success('Sesión desvinculada del caso') },
    onError: err => showError(translateError(err, 'No se pudo desvincular la sesión')),
  })

  return {
    linkedCase: computed(() => caseQuery.data.value ?? null),
    isLoading: caseQuery.isLoading,
    linkableCases,
    linkMutation,
    unlinkMutation,
  }
}
