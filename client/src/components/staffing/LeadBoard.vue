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
        Todos ({{ ctx.leads.value.length }})
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

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="lead in filteredLeads" :key="lead.id"
        class="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
        <div class="flex items-start justify-between gap-2">
          <p class="min-w-0 truncate text-sm font-semibold text-text">{{ lead.companyName }}</p>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" :class="statusClass(lead.status)">
            {{ statusLabel(lead.status) }}
          </span>
        </div>
        <p v-if="lead.workArea" class="text-xs text-text-muted">{{ lead.workArea }}</p>
        <p v-if="lead.address" class="text-xs text-text-muted truncate">{{ lead.address }}</p>
        <p v-if="lead.phone" class="text-xs font-medium text-text">{{ lead.phone }}</p>
        <p v-if="lead.notes" class="line-clamp-2 text-xs text-text-muted">{{ lead.notes }}</p>
        <div class="mt-1 flex items-center justify-end gap-1 border-t border-border-subtle pt-2">
          <button title="Editar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            @click="ctx.openEdit(lead)">
            <PenIcon class="h-4 w-4" />
          </button>
          <button title="Eliminar" class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
            @click="confirmDelete(lead)">
            <TrashBin2Icon class="h-4 w-4" />
          </button>
        </div>
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
              <label class="mb-1 block text-sm font-medium text-text" for="lead-address">Dirección</label>
              <input id="lead-address" v-model="ctx.form.value.address" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-phone">Número</label>
              <input id="lead-phone" v-model="ctx.form.value.phone" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-status">Estado de comunicación</label>
              <select id="lead-status" v-model="ctx.form.value.status" :class="inputClass">
                <option v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-notes">Notas</label>
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
import { LEAD_STATUS_OPTIONS, type LeadRow } from '../../services/leadsService'
import type { LeadStatus } from '../../types/database'
import { ChatRoundLineIcon, AddCircleIcon, PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
}>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const businessId = computed(() => props.businessId)
const ctx = useLeads(businessId)

const statusFilter = ref<LeadStatus | 'all'>('all')

const filteredLeads = computed(() =>
  statusFilter.value === 'all' ? ctx.leads.value : ctx.leads.value.filter(l => l.status === statusFilter.value)
)

const countByStatus = (status: LeadStatus) => ctx.leads.value.filter(l => l.status === status).length

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

const confirmDelete = (lead: LeadRow) => {
  if (window.confirm(`¿Eliminar el lead de ${lead.companyName}?`)) {
    ctx.handleDelete(lead.id)
  }
}
</script>
