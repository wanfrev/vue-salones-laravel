import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createCaseNote, createCasePlan, listCaseAppointments, listCaseNotes, listCasePlans, listClientCases, listJointNotes, listJointPlans,
  updateCaseNote, updateCasePlan,
} from '../../services/clinical/caseService'
import type { SessionNotePayload } from '../../services/clinical/sessionNoteService'
import type { TreatmentPlanPayload } from '../../services/clinical/treatmentPlanService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

/** Notas de sesión conjuntas de un caso. Mismo contrato que useSessionNotes, contra /clinical-cases/{id}. */
export function useCaseSessions(caseId: () => string | null, loadAppointments: () => boolean = () => false) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const notesQuery = useQuery({
    queryKey: computed(() => ['clinical-case-notes', caseId()]),
    queryFn: async () => (caseId() ? await listCaseNotes(caseId()!) : []),
    enabled: computed(() => !!caseId()),
    staleTime: 0,
  })

  const appointmentsQuery = useQuery({
    queryKey: computed(() => ['clinical-case-appointments', caseId()]),
    queryFn: async () => (caseId() ? await listCaseAppointments(caseId()!) : []),
    enabled: computed(() => !!caseId() && loadAppointments()),
    staleTime: 0,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clinical-case-notes', caseId()], exact: false })
    // Una nota conjunta aparece (solo lectura) en la ficha de cada integrante y puede cambiar el seguimiento.
    queryClient.invalidateQueries({ queryKey: ['clinical-joint-notes'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['clinical-follow-up'], exact: false })
  }

  const createMutation = useMutation({
    mutationFn: async (data: SessionNotePayload) => {
      const id = caseId()
      if (!id) throw new Error('No case selected')
      return await createCaseNote(id, data)
    },
    onSuccess: () => { invalidate(); success('Nota de sesión conjunta guardada') },
    onError: err => showError(translateError(err, 'Error al guardar la nota conjunta')),
  })

  const updateMutation = useMutation({
    mutationFn: async (p: { id: string; data: SessionNotePayload }) => {
      const id = caseId()
      if (!id) throw new Error('No case selected')
      return await updateCaseNote(id, p.id, p.data)
    },
    onSuccess: () => { invalidate(); success('Nota conjunta actualizada') },
    onError: err => showError(translateError(err, 'Error al actualizar la nota conjunta')),
  })

  return {
    notesQuery,
    notes: computed(() => notesQuery.data.value ?? []),
    appointments: computed(() => appointmentsQuery.data.value ?? []),
    isLoading: notesQuery.isLoading,
    createMutation,
    updateMutation,
  }
}

export function useCasePlans(caseId: () => string | null) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const plansQuery = useQuery({
    queryKey: computed(() => ['clinical-case-plans', caseId()]),
    queryFn: async () => (caseId() ? await listCasePlans(caseId()!) : []),
    enabled: computed(() => !!caseId()),
    staleTime: 0,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clinical-case-plans', caseId()], exact: false })
    queryClient.invalidateQueries({ queryKey: ['clinical-joint-plans'], exact: false })
  }

  const createMutation = useMutation({
    mutationFn: async (data: TreatmentPlanPayload) => {
      const id = caseId()
      if (!id) throw new Error('No case selected')
      return await createCasePlan(id, data)
    },
    onSuccess: () => { invalidate(); success('Plan conjunto creado') },
    onError: err => showError(translateError(err, 'Error al crear el plan conjunto')),
  })

  const updateMutation = useMutation({
    mutationFn: async (p: { id: string; data: TreatmentPlanPayload }) => {
      const id = caseId()
      if (!id) throw new Error('No case selected')
      return await updateCasePlan(id, p.id, p.data)
    },
    onSuccess: () => { invalidate(); success('Plan conjunto actualizado') },
    onError: err => showError(translateError(err, 'Error al actualizar el plan conjunto')),
  })

  return { plansQuery, plans: computed(() => plansQuery.data.value ?? []), isLoading: plansQuery.isLoading, createMutation, updateMutation }
}

/** Lo conjunto visto desde la ficha de un paciente: sus casos y las notas/planes conjuntos (solo lectura). */
export function useClientCases(clientId: () => string | null, enabled: () => boolean = () => true) {
  const on = computed(() => !!clientId() && enabled())

  const casesQuery = useQuery({
    queryKey: computed(() => ['clinical-client-cases', clientId()]),
    queryFn: async () => listClientCases(clientId()!),
    enabled: on,
    staleTime: 0,
  })
  const jointNotesQuery = useQuery({
    queryKey: computed(() => ['clinical-joint-notes', clientId()]),
    queryFn: async () => listJointNotes(clientId()!),
    enabled: on,
    staleTime: 0,
  })
  const jointPlansQuery = useQuery({
    queryKey: computed(() => ['clinical-joint-plans', clientId()]),
    queryFn: async () => listJointPlans(clientId()!),
    enabled: on,
    staleTime: 0,
  })

  return {
    cases: computed(() => casesQuery.data.value ?? []),
    jointNotes: computed(() => jointNotesQuery.data.value ?? []),
    jointPlans: computed(() => jointPlansQuery.data.value ?? []),
    isLoading: computed(() => casesQuery.isLoading.value || jointNotesQuery.isLoading.value),
  }
}
