<template>
  <div>
    <header class="mb-6">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Atención psicológica</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-text sm:text-3xl">Auditoría clínica</h1>
      <p class="mt-1 max-w-2xl text-sm text-text-muted">
        Quién consultó, creó o modificó cada expediente y cuándo. Las consultas repetidas del mismo profesional en 10 minutos se cuentan como una.
        La bitácora no se puede editar ni borrar.
      </p>
    </header>

    <p v-if="!isStrictAdmin" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      Solo el administrador del negocio puede consultar la auditoría clínica.
    </p>

    <template v-else>
      <div class="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <FormInput v-model="draft.from" type="date" label="Desde" />
        <FormInput v-model="draft.to" type="date" label="Hasta" />
        <FormSelect :model-value="draft.action" @update:model-value="draft.action = $event as ClinicalAuditAction | ''" label="Acción" :options="AUDIT_ACTION_OPTIONS" />
        <FormInput v-model="search" label="Buscar en esta página" placeholder="Paciente, usuario o IP" />
      </div>
      <p v-if="rangeError" class="mb-3 text-sm text-danger">{{ rangeError }}</p>
      <div class="mb-4 flex justify-end">
        <button @click="applyFilters" :disabled="!!rangeError" class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
          Aplicar filtros
        </button>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>

      <p v-else-if="auditQuery.isError.value" class="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        No se pudo cargar la auditoría. {{ (auditQuery.error.value as Error | null)?.message }}
      </p>

      <div v-else class="overflow-hidden rounded-xl border border-border bg-surface shadow-sm" :class="isFetching ? 'opacity-70' : ''">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border-subtle bg-bg-secondary/40 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <th class="px-4 py-3">Fecha y hora</th>
                <th class="px-4 py-3">Usuario</th>
                <th class="px-4 py-3">Acción</th>
                <th class="px-4 py-3">Paciente</th>
                <th class="px-4 py-3">Qué</th>
                <th class="hidden px-4 py-3 md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="r in visibleRows" :key="r.id">
                <td class="whitespace-nowrap px-4 py-3 text-text-secondary">{{ formatDateTime(r.created_at) }}</td>
                <td class="px-4 py-3 font-medium text-text">{{ r.user_name || 'Usuario eliminado' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="AUDIT_ACTION_TONE[r.action]">{{ AUDIT_ACTION_LABELS[r.action] }}</span>
                </td>
                <td class="px-4 py-3 text-text">
                  {{ r.client_name || 'Paciente eliminado' }}
                  <span v-if="r.case_id" class="block text-xs text-text-muted">Caso: {{ r.case_name || 'eliminado' }}</span>
                </td>
                <td class="px-4 py-3 text-text-secondary">{{ describeResource(r) }}</td>
                <td class="hidden px-4 py-3 text-xs text-text-muted md:table-cell">{{ r.ip || '—' }}</td>
              </tr>
              <tr v-if="visibleRows.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-sm text-text-muted">
                  {{ rows.length === 0 ? 'No hay accesos registrados en este período.' : 'Ningún resultado coincide con la búsqueda.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 text-xs text-text-muted">
          <span>Página {{ applied.page }} · {{ rows.length }} registros</span>
          <div class="flex gap-2">
            <button @click="goToPage(applied.page - 1)" :disabled="applied.page <= 1" class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:opacity-40">Anterior</button>
            <button @click="goToPage(applied.page + 1)" :disabled="!hasMore" class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { FormInput, FormSelect } from '../components/forms'
import { useAuthStore } from '../store/auth'
import { useClinicalAudit } from '../composables/clinical/useClinicalAudit'
import {
  AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS, AUDIT_ACTION_TONE, auditRangeError, defaultAuditRange, describeResource,
} from '../components/clinical/auditLabels'
import { formatDateTime } from '../lib/formatters'
import type { AuditFilters } from '../services/clinical/auditService'
import type { ClinicalAuditAction } from '../types/database'

const authStore = useAuthStore()
// Mismo criterio que el servidor: solo el administrador (ni siquiera el encargado) consulta la bitácora.
const isStrictAdmin = computed(() => authStore.role === 'admin' || authStore.role === 'superadmin')

// `draft` es lo que se está editando en los campos; `applied` lo que de verdad se consulta (al pulsar "Aplicar").
const draft = reactive<{ from: string; to: string; action: ClinicalAuditAction | '' }>({ ...defaultAuditRange(), action: '' })
const applied = reactive<Required<Pick<AuditFilters, 'page'>> & { from: string; to: string; action: ClinicalAuditAction | '' }>({ ...draft, page: 1 })
const search = ref('')

const rangeError = computed(() => auditRangeError(draft.from, draft.to))

const { auditQuery, rows, hasMore, isLoading, isFetching } = useClinicalAudit(
  () => ({ from: applied.from, to: applied.to, action: applied.action, page: applied.page }),
  () => isStrictAdmin.value,
)

function applyFilters() {
  if (rangeError.value) return
  Object.assign(applied, { from: draft.from, to: draft.to, action: draft.action, page: 1 })
}

function goToPage(page: number) {
  if (page >= 1) applied.page = page
}

// Un solo filter sobre la página ya cargada (máx. 50 filas) — el servidor es quien pagina y acota.
const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    (r.client_name ?? '').toLowerCase().includes(q) || (r.user_name ?? '').toLowerCase().includes(q) || (r.ip ?? '').includes(q),
  )
})
</script>
