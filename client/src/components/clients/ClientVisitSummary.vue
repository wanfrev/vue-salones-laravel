<template>
  <aside class="rounded-xl border border-border bg-surface p-4 shadow-sm">
    <h3 class="mb-4 text-base font-semibold text-text">{{ isPatientNiche ? 'Estado de cuenta' : 'Resumen' }}</h3>

    <div v-if="loading && !summary" class="space-y-3" aria-busy="true">
      <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-bg-secondary" />
    </div>

    <div v-else class="space-y-3">
      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-xs text-text-muted">Total {{ appointmentPlural }}</p>
        <p class="text-lg font-bold text-text">{{ summary?.total_visits ?? 0 }}</p>
        <p v-if="summary && (summary.cancelled || summary.no_show)" class="mt-0.5 text-[11px] text-text-muted">
          {{ summary.attended }} atendidas · {{ summary.cancelled }} canceladas · {{ summary.no_show }} no asistió
        </p>
      </div>

      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-xs text-text-muted">Total facturado</p>
        <p class="text-lg font-bold text-text">{{ formatUsd((summary?.total_billed ?? 0) + (summary?.direct_sales_total ?? 0)) }}</p>
        <p v-if="summary?.direct_sales" class="mt-0.5 text-[11px] text-text-muted">
          Incluye {{ summary.direct_sales }} {{ summary.direct_sales === 1 ? 'venta directa' : 'ventas directas' }} ({{ formatUsd(summary.direct_sales_total) }})
        </p>
      </div>

      <template v-if="isPatientNiche">
        <div class="rounded-lg bg-success/10 p-3">
          <p class="text-xs text-text-muted">Total pagado</p>
          <p class="text-lg font-bold text-success">{{ formatUsd((summary?.total_paid ?? 0) + (summary?.direct_sales_total ?? 0)) }}</p>
        </div>
        <div class="rounded-lg p-3" :class="balance > 0 ? 'bg-danger/10' : 'bg-bg-secondary'">
          <p class="text-xs text-text-muted">Saldo pendiente</p>
          <p class="text-lg font-bold" :class="balance > 0 ? 'text-danger' : 'text-text'">{{ formatUsd(balance) }}</p>
        </div>
      </template>

      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-xs text-text-muted">Última {{ appointmentSingular }}</p>
        <p class="text-lg font-bold text-text">{{ summary?.last_visit ? formatDate(summary.last_visit) : `Sin ${appointmentPlural}` }}</p>
      </div>

      <div v-if="summary?.next_visit" class="rounded-lg bg-primary/10 p-3">
        <p class="text-xs text-text-muted">Próxima {{ appointmentSingular }}</p>
        <p class="text-lg font-bold text-primary">{{ formatDate(summary.next_visit) }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import type { ClientVisitsSummary } from '../../types/clientVisits'
import { formatUsd } from './visitFormat'

const props = defineProps<{
  summary: ClientVisitsSummary | null
  loading: boolean
  /** Odontología / clínico: muestra «Estado de cuenta» con pagado y saldo pendiente. */
  isPatientNiche: boolean
}>()

const businessStore = useBusinessStore()
const appointmentSingular = computed(() => (businessStore.terminology.appointment || 'cita').toLowerCase())
const appointmentPlural = computed(() => (businessStore.terminology.appointmentPlural || 'citas').toLowerCase())
const balance = computed(() => props.summary?.balance ?? 0)
</script>
