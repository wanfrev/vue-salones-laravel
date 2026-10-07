import { computed, ref, type Ref } from 'vue'
import { emptyPlanForm, formFromPlan, type TreatmentPlanForm } from '../../components/clinical/treatmentPlans'
import { todayISO } from '../../components/clinical/sessionNotes'
import type { TreatmentPlanPayload } from '../../services/clinical/treatmentPlanService'
import type { TreatmentPlan } from '../../types/database'

interface PlansSource {
  createMutation: { isPending: Ref<boolean>; mutateAsync: (data: TreatmentPlanPayload) => Promise<unknown> }
  updateMutation: { isPending: Ref<boolean>; mutateAsync: (p: { id: string; data: TreatmentPlanPayload }) => Promise<unknown> }
}

/** Lista ↔ formulario de planes terapéuticos — compartido por los individuales y los conjuntos de un caso. */
export function usePlansScreen(src: PlansSource) {
  const showForm = ref(false)
  const editing = ref<TreatmentPlan | null>(null)
  const initialForm = ref<TreatmentPlanForm>(emptyPlanForm(todayISO()))

  const isSaving = computed(() => src.createMutation.isPending.value || src.updateMutation.isPending.value)

  function openNew() {
    editing.value = null
    initialForm.value = emptyPlanForm(todayISO())
    showForm.value = true
  }

  function openEdit(plan: TreatmentPlan) {
    editing.value = plan
    initialForm.value = formFromPlan(plan)
    showForm.value = true
  }

  function closeForm() {
    showForm.value = false
    editing.value = null
  }

  async function handleSave(payload: TreatmentPlanPayload) {
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

  return { showForm, editing, initialForm, isSaving, openNew, openEdit, closeForm, handleSave }
}
