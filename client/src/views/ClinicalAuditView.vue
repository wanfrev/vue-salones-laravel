<template>
  <div>
    <ClinicalPageHeader
      :icon="ShieldKeyholeIcon"
      title="Auditoría clínica"
      description="Quién consultó, creó o modificó cada expediente y cuándo. Las consultas repetidas del mismo profesional en 10 minutos se cuentan como una. La bitácora no se puede editar ni borrar."
    />

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <p v-if="!isStrictAdmin" class="px-4 py-12 text-center text-sm text-text-muted">
        Solo el administrador del negocio puede consultar la auditoría clínica.
      </p>

      <template v-else>
        <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
          <div class="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
            <FormInput v-model="draft.from" type="date" label="Desde" />
            <FormInput v-model="draft.to" type="date" label="Hasta" />
            <FormSelect :model-value="draft.action" @update:model-value="draft.action = $event as ClinicalAuditAction | ''" label="Acción" :options="AUDIT_ACTION_OPTIONS" />
            <FormInput v-model="search" label="Buscar en esta página" placeholder="Paciente, usuario o IP" />
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p v-if="rangeError" class="text-sm text-danger">{{ rangeError }}</p>
            <span v-else />
            <button @click="applyFilters" :disabled="!!rangeError" class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
              Aplicar filtros
            </button>
          </div>
        </div>

        <ClinicalListSkeleton v-if="isLoading" :rows="6" />

        <p v-else-if="auditQuery.isError.value" class="m-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger sm:m-4">
          No se pudo cargar la auditoría. {{ (auditQuery.error.value as Error | null)?.message }}
        </p>

        <div v-else :class="isFetching ? 'opacity-70' : ''">
          <!-- Encabezado de columnas (solo escritorio); la rejilla es la misma que la de las filas. -->
          <div v-if="visibleRows.length > 0" :class="[COLS, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted lg:grid']">
            <span>Fecha y hora</span>
            <span>Usuario</span>
            <span>Acción</span>
            <span>Paciente</span>
            <span>Qué</span>
          </div>

          <ul class="divide-y divide-border-subtle">
            <li v-for="r in visibleRows" :key="r.id" :class="[COLS, 'flex flex-col gap-1 px-3 py-3 text-sm sm:px-4 lg:grid']">
              <!-- En móvil fecha y acción comparten línea; en escritorio cada una es su columna. -->
              <div class="flex items-center justify-between gap-2 lg:contents">
                <span class="whitespace-nowrap text-xs text-text-secondary lg:order-1 lg:text-sm">{{ formatDateTime(r.created_at) }}</span>
                <ClinicalStatusDot :tone="AUDIT_ACTION_TONE[r.action]" class="lg:order-3">{{ AUDIT_ACTION_LABELS[r.action] }}</ClinicalStatusDot>
              </div>
              <div class="min-w-0 lg:order-2">
                <p class="truncate font-medium text-text">{{ r.user_name || 'Usuario eliminado' }}</p>
                <p class="text-xs text-text-muted">IP {{ r.ip || '—' }}</p>
              </div>
              <div class="min-w-0 text-text lg:order-4">
                {{ r.client_name || 'Paciente eliminado' }}
                <span v-if="r.case_id" class="block text-xs text-text-muted">Caso: {{ r.case_name || 'eliminado' }}</span>
              </div>
              <p class="text-text-secondary lg:order-5">{{ describeResource(r) }}</p>
            </li>
          </ul>

          <p v-if="visibleRows.length === 0" class="px-4 py-12 text-center text-sm text-text-muted">
            {{ rows.length === 0 ? 'No hay accesos registrados en este período.' : 'Ningún resultado coincide con la búsqueda.' }}
          </p>

          <div class="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5 text-xs text-text-muted sm:px-4">
            <span>Página {{ applied.page }} · {{ rows.length }} registros</span>
            <div class="flex gap-1">
              <button @click="goToPage(applied.page - 1)" :disabled="applied.page <= 1" class="rounded-lg px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
              <button @click="goToPage(applied.page + 1)" :disabled="!hasMore" class="rounded-lg px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ShieldKeyholeIcon } from '@solar-icons/vue/linear'
import { FormInput, FormSelect } from '../components/forms'
import ClinicalListSkeleton from '../components/clinical/ClinicalListSkeleton.vue'
import ClinicalPageHeader from '../components/clinical/ClinicalPageHeader.vue'
import ClinicalStatusDot from '../components/clinical/ClinicalStatusDot.vue'
import { useAuthStore } from '../store/auth'
import { useClinicalAudit } from '../composables/clinical/useClinicalAudit'
import {
  AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS, AUDIT_ACTION_TONE, auditRangeError, defaultAuditRange, describeResource,
} from '../components/clinical/auditLabels'
import { formatDateTime } from '../lib/formatters'
import type { AuditFilters } from '../services/clinical/auditService'
import type { ClinicalAuditAction } from '../types/database'

// Columnas de escritorio: la misma rejilla para el encabezado y para cada fila (fecha, usuario, acción, paciente, qué).
const COLS = 'lg:grid-cols-[10rem_minmax(0,1fr)_6rem_minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-3'

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
