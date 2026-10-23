<template>
  <div>
    <ClinicalPageHeader
      :icon="ClipboardCheckIcon"
      title="Seguimiento"
      description="Lo que necesita atención hoy: notas por escribir, pacientes con riesgo sin próxima sesión y posibles abandonos."
    >
      <FormSelect :model-value="String(weeks)" @update:model-value="weeks = Number($event)" label="Abandono tras" :options="WEEK_OPTIONS" class="w-44" />
    </ClinicalPageHeader>

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <ClinicalListSkeleton v-if="isLoading" />

      <p v-else-if="!hasAccess" class="px-4 py-12 text-center text-sm text-text-muted">
        No tienes permiso para ver el expediente clínico.
      </p>

      <div v-else class="divide-y divide-border">
        <!-- Riesgo sin seguimiento: lo más urgente va primero -->
        <section class="px-3 py-3 sm:px-4" :class="followUp.risk_unfollowed.length ? 'shadow-[inset_3px_0_0] shadow-danger' : ''">
          <SectionHeader title="Riesgo sin próxima sesión" :count="followUp.risk_unfollowed.length + followUp.risk_cases.length" tone="danger"
            hint="Su última nota quedó con riesgo moderado o alto y no tienen ninguna sesión agendada." />
          <p v-if="followUp.risk_unfollowed.length === 0 && followUp.risk_cases.length === 0" class="py-3 text-sm text-text-muted">Ningún paciente ni caso en esta situación.</p>
          <div class="divide-y divide-border-subtle">
          <ul v-if="followUp.risk_cases.length > 0" class="divide-y divide-border-subtle">
            <li v-for="c in followUp.risk_cases" :key="c.case_id" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text">
                  {{ c.case_name }}
                  <span class="ml-1 text-[11px] font-semibold text-primary">Caso de {{ CASE_TYPE_LABELS[c.type].toLowerCase() }}</span>
                </p>
                <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                  <StatusDot :tone="RISK_TONE[c.risk_level]">{{ RISK_LABELS[c.risk_level] }}</StatusDot>
                  <span>Sesión conjunta {{ c.session_number }} · {{ sinceLabel(c.days_since) }}</span>
                </p>
              </div>
              <button @click="openCase(c.case_id)" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 max-sm:-ml-3">Abrir caso</button>
            </li>
          </ul>
          <ul v-if="followUp.risk_unfollowed.length > 0" class="divide-y divide-border-subtle">
            <li v-for="p in followUp.risk_unfollowed" :key="p.client_id" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text">{{ titleCase(p.client_name) }}</p>
                <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
                  <StatusDot :tone="RISK_TONE[p.risk_level]">{{ RISK_LABELS[p.risk_level] }}</StatusDot>
                  <span>Sesión {{ p.session_number }} · {{ sinceLabel(p.days_since) }}</span>
                </p>
              </div>
              <RowActions :client-id="p.client_id" :phone="p.phone" @open="openFile(p.client_id)" />
            </li>
          </ul>
          </div>
        </section>

        <section class="px-3 py-3 sm:px-4">
          <SectionHeader title="Notas de sesión pendientes" :count="followUp.notes_pending.length" tone="warning"
            hint="Sesiones atendidas en los últimos 30 días que no tienen nota." />
          <p v-if="followUp.notes_pending.length === 0" class="py-3 text-sm text-text-muted">Todas las sesiones recientes tienen su nota.</p>
          <ul v-else class="divide-y divide-border-subtle">
            <li v-for="n in followUp.notes_pending" :key="n.appointment_id" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text">
                  {{ n.case_name || titleCase(n.client_name) }}
                  <span v-if="n.case_id" class="ml-1 text-[11px] font-semibold text-primary">Sesión conjunta</span>
                </p>
                <p class="mt-0.5 text-xs text-text-muted">{{ formatDateTime(n.start_time) }}<span v-if="n.service_name"> · {{ n.service_name }}</span></p>
              </div>
              <button @click="n.case_id ? openCase(n.case_id, n.appointment_id) : openFile(n.client_id, n.appointment_id)" class="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                Escribir nota
              </button>
            </li>
          </ul>
        </section>

        <section class="px-3 py-3 sm:px-4">
          <SectionHeader title="Posible abandono" :count="followUp.inactive.length" tone="muted"
            :hint="`Asistieron antes, llevan más de ${weeks} semanas sin venir y no tienen sesión agendada.`" />
          <p v-if="followUp.inactive.length === 0" class="py-3 text-sm text-text-muted">Ningún paciente inactivo con ese criterio.</p>
          <ul v-else class="divide-y divide-border-subtle">
            <li v-for="p in followUp.inactive" :key="p.client_id" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-text">{{ titleCase(p.client_name) }}</p>
                <p class="mt-0.5 text-xs text-text-muted">Última sesión {{ sinceLabel(p.days_since) }} ({{ formatDateHuman(p.last_session) }}) · {{ sesiones(p.sessions) }} en total</p>
              </div>
              <RowActions :client-id="p.client_id" :phone="p.phone" @open="openFile(p.client_id)" />
            </li>
          </ul>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardCheckIcon } from '@solar-icons/vue/linear'
import { FormSelect } from '../components/forms'
import ClinicalListSkeleton from '../components/clinical/ClinicalListSkeleton.vue'
import ClinicalPageHeader from '../components/clinical/ClinicalPageHeader.vue'
import StatusDot from '../components/clinical/ClinicalStatusDot.vue'
import SectionHeader from '../components/clinical/FollowUpSectionHeader.vue'
import RowActions from '../components/clinical/FollowUpRowActions.vue'
import { useClinicalFollowUp } from '../composables/clinical/useClinicalFollowUp'
import { RISK_LABELS, RISK_TONE } from '../components/clinical/sessionNotes'
import { sinceLabel } from '../components/clinical/auditLabels'
import { sesiones } from '../components/clinical/reports'
import { CASE_TYPE_LABELS } from '../components/clinical/cases'
import { formatDateHuman, formatDateTime } from '../lib/formatters'

const route = useRoute()
const router = useRouter()

const WEEK_OPTIONS = [2, 4, 6, 8, 12].map(w => ({ value: String(w), label: `${w} semanas` }))
const weeks = ref(4)

const { followUp, isLoading, hasAccess } = useClinicalFollowUp(() => weeks.value)

const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

// Los nombres de paciente se guardan tal cual se escribieron; se muestran con mayúscula inicial como en el resto de la app.
const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())

/** Abre las sesiones conjuntas del caso; con una cita, directo a escribir su nota. */
function openCase(caseId: string, appointmentId?: string) {
  router.push({
    path: `${basePath.value}/casos/${caseId}/sesiones`,
    query: appointmentId ? { cita: appointmentId } : undefined,
  })
}

/** Abre el expediente del paciente en Sesiones; con una cita, directo a escribir su nota. */
function openFile(clientId: string, appointmentId?: string) {
  router.push({
    path: `${basePath.value}/clientes/${clientId}/expediente-clinico/sesiones`,
    query: appointmentId ? { cita: appointmentId } : undefined,
  })
}
</script>
