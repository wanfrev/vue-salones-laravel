<template>
  <div v-if="isLoading || !clinicalCase" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="space-y-6">
    <section class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-end gap-3">
        <FormInput v-model="nameDraft" label="Nombre del caso" class="max-w-sm" />
        <button @click="saveName" :disabled="!nameChanged || updateMutation.isPending.value" class="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10 disabled:opacity-50">
          Guardar nombre
        </button>
        <div class="ml-auto">
          <button v-if="clinicalCase.status === 'active'" @click="setStatus('closed')" class="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">
            Cerrar caso
          </button>
          <button v-else @click="setStatus('active')" class="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10">
            Reabrir caso
          </button>
        </div>
      </div>
      <p class="mt-2 text-xs text-text-muted">
        <template v-if="clinicalCase.opened_on">Abierto el {{ formatDateHuman(clinicalCase.opened_on) }}. </template>
        <template v-if="clinicalCase.closed_on">Cerrado el {{ formatDateHuman(clinicalCase.closed_on) }}. </template>
        Un caso nunca se elimina: al cerrarlo se conservan todas sus sesiones.
      </p>
    </section>

    <section class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Integrantes</p>
      <ul class="mt-3 divide-y divide-border-subtle">
        <li v-for="m in clinicalCase.members" :key="m.client_id" class="flex flex-wrap items-center justify-between gap-3 py-3" :class="m.left_on ? 'opacity-60' : ''">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-text">
              {{ titleCase(m.client_name) }}
              <span v-if="m.is_primary" class="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">Titular</span>
            </p>
            <p class="text-xs text-text-muted">
              {{ m.role || 'Sin rol' }}<span v-if="m.phone"> · {{ m.phone }}</span>
              <span v-if="m.left_on"> · salió el {{ formatDateHuman(m.left_on) }} (conserva las sesiones en las que estuvo)</span>
            </p>
          </div>
          <div v-if="!m.left_on && isActive" class="flex items-center gap-2">
            <button v-if="!m.is_primary" @click="makeTitular(m.client_id)" class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:text-primary">Hacer titular</button>
            <button @click="leave(m.client_id, m.client_name)" :disabled="activeCount <= MIN_MEMBERS" :title="activeCount <= MIN_MEMBERS ? 'Un caso necesita al menos 2 integrantes activos' : ''"
              class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5 disabled:opacity-40">Salió del caso</button>
          </div>
        </li>
      </ul>

      <div v-if="isActive" class="mt-4 grid grid-cols-1 items-end gap-3 border-t border-border-subtle pt-4 sm:grid-cols-[1fr_12rem]">
        <PatientPicker label="Agregar integrante" :exclude="clinicalCase.members.filter(m => !m.left_on).map(m => m.client_id)" @select="addMember" />
        <CaseRoleSelect v-model="newRole" label="Rol" />
      </div>
      <p v-if="isActive && clinicalCase.type === 'couple' && activeCount >= 2" class="mt-2 text-xs text-text-muted">Un caso de pareja tiene exactamente 2 integrantes.</p>
    </section>

    <section class="rounded-xl border border-border bg-bg-secondary/40 p-4 text-sm text-text-secondary">
      <p class="font-semibold text-text">Cómo se agendan las sesiones del caso</p>
      <p class="mt-1">
        Agenda la cita de la forma habitual a nombre del <strong>titular</strong>. Luego, en el detalle de la cita (calendario), usa «Vincular» para asociarla a este caso:
        así queda registrada como sesión conjunta, la constancia de asistencia cuenta a todos los integrantes y la nota se escribe en el caso.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FormInput } from '../components/forms'
import PatientPicker, { type PickedPatient } from '../components/clinical/PatientPicker.vue'
import CaseRoleSelect from '../components/clinical/CaseRoleSelect.vue'
import { MIN_MEMBERS, activeMembers } from '../components/clinical/cases'
import { useCase } from '../composables/clinical/useCases'
import { formatDateHuman } from '../lib/formatters'
import type { ClinicalCaseStatus } from '../types/database'

const route = useRoute()
const { clinicalCase, isLoading, updateMutation, addMemberMutation, removeMemberMutation } = useCase(() => route.params.caseId as string)

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())

const isActive = computed(() => clinicalCase.value?.status === 'active')
const activeCount = computed(() => (clinicalCase.value ? activeMembers(clinicalCase.value).length : 0))

// ── Nombre ──
const nameDraft = ref('')
watch(() => clinicalCase.value?.name, n => { nameDraft.value = n ?? '' }, { immediate: true })
const nameChanged = computed(() => !!nameDraft.value.trim() && nameDraft.value.trim() !== clinicalCase.value?.name)
const saveName = () => nameChanged.value && updateMutation.mutate({ name: nameDraft.value.trim() })

// ── Estado ──
function setStatus(status: ClinicalCaseStatus) {
  if (status === 'closed' && !window.confirm('¿Cerrar este caso? Se conservan todas sus sesiones y puedes reabrirlo después.')) return
  updateMutation.mutate({ status })
}

// ── Integrantes ──
const newRole = ref('')
function addMember(p: PickedPatient) {
  addMemberMutation.mutate({ client_id: p.id, role: newRole.value || null }, { onSuccess: () => { newRole.value = '' } })
}

function leave(clientId: string, name: string) {
  if (!window.confirm(`¿${titleCase(name)} sale del caso? Conservará el historial de las sesiones conjuntas en las que estuvo.`)) return
  removeMemberMutation.mutate(clientId)
}

const makeTitular = (clientId: string) => updateMutation.mutate({ primary_client_id: clientId })
</script>
