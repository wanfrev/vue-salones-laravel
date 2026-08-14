<template>
  <div>
    <header class="mb-5 lg:mb-8">
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

    <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        @click="statusFilter = 'all'"
        class="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200"
        :class="statusFilter === 'all' ? 'bg-primary text-text-inverse shadow-sm' : 'border border-border bg-surface text-text-secondary hover:text-text'"
      >
        Todos ({{ ownerFilteredLeads.length }})
      </button>
      <button
        v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value"
        @click="statusFilter = opt.value"
        class="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200"
        :class="statusFilter === opt.value ? 'bg-primary text-text-inverse shadow-sm' : 'border border-border bg-surface text-text-secondary hover:text-text'"
      >
        {{ opt.label }} ({{ countByStatus(opt.value) }})
      </button>
    </div>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-16">
      <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <div v-else-if="filteredLeads.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary">
        <ChatRoundLineIcon class="h-7 w-7 text-text-muted" />
      </div>
      <p class="text-lg font-semibold text-text">Sin leads</p>
      <p class="mt-1 text-sm text-text-muted">Registra la primera empresa contactada.</p>
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5">Elemento</th>
              <th class="px-3 py-2.5">Vendedora</th>
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
            <tr v-for="lead in filteredLeads" :key="lead.id">
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
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.visitDate || '—' }}</td>
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
import { getInitials } from '../../lib/formatters'
import type { LeadPriority, LeadStatus } from '../../types/database'
import { ChatRoundLineIcon, AddCircleIcon, PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
  /** When set (admin viewing one vendedora from the sidebar), shows only her leads. */
  ownerId?: string | null
}>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const businessId = computed(() => props.businessId)
const ctx = useLeads(businessId)

const statusFilter = ref<LeadStatus | 'all'>('all')

// The API already returns every lead an admin can see; narrowing to one vendedora happens here
// client-side, same as the status filter below — no extra request needed.
const ownerFilteredLeads = computed(() =>
  props.ownerId ? ctx.leads.value.filter(l => l.ownerId === props.ownerId) : ctx.leads.value,
)

const filteredLeads = computed(() =>
  statusFilter.value === 'all' ? ownerFilteredLeads.value : ownerFilteredLeads.value.filter(l => l.status === statusFilter.value)
)

const countByStatus = (status: LeadStatus) => ownerFilteredLeads.value.filter(l => l.status === status).length

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
