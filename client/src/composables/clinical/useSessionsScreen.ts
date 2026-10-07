import { computed, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { isAdminPanelRole } from '../../constants/roles'
import { emptySessionNoteForm, formFromNote, type SessionNoteForm } from '../../components/clinical/sessionNotes'
import type { SessionNotePayload } from '../../services/clinical/sessionNoteService'
import type { SessionNote } from '../../types/database'

interface SessionsSource {
  notes: Ref<SessionNote[]>
  isLoading: Ref<boolean>
  createMutation: { isPending: Ref<boolean>; mutateAsync: (data: SessionNotePayload) => Promise<unknown> }
  updateMutation: { isPending: Ref<boolean>; mutateAsync: (p: { id: string; data: SessionNotePayload }) => Promise<unknown> }
}

/**
 * Máquina de estados de la pantalla de notas de sesión — la comparten las individuales (ficha del
 * paciente) y las conjuntas (caso): lista ↔ formulario, edición solo del autor o admin, y la
 * llegada desde una cita (`?cita=<id>`): si la cita ya tiene nota la abre para editarla, si no
 * abre una nueva ya vinculada. Cada cita se procesa una sola vez y el parámetro se limpia al cerrar.
 *
 * `showForm` puede venir de fuera: la vista lo necesita ANTES de tener las notas (para pedir las citas
 * recientes solo mientras el formulario está abierto), y las notas son lo que esta función recibe.
 */
export function useSessionsScreen(src: SessionsSource, showForm: Ref<boolean> = ref(false)) {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()

  const editing = ref<SessionNote | null>(null)
  const initialForm = ref<SessionNoteForm>(emptySessionNoteForm())

  const isSaving = computed(() => src.createMutation.isPending.value || src.updateMutation.isPending.value)

  // Mismo criterio que el servidor: la nota la corrige su autor o un administrador.
  const currentUserId = computed(() => authStore.user?.id ?? authStore.profile?.id ?? null)
  const canEditNote = (note: SessionNote) =>
    isAdminPanelRole(authStore.role ?? undefined) || (!!note.created_by && note.created_by === currentUserId.value)

  const citaParam = computed(() => (route.query.cita as string) || '')
  const handledCita = ref('')

  function clearCitaParam() {
    if (!citaParam.value) return
    const { cita: _cita, ...rest } = route.query
    router.replace({ query: rest })
    // Permite volver a abrir la misma cita desde la agenda más tarde (si no, quedaría marcada como ya procesada).
    handledCita.value = ''
  }

  function openNew(appointmentId?: string) {
    editing.value = null
    initialForm.value = { ...emptySessionNoteForm(), appointment_id: appointmentId ?? '' }
    showForm.value = true
  }

  function openEdit(note: SessionNote) {
    editing.value = note
    initialForm.value = formFromNote(note)
    showForm.value = true
  }

  function closeForm() {
    showForm.value = false
    editing.value = null
    clearCitaParam()
  }

  // Con la lista de notas ya cargada (nunca antes: se crearía un duplicado mientras carga).
  watch([src.isLoading, citaParam], ([loading, cita]) => {
    if (loading || !cita || handledCita.value === cita) return
    handledCita.value = cita
    const existing = src.notes.value.find(n => n.appointment_id === cita)
    if (!existing) return openNew(cita)
    if (canEditNote(existing)) openEdit(existing)
  }, { immediate: true })

  async function handleSave(payload: SessionNotePayload) {
    try {
      if (editing.value) {
        await src.updateMutation.mutateAsync({ id: editing.value.id, data: payload })
      } else {
        await src.createMutation.mutateAsync(payload)
      }
      closeForm()
    } catch {
      // El toast de error ya lo muestra onError; el formulario queda abierto para no perder lo escrito.
    }
  }

  return { showForm, editing, initialForm, isSaving, canEditNote, openNew, openEdit, closeForm, handleSave }
}
