<template>
  <div class="space-y-4">
    <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">
        {{ isEditing ? 'Editar plan terapéutico' : 'Nuevo plan terapéutico' }}
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormSelect :model-value="form.status" @update:model-value="form.status = $event as TreatmentPlanStatus" label="Estado" :options="PLAN_STATUS_OPTIONS" />
        <FormInput v-model="form.start_date" type="date" label="Inicio" />
        <FormInput v-model="form.end_date" type="date" label="Fin (opcional)" />
        <FormInput v-model="form.data.frequency" label="Frecuencia" placeholder="Ej: Semanal, 50 min" />
      </div>

      <FormSelect v-model="form.data.approach" label="Enfoque terapéutico" :options="APPROACH_OPTIONS" />
      <FormTextarea v-model="form.data.formulation" label="Formulación del caso" :rows="4" :show-char-count="false" hint="Cómo se entiende el problema: factores predisponentes, desencadenantes y de mantenimiento." />

      <div>
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Objetivos terapéuticos</p>
          <button type="button" @click="addGoal" class="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
            + Agregar objetivo
          </button>
        </div>
        <p v-if="form.data.goals.length === 0" class="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
          Sin objetivos todavía. Agrega al menos uno medible.
        </p>
        <div v-for="goal in form.data.goals" :key="goal.id" class="mb-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_11rem_auto]">
          <FormInput v-model="goal.text" placeholder="Ej: Reducir los episodios de ansiedad a 1 por semana" />
          <FormSelect :model-value="goal.status" @update:model-value="goal.status = $event as TreatmentGoalStatus" :options="GOAL_STATUS_OPTIONS" />
          <button type="button" @click="removeGoal(goal.id)" class="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5" aria-label="Quitar objetivo">
            Quitar
          </button>
        </div>
      </div>

      <FormTextarea v-model="form.data.notes" label="Notas del plan" :rows="2" :show-char-count="false" />
    </div>

    <div class="flex justify-end gap-3">
      <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
        Cancelar
      </button>
      <button
        @click="handleSave"
        :disabled="saving"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        {{ saving ? 'Guardando...' : 'Guardar plan' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { FormInput, FormSelect, FormTextarea } from '../forms'
import {
  APPROACH_OPTIONS, GOAL_STATUS_OPTIONS, PLAN_STATUS_OPTIONS, newGoalId, payloadFromPlanForm, type TreatmentPlanForm,
} from './treatmentPlans'
import type { TreatmentPlanPayload } from '../../services/clinical/treatmentPlanService'
import type { TreatmentGoalStatus, TreatmentPlanStatus } from '../../types/database'

const props = defineProps<{
  /** Valores iniciales — se copian al montar; el formulario edita su propia copia, nunca la del padre. */
  initial: TreatmentPlanForm
  saving: boolean
  isEditing: boolean
}>()

const emit = defineEmits<{ save: [payload: TreatmentPlanPayload]; cancel: [] }>()

const form = reactive<TreatmentPlanForm>({
  ...props.initial,
  data: { ...props.initial.data, goals: props.initial.data.goals.map(g => ({ ...g })) },
})

const addGoal = () => form.data.goals.push({ id: newGoalId(), text: '', status: 'pending' })
const removeGoal = (id: string) => {
  form.data.goals = form.data.goals.filter(g => g.id !== id)
}

function handleSave() {
  if (props.saving) return
  emit('save', payloadFromPlanForm(form))
}
</script>
