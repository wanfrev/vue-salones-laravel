<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div v-if="!showForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Planes terapéuticos <span class="font-normal text-text-muted">({{ plans.length }})</span></p>
        <button @click="openNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nuevo plan
        </button>
      </div>

      <div v-if="plans.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este paciente todavía no tiene un plan terapéutico.
      </div>

      <TreatmentPlanCard v-for="plan in plans" :key="plan.id" :plan="plan" @edit="openEdit(plan)" />
    </div>

    <TreatmentPlanForm
      v-else
      :key="editing?.id ?? 'new'"
      :initial="initialForm"
      :saving="isSaving"
      :is-editing="!!editing"
      @save="handleSave"
      @cancel="closeForm"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useTreatmentPlans } from '../composables/clinical/useTreatmentPlans'
import TreatmentPlanCard from '../components/clinical/TreatmentPlanCard.vue'
import TreatmentPlanForm from '../components/clinical/TreatmentPlanForm.vue'
import { emptyPlanForm, formFromPlan, type TreatmentPlanForm as TreatmentPlanFormState } from '../components/clinical/treatmentPlans'
import { todayISO } from '../components/clinical/sessionNotes'
import type { TreatmentPlanPayload } from '../services/clinical/treatmentPlanService'
import type { TreatmentPlan } from '../types/database'

const route = useRoute()
const clienteId = computed(() => route.params.id as string)

const { plans, isLoading, createMutation, updateMutation } = useTreatmentPlans(() => clienteId.value)

const showForm = ref(false)
const editing = ref<TreatmentPlan | null>(null)
const initialForm = ref<TreatmentPlanFormState>(emptyPlanForm(todayISO()))

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

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
      await updateMutation.mutateAsync({ id: editing.value.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    closeForm()
  } catch {
    // El toast de error ya lo muestra onError; el formulario queda abierto para no perder lo escrito.
  }
}
</script>
