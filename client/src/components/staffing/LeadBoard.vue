<template>
  <div>
    <header class="mb-5 lg:mb-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <ChatRoundLineIcon class="h-3.5 w-3.5" />
          <span>CRM</span>
        </div>
        <button
          class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
          @click="ctx.openNew()">
          <AddCircleIcon class="h-4 w-4" />
          <span>Nuevo lead</span>
        </button>
      </div>
    </header>

    <!-- Stats strip -->
    <div class="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:mb-6 lg:grid-cols-4">
      <StatCard icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        icon-color="primary" :value="ownerFilteredLeads.length" label="Total leads" />
      <StatCard icon="M13 10V3L4 14h7v7l9-11h-7z" icon-color="info" :value="inProgressCount" label="En proceso" />
      <StatCard icon="M8 21l4-7 4 7M12 3v11m0 0l-4-4m4 4l4-4" icon-color="success" :value="wonCount" label="Ganados" />
      <StatCard icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14"
        icon-color="warning" :value="conversionRateLabel" label="Tasa de conversión" />
    </div>

    <!-- Toolbar -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="relative min-w-0 flex-1 sm:max-w-xs">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input v-model="search" type="text" placeholder="Buscar empresa, contacto..."
          class="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>

      <div class="flex items-center gap-2">
        <div v-if="viewMode === 'table'" class="flex gap-1 overflow-x-auto pb-0.5">
          <button
            @click="statusFilter = 'all'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            :class="statusFilter === 'all' ? 'bg-primary text-text-inverse shadow-sm' : 'border border-border bg-surface text-text-secondary hover:text-text'"
          >
            Todos ({{ ownerFilteredLeads.length }})
          </button>
          <button
            v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value"
            @click="statusFilter = opt.value"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            :class="statusFilter === opt.value ? 'bg-primary text-text-inverse shadow-sm' : 'border border-border bg-surface text-text-secondary hover:text-text'"
          >
            {{ opt.label }} ({{ countByStatus(opt.value) }})
          </button>
        </div>

        <div class="flex shrink-0 gap-0.5 rounded-lg border border-border bg-surface p-0.5">
          <button type="button" title="Vista tablero" class="rounded-md p-1.5 transition-theme"
            :class="viewMode === 'kanban' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text'"
            @click="viewMode = 'kanban'">
            <Widget5Icon class="h-4 w-4" />
          </button>
          <button type="button" title="Vista tabla" class="rounded-md p-1.5 transition-theme"
            :class="viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text'"
            @click="viewMode = 'table'">
            <ListIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
      <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="ownerFilteredLeads.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary">
        <ChatRoundLineIcon class="h-7 w-7 text-text-muted" />
      </div>
      <p class="text-lg font-semibold text-text">Sin leads</p>
      <p class="mt-1 text-sm text-text-muted">Registra la primera empresa contactada.</p>
    </div>

    <!-- Kanban board -->
    <div v-else-if="viewMode === 'kanban'" class="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div class="flex items-start gap-3" style="min-width: max-content">
        <div v-for="col in columns" :key="col.value"
          class="flex w-72 shrink-0 flex-col rounded-2xl bg-bg-secondary/60 p-2.5 transition-theme"
          :class="{ 'bg-primary/5 ring-2 ring-primary/30': dragOverStatus === col.value }"
          @dragover.prevent="dragOverStatus = col.value"
          @dragleave="dragOverStatus = dragOverStatus === col.value ? null : dragOverStatus"
          @drop.prevent="handleDrop(col.value)"
        >
          <div class="mb-2 flex items-center justify-between px-1">
            <span class="flex items-center gap-1.5 text-xs font-semibold text-text">
              <span class="h-2 w-2 rounded-full" :class="col.dot" />
              {{ col.label }}
            </span>
            <span class="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
              {{ col.leads.length }}
            </span>
          </div>

          <div class="flex min-h-[60px] flex-col gap-2">
            <LeadCard v-for="lead in col.leads" :key="lead.id" :lead="lead" :show-owner="!ownerId"
              :is-dragging="draggingId === lead.id"
              @edit="ctx.openEdit" @delete="confirmDelete"
              @dragstart="draggingId = lead.id" @dragend="draggingId = null; dragOverStatus = null" />

            <p v-if="col.leads.length === 0" class="rounded-lg border border-dashed border-border py-4 text-center text-[11px] text-text-muted">
              Sin leads aquí
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div v-else-if="filteredLeads.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-sm text-text-muted">Sin leads en este filtro.</p>
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5">Elemento</th>
              <th class="px-3 py-2.5">Vendedor</th>
              <th class="px-3 py-2.5">Ubicación</th>
              <th class="px-3 py-2.5">Correo</th>
              <th class="px-3 py-2.5">Teléfono</th>
              <th class="px-3 py-2.5">Categoría de Compañía</th>
              <th class="px-3 py-2.5">Tarjeta de Contacto</th>
              <th class="px-3 py-2.5">Prioridad</th>
              <th class="px-3 py-2.5">Estado del Seguimiento</th>
              <th class="px-3 py-2.5">Estado</th>
              <th class="px-3 py-2.5">Fecha de Visita</th>
              <th class="px-3 py-2.5">Comentarios</th>
              <th class="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="lead in filteredLeads" :key="lead.id" class="transition-theme hover:bg-bg-secondary/40">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2.5 font-medium text-text">
                {{ lead.companyName }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5">
                <span class="flex items-center gap-1.5">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {{ getInitials(lead.ownerName) }}
                  </span>
                  <span class="text-text-secondary">{{ lead.ownerName || '—' }}</span>
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.address || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.email || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.phone || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.companyCategory || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.contactCard || '—' }}</td>
              <td class="px-3 py-2.5">
                <span v-if="lead.priority" class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="priorityClass(lead.priority)">
                  {{ priorityLabel(lead.priority) }}
                </span>
                <span v-else class="text-text-secondary">—</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" :class="statusClass(lead.status)">
                  {{ statusLabel(lead.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.state || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.visitDate ? formatDateUS(lead.visitDate) : '—' }}</td>
              <td class="max-w-[220px] truncate px-3 py-2.5 text-text-secondary" :title="lead.notes">{{ lead.notes || '—' }}</td>
              <td class="px-3 py-2.5">
                <div class="flex items-center justify-end gap-1">
                  <button title="Editar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                    @click="ctx.openEdit(lead)">
                    <PenIcon class="h-4 w-4" />
                  </button>
                  <button title="Eliminar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                    @click="confirmDelete(lead)">
                    <TrashBin2Icon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="ctx.showModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="ctx.closeModal">
        <div class="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-5">
            <h2 class="text-lg font-semibold text-text">
              {{ ctx.editingId.value ? 'Editar lead' : 'Nuevo lead' }}
            </h2>
          </div>

          <form class="space-y-3" @submit.prevent="ctx.handleSave">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-company">Empresa</label>
              <input id="lead-company" v-model="ctx.form.value.companyName" type="text" required :class="inputClass"
                placeholder="Ej: DYKE INDUSTRIES" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-area">Área de trabajo</label>
              <input id="lead-area" v-model="ctx.form.value.workArea" type="text" :class="inputClass"
                placeholder="Ej: Almacén, construcción..." />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-address">Ubicación</label>
              <input id="lead-address" v-model="ctx.form.value.address" type="text" :class="inputClass" />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-phone">Teléfono</label>
                <input id="lead-phone" v-model="ctx.form.value.phone" type="text" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-email">Correo electrónico</label>
                <input id="lead-email" v-model="ctx.form.value.email" type="email" :class="inputClass" />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-category">Categoría de compañía</label>
                <input id="lead-category" v-model="ctx.form.value.companyCategory" type="text" :class="inputClass"
                  placeholder="Ej: Manufactura" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-state">Estado</label>
                <input id="lead-state" v-model="ctx.form.value.state" type="text" :class="inputClass"
                  placeholder="Ej: Georgia" />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-priority">Prioridad</label>
                <select id="lead-priority" v-model="ctx.form.value.priority" :class="inputClass">
                  <option value="">Sin definir</option>
                  <option v-for="opt in LEAD_PRIORITY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-visit-date">Fecha de visita</label>
                <input id="lead-visit-date" v-model="ctx.form.value.visitDate" type="date" :class="inputClass" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-contact-card">Tarjeta de contacto</label>
              <input id="lead-contact-card" v-model="ctx.form.value.contactCard" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-status">Estado del seguimiento</label>
              <select id="lead-status" v-model="ctx.form.value.status" :class="inputClass">
                <option v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-notes">Comentarios</label>
              <textarea id="lead-notes" v-model="ctx.form.value.notes" rows="3" :class="inputClass" />
            </div>

            <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="ctx.closeModal">
                Cancelar
              </button>
              <button type="submit" :disabled="ctx.isSaving.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ ctx.isSaving.value ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLeads } from '../../composables/staffing/useLeads'
import { LEAD_PRIORITY_OPTIONS, LEAD_STATUS_OPTIONS, type LeadRow } from '../../services/leadsService'
import { getInitials, formatDateUS } from '../../lib/formatters'
import { StatCard } from '../common'
import LeadCard from './LeadCard.vue'
import type { LeadPriority, LeadStatus } from '../../types/database'
import {
  ChatRoundLineIcon, AddCircleIcon, PenIcon, TrashBin2Icon, MagnifierIcon, ListIcon, Widget5Icon,
} from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
  /** When set (admin viewing one vendedora from the sidebar), shows only her leads. */
  ownerId?: string | null
}>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20'

const businessId = computed(() => props.businessId)
const ctx = useLeads(businessId)

const viewMode = ref<'kanban' | 'table'>('kanban')
const statusFilter = ref<LeadStatus | 'all'>('all')
const search = ref('')

// The API already returns every lead an admin can see; narrowing to one vendedora happens here
// client-side, same as the status/search filters below — no extra request needed.
const ownerScopedLeads = computed(() =>
  props.ownerId ? ctx.leads.value.filter(l => l.ownerId === props.ownerId) : ctx.leads.value,
)

const ownerFilteredLeads = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return ownerScopedLeads.value
  return ownerScopedLeads.value.filter(l =>
    l.companyName.toLowerCase().includes(term) ||
    l.contactCard.toLowerCase().includes(term) ||
    l.address.toLowerCase().includes(term) ||
    l.email.toLowerCase().includes(term)
  )
})

const filteredLeads = computed(() =>
  statusFilter.value === 'all' ? ownerFilteredLeads.value : ownerFilteredLeads.value.filter(l => l.status === statusFilter.value)
)

const countByStatus = (status: LeadStatus) => ownerFilteredLeads.value.filter(l => l.status === status).length

const wonCount = computed(() => countByStatus('won'))
const inProgressCount = computed(() =>
  ownerFilteredLeads.value.filter(l => l.status !== 'won' && l.status !== 'lost').length
)
const conversionRateLabel = computed(() => {
  const closed = wonCount.value + countByStatus('lost')
  if (closed === 0) return '—'
  return `${Math.round((wonCount.value / closed) * 100)}%`
})

const COLUMN_DOTS: Record<LeadStatus, string> = {
  new: 'bg-text-muted',
  called: 'bg-primary',
  answered: 'bg-primary',
  emailed: 'bg-primary',
  meeting: 'bg-warning',
  won: 'bg-success',
  lost: 'bg-danger',
}

const columns = computed(() =>
  LEAD_STATUS_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label,
    dot: COLUMN_DOTS[opt.value],
    leads: ownerFilteredLeads.value.filter(l => l.status === opt.value),
  }))
)

const draggingId = ref<string | null>(null)
const dragOverStatus = ref<LeadStatus | null>(null)

const handleDrop = (status: LeadStatus) => {
  dragOverStatus.value = null
  const lead = ownerFilteredLeads.value.find(l => l.id === draggingId.value)
  draggingId.value = null
  if (!lead) return
  ctx.updateStatus(lead, status)
}

const statusLabel = (status: LeadStatus) => LEAD_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: 'bg-bg-secondary text-text-muted',
  called: 'bg-primary/10 text-primary',
  answered: 'bg-primary/10 text-primary',
  emailed: 'bg-primary/10 text-primary',
  meeting: 'bg-warning/10 text-warning',
  won: 'bg-success/10 text-success',
  lost: 'bg-danger/10 text-danger',
}
const statusClass = (status: LeadStatus) => STATUS_CLASSES[status] ?? STATUS_CLASSES.new

const priorityLabel = (priority: LeadPriority) => LEAD_PRIORITY_OPTIONS.find(o => o.value === priority)?.label ?? priority

const PRIORITY_CLASSES: Record<LeadPriority, string> = {
  low: 'bg-bg-secondary text-text-muted',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-danger/10 text-danger',
}
const priorityClass = (priority: LeadPriority) => PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.low

const confirmDelete = (lead: LeadRow) => {
  if (window.confirm(`¿Eliminar el lead de ${lead.companyName}?`)) {
    ctx.handleDelete(lead.id)
  }
}
</script>
