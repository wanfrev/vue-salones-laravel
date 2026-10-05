<template>
  <article class="rounded-xl border border-border bg-surface p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="PLAN_STATUS_TONE[plan.status]">{{ PLAN_STATUS_LABELS[plan.status] }}</span>
          <span v-if="plan.data.approach" class="text-sm font-semibold text-text">{{ plan.data.approach }}</span>
        </div>
        <p class="mt-1.5 text-xs text-text-muted">
          <span v-if="plan.start_date">Desde {{ formatDateHuman(plan.start_date) }}</span>
          <span v-if="plan.end_date"> · hasta {{ formatDateHuman(plan.end_date) }}</span>
          <span v-if="plan.data.frequency"> · {{ plan.data.frequency }}</span>
        </p>
      </div>
      <button @click="$emit('edit')" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:text-primary">
        Editar
      </button>
    </div>

    <div v-if="plan.data.formulation" class="mt-3">
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Formulación del caso</p>
      <p class="mt-1 whitespace-pre-line text-sm text-text-secondary">{{ plan.data.formulation }}</p>
    </div>

    <div v-if="goals.length > 0" class="mt-4">
      <div class="mb-2 flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Objetivos</p>
        <span class="text-xs font-semibold text-text-secondary">{{ progress }}% logrado</span>
      </div>
      <div class="mb-3 h-1.5 overflow-hidden rounded-full bg-bg-secondary">
        <div class="h-full rounded-full bg-success transition-all" :style="{ width: `${progress}%` }"></div>
      </div>
      <ul class="space-y-1.5">
        <li v-for="goal in goals" :key="goal.id" class="flex items-start gap-2 text-sm">
          <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="GOAL_DOT[goal.status]"></span>
          <span :class="goal.status === 'achieved' ? 'text-text-muted line-through' : 'text-text'">{{ goal.text }}</span>
        </li>
      </ul>
    </div>

    <p v-if="plan.data.notes" class="mt-3 whitespace-pre-line border-t border-border-subtle pt-3 text-xs text-text-secondary">{{ plan.data.notes }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDateHuman } from '../../lib/formatters'
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONE, goalsProgress } from './treatmentPlans'
import type { TreatmentGoalStatus, TreatmentPlan } from '../../types/database'

const props = defineProps<{ plan: TreatmentPlan }>()
defineEmits<{ edit: [] }>()

const GOAL_DOT: Record<TreatmentGoalStatus, string> = {
  pending: 'border border-text-muted/50',
  in_progress: 'bg-warning',
  achieved: 'bg-success',
}

const goals = computed(() => props.plan.data?.goals ?? [])
const progress = computed(() => goalsProgress(goals.value))
</script>
