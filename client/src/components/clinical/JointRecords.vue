<template>
  <section v-if="notes.length > 0 || plans.length > 0" class="mt-6 space-y-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Sesiones conjuntas</p>
      <p class="mt-0.5 text-xs text-text-muted">
        Pertenecen al caso (pareja, familia o grupo), no a este paciente solo: las ven todos los integrantes y se editan desde el caso.
      </p>
    </div>

    <article v-for="n in notes" :key="n.id" class="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">Conjunta</span>
          <span class="font-semibold text-text">{{ n.case_name || 'Caso' }}</span>
          <span class="text-text-muted">Sesión {{ n.session_number }} · {{ formatDateHuman(n.session_date) }}</span>
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="RISK_TONE[n.risk_level]">{{ RISK_LABELS[n.risk_level] }}</span>
        </div>
        <router-link :to="`${basePath}/casos/${n.case_id}/sesiones`" class="text-xs font-semibold text-primary hover:underline">Abrir caso</router-link>
      </div>
      <p v-if="n.content?.subjective" class="mt-2 line-clamp-3 whitespace-pre-line text-sm text-text-secondary">{{ n.content.subjective }}</p>
    </article>

    <article v-for="p in plans" :key="p.id" class="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">Plan conjunto</span>
          <span class="font-semibold text-text">{{ p.case_name || 'Caso' }}</span>
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="PLAN_STATUS_TONE[p.status]">{{ PLAN_STATUS_LABELS[p.status] }}</span>
        </div>
        <router-link :to="`${basePath}/casos/${p.case_id}/plan`" class="text-xs font-semibold text-primary hover:underline">Abrir caso</router-link>
      </div>
      <p v-if="p.data?.approach" class="mt-2 text-sm text-text-secondary">{{ p.data.approach }}<span v-if="p.data.frequency"> · {{ p.data.frequency }}</span></p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { formatDateHuman } from '../../lib/formatters'
import { RISK_LABELS, RISK_TONE } from './sessionNotes'
import { PLAN_STATUS_LABELS, PLAN_STATUS_TONE } from './treatmentPlans'
import type { JointSessionNote, JointTreatmentPlan } from '../../types/database'

withDefaults(defineProps<{
  notes?: JointSessionNote[]
  plans?: JointTreatmentPlan[]
  basePath: string
}>(), { notes: () => [], plans: () => [] })
</script>
