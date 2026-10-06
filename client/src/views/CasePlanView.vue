<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div v-if="!showForm" class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-text">Planes conjuntos <span class="font-normal text-text-muted">({{ plans.length }})</span></p>
        <button @click="openNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
          <AddCircleIcon class="h-4 w-4" />
          Nuevo plan conjunto
        </button>
      </div>

      <div v-if="plans.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Este caso todavía no tiene un plan terapéutico conjunto.
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useCasePlans } from '../composables/clinical/useCaseRecords'
import { usePlansScreen } from '../composables/clinical/usePlansScreen'
import TreatmentPlanCard from '../components/clinical/TreatmentPlanCard.vue'
import TreatmentPlanForm from '../components/clinical/TreatmentPlanForm.vue'

const route = useRoute()
const caseId = computed(() => route.params.caseId as string)

const { plans, isLoading, createMutation, updateMutation } = useCasePlans(() => caseId.value)
const { showForm, editing, initialForm, isSaving, openNew, openEdit, closeForm, handleSave } = usePlansScreen({ createMutation, updateMutation })
</script>
