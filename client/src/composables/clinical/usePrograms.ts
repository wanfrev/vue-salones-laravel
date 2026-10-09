import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  cancelEnrollment, createProgram, enrollClient, extendEnrollment, getProgramOfAppointment, listClientEnrollments,
  listPrograms, setSessionConsumes, updateProgram, type EnrollPayload, type ProgramPayload,
} from '../../services/clinical/programService'
import { listEquipo } from '../../services/equipoService'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

/** Quién puede cambiar el catálogo y lo ya vendido: mismo criterio que el servidor (admin, encargado, superadmin). */
export function useProgramsAdmin() {
  const authStore = useAuthStore()
  return computed(() => ['admin', 'encargado', 'superadmin'].includes(authStore.role ?? ''))
}

/** Todo lo que cambia cuando se inscribe, cobra o cancela un programa: lista, citas del calendario y cobros del POS. */
function useInvalidateEnrollments() {
  const queryClient = useQueryClient()
  return () => {
    for (const key of ['clinical-enrollments', 'clinical-appointment-program', 'appointments', 'pos-pending']) {
      queryClient.invalidateQueries({ queryKey: [key], exact: false })
    }
  }
}

/** Catálogo de programas. `activeOnly` para elegir al inscribir; el administrador ve también los desactivados. */
export function usePrograms(activeOnly: () => boolean = () => false) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const isAdmin = useProgramsAdmin()

  const programsQuery = useQuery({
    queryKey: computed(() => ['clinical-programs', activeOnly()]),
    queryFn: () => listPrograms(activeOnly()),
    staleTime: 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clinical-programs'], exact: false })

  const createMutation = useMutation({
    mutationFn: (data: ProgramPayload) => createProgram(data),
    onSuccess: () => { invalidate(); success('Programa creado') },
    onError: err => showError(translateError(err, 'No se pudo crear el programa')),
  })

  const updateMutation = useMutation({
    mutationFn: (p: { id: string; data: Partial<ProgramPayload> }) => updateProgram(p.id, p.data),
    onSuccess: () => { invalidate(); success('Programa actualizado') },
    onError: err => showError(translateError(err, 'No se pudo actualizar el programa')),
  })

  return {
    programs: computed(() => programsQuery.data.value ?? []),
    isLoading: programsQuery.isLoading,
    isAdmin,
    createMutation,
    updateMutation,
  }
}

/** Inscripciones de un paciente + inscribir y las acciones de administración. */
export function useClientEnrollments(clientId: () => string | null) {
  const { success, error: showError } = useNotification()
  const invalidate = useInvalidateEnrollments()
  const isAdmin = useProgramsAdmin()

  const enrollmentsQuery = useQuery({
    queryKey: computed(() => ['clinical-enrollments', clientId()]),
    queryFn: async () => (clientId() ? await listClientEnrollments(clientId()!) : []),
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const withClient = async <T>(fn: (id: string) => Promise<T>): Promise<T> => {
    const id = clientId()
    if (!id) throw new Error('No client selected')
    return await fn(id)
  }

  const enrollMutation = useMutation({
    mutationFn: (data: EnrollPayload) => withClient(id => enrollClient(id, data)),
    onSuccess: () => { invalidate(); success('Paciente inscrito: las citas ya están en el calendario') },
    onError: err => showError(translateError(err, 'No se pudo inscribir al paciente')),
  })

  const extendMutation = useMutation({
    mutationFn: (p: { id: string; expiresOn: string }) => extendEnrollment(p.id, p.expiresOn),
    onSuccess: () => { invalidate(); success('Vigencia actualizada') },
    onError: err => showError(translateError(err, 'No se pudo cambiar la vigencia')),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelEnrollment(id),
    onSuccess: () => { invalidate(); success('Inscripción cancelada y citas eliminadas') },
    onError: err => showError(translateError(err, 'No se pudo cancelar la inscripción')),
  })

  const consumesMutation = useMutation({
    mutationFn: (p: { id: string; appointmentId: string; consumes: boolean | null }) => setSessionConsumes(p.id, p.appointmentId, p.consumes),
    onSuccess: () => { invalidate() },
    onError: err => showError(translateError(err, 'No se pudo cambiar la sesión')),
  })

  return {
    enrollments: computed(() => enrollmentsQuery.data.value ?? []),
    isLoading: enrollmentsQuery.isLoading,
    isAdmin,
    enrollMutation,
    extendMutation,
    cancelMutation,
    consumesMutation,
  }
}

/** Lo que necesita el formulario de inscripción: programas activos y profesionales con quién agendar. */
export function useEnrollmentOptions() {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const { programs } = usePrograms(() => true)

  const employeesQuery = useQuery({
    queryKey: computed(() => ['clinical-program-employees', businessId.value, branchId.value]),
    queryFn: () => listEquipo(businessId.value!, branchId.value),
    enabled: computed(() => !!businessId.value),
    staleTime: 5 * 60 * 1000, // catálogo
  })

  return {
    programs,
    branchId,
    // Recepción (cajero) no atiende pacientes: no aparece como profesional.
    employees: computed(() => (employeesQuery.data.value ?? []).filter(e => !e.isCajero).map(e => ({ id: e.id, name: e.name }))),
  }
}

/** Programa al que pertenece la cita abierta en el calendario (null si es una cita común). */
export function useAppointmentProgram(appointmentId: () => string | null, enabled: () => boolean) {
  const query = useQuery({
    queryKey: computed(() => ['clinical-appointment-program', appointmentId()]),
    queryFn: async () => getProgramOfAppointment(appointmentId()!),
    enabled: computed(() => enabled() && !!appointmentId()),
    staleTime: 0,
  })

  return { program: computed(() => query.data.value ?? null) }
}
