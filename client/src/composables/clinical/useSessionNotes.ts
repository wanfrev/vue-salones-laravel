import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  listSessionNotes, listSessionAppointments, createSessionNote, updateSessionNote, type SessionNotePayload,
} from '../../services/clinical/sessionNoteService'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'

/**
 * @param loadAppointments Las citas recientes solo se piden cuando el formulario de nota está
 * abierto (no en cada visita a la pestaña ni en el resumen de la ficha).
 */
export function useSessionNotes(clientId: () => string | null, loadAppointments: () => boolean = () => false) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const notesQuery = useQuery({
    queryKey: computed(() => ['clinical-session-notes', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listSessionNotes(id)
    },
    enabled: computed(() => !!clientId()),
    staleTime: 0,
  })

  const appointmentsQuery = useQuery({
    queryKey: computed(() => ['clinical-session-appointments', clientId()]),
    queryFn: async () => {
      const id = clientId()
      if (!id) return []
      return await listSessionAppointments(id)
    },
    enabled: computed(() => !!clientId() && loadAppointments()),
    staleTime: 0,
  })

  const notes = computed(() => notesQuery.data.value ?? [])
  const appointments = computed(() => appointmentsQuery.data.value ?? [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['clinical-session-notes', clientId()], exact: false })
    // Escribir una nota quita al paciente de "notas pendientes" y puede sacarlo de "riesgo sin seguimiento".
    queryClient.invalidateQueries({ queryKey: ['clinical-follow-up'], exact: false })
  }

  const createMutation = useMutation({
    mutationFn: async (data: SessionNotePayload) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await createSessionNote(id, data)
    },
    onSuccess: () => {
      invalidate()
      success('Nota de sesión guardada')
    },
    onError: (err) => showError(translateError(err, 'Error al guardar la nota de sesión')),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; data: SessionNotePayload }) => {
      const id = clientId()
      if (!id) throw new Error('No client selected')
      return await updateSessionNote(id, payload.id, payload.data)
    },
    onSuccess: () => {
      invalidate()
      success('Nota de sesión actualizada')
    },
    onError: (err) => showError(translateError(err, 'Error al actualizar la nota de sesión')),
  })

  return { notesQuery, notes, appointments, isLoading: notesQuery.isLoading, createMutation, updateMutation }
}
