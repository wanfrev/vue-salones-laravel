<template>
  <div>
    <header class="mb-4 flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <ChatRoundLineIcon class="h-4 w-4 shrink-0 text-primary" />
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ t('crm.title') }}</h1>
      </div>
      <button
        class="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
        @click="ctx.openNew()">
        <AddCircleIcon class="h-4 w-4" />
        <span>{{ t('crm.newLead') }}</span>
      </button>
    </header>

    <!-- Stats strip -->
    <dl class="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border-subtle shadow-sm lg:grid-cols-4">
      <div class="bg-surface px-4 py-3">
        <dt class="text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ t('crm.stat.total') }}</dt>
        <dd class="text-lg font-bold tabular-nums text-text">{{ ownerFilteredLeads.length }}</dd>
      </div>
      <div class="bg-surface px-4 py-3">
        <dt class="text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ t('crm.stat.inProgress') }}</dt>
        <dd class="text-lg font-bold tabular-nums text-text">{{ inProgressCount }}</dd>
      </div>
      <div class="bg-surface px-4 py-3">
        <dt class="text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ t('crm.stat.won') }}</dt>
        <dd class="text-lg font-bold tabular-nums text-success">{{ wonCount }}</dd>
      </div>
      <div class="bg-surface px-4 py-3">
        <dt class="text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ t('crm.stat.conversion') }}</dt>
        <dd class="text-lg font-bold tabular-nums text-text">{{ conversionRateLabel }}</dd>
      </div>
    </dl>

    <!-- Toolbar -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="relative min-w-0 flex-1 sm:max-w-xs">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input v-model="search" type="text" :placeholder="t('crm.search')" :aria-label="t('crm.searchAria')"
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15" />
      </div>

      <div class="flex items-center gap-2">
        <div v-if="viewMode === 'table'" class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden pb-0.5">
          <button
            @click="statusFilter = 'all'"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'"
          >
            {{ t('crm.filterAll', { n: ownerFilteredLeads.length }) }}
          </button>
          <button
            v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value"
            @click="statusFilter = opt.value"
            class="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="statusFilter === opt.value ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'"
          >
            {{ t('crm.filterStatus', { label: statusLabel(opt.value), n: countByStatus(opt.value) }) }}
          </button>
        </div>

        <div class="inline-flex shrink-0 divide-x divide-border overflow-hidden rounded-xl border border-border">
          <button type="button" :title="t('crm.boardView')" :aria-label="t('crm.boardView')" class="p-2 transition-colors"
            :class="viewMode === 'kanban' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-secondary hover:text-text'"
            @click="viewMode = 'kanban'">
            <Widget5Icon class="h-4 w-4" />
          </button>
          <button type="button" :title="t('crm.tableView')" :aria-label="t('crm.tableView')" class="p-2 transition-colors"
            :class="viewMode === 'table' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-secondary hover:text-text'"
            @click="viewMode = 'table'">
            <ListIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="ctx.isLoading.value" class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" aria-busy="true">
      <p class="sr-only">{{ t('crm.loading') }}</p>
      <div v-for="n in 4" :key="n" class="flex items-center gap-4 border-b border-border-subtle px-4 py-3.5 last:border-b-0">
        <span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" />
        <span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" />
        <span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" />
      </div>
    </div>

    <div v-else-if="ownerFilteredLeads.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary">
        <ChatRoundLineIcon class="h-7 w-7 text-text-muted" />
      </div>
      <p class="text-lg font-semibold text-text">{{ t('crm.empty') }}</p>
      <p class="mt-1 text-sm text-text-muted">{{ t('crm.emptyHint') }}</p>
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

          <div class="scroll-thin flex max-h-[max(20rem,calc(100vh-24rem))] min-h-[60px] flex-col gap-2 overflow-y-auto overflow-x-hidden">
            <LeadCard v-for="lead in visibleInColumn(col)" :key="lead.id" :lead="lead" :show-owner="!ownerId"
              :is-dragging="draggingId === lead.id"
              @edit="ctx.openEdit" @delete="confirmDelete"
              @dragstart="draggingId = lead.id" @dragend="draggingId = null; dragOverStatus = null" />

            <button v-if="col.leads.length > visibleInColumn(col).length" type="button"
              class="shrink-0 rounded-lg py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              @click="showMoreInColumn(col.value)">
              {{ t('crm.more', { n: Math.min(PAGE_SIZE, col.leads.length - visibleInColumn(col).length), rest: col.leads.length - visibleInColumn(col).length }) }}
            </button>

            <p v-if="col.leads.length === 0" class="rounded-lg border border-dashed border-border py-4 text-center text-[11px] text-text-muted">
              {{ t('crm.emptyColumn') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div v-else-if="filteredLeads.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-sm text-text-muted">{{ t('crm.emptyFilter') }}</p>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="scroll-thin overflow-x-auto overflow-y-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5">{{ t('crm.col.item') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.seller') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.location') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.email') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.phone') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.category') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.contactCard') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.priority') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.followUp') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.state') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.visitDate') }}</th>
              <th class="px-3 py-2.5">{{ t('crm.col.comments') }}</th>
              <th class="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="lead in visibleTableLeads" :key="lead.id" class="transition-theme hover:bg-bg-secondary/40">
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
                <span v-if="lead.priority" class="text-xs font-semibold" :class="priorityClass(lead.priority)">
                  {{ priorityLabel(lead.priority) }}
                </span>
                <span v-else class="text-text-secondary">—</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase" :class="statusClass(lead.status)">
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {{ statusLabel(lead.status) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.state || '—' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary">{{ lead.visitDate ? formatDateUS(lead.visitDate) : '—' }}</td>
              <td class="max-w-[220px] truncate px-3 py-2.5 text-text-secondary" :title="lead.notes">{{ lead.notes || '—' }}</td>
              <td class="px-3 py-2.5">
                <div class="flex items-center justify-end gap-1">
                  <button :title="t('common.edit')" :aria-label="t('common.edit')" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
                    @click="ctx.openEdit(lead)">
                    <PenIcon class="h-4 w-4" />
                  </button>
                  <button :title="t('common.delete')" :aria-label="t('common.delete')" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    @click="confirmDelete(lead)">
                    <TrashBin2Icon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="filteredLeads.length > visibleTableLeads.length" type="button"
        class="w-full border-t border-border-subtle py-3 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        @click="tableShown += TABLE_PAGE_SIZE">
        {{ t('crm.more', { n: Math.min(TABLE_PAGE_SIZE, filteredLeads.length - visibleTableLeads.length), rest: filteredLeads.length - visibleTableLeads.length }) }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="ctx.showModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="ctx.closeModal">
        <div class="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-5">
            <h2 class="text-lg font-semibold text-text">
              {{ ctx.editingId.value ? t('crm.form.titleEdit') : t('crm.form.titleNew') }}
            </h2>
          </div>

          <form class="space-y-3" @submit.prevent="ctx.handleSave">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-company">{{ t('crm.form.company') }}</label>
              <input id="lead-company" v-model="ctx.form.value.companyName" type="text" required :class="inputClass"
                :placeholder="t('crm.form.companyPlaceholder')" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-area">{{ t('crm.form.workArea') }}</label>
              <input id="lead-area" v-model="ctx.form.value.workArea" type="text" :class="inputClass"
                :placeholder="t('crm.form.workAreaPlaceholder')" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-address">{{ t('crm.col.location') }}</label>
              <input id="lead-address" v-model="ctx.form.value.address" type="text" :class="inputClass" />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-phone">{{ t('crm.col.phone') }}</label>
                <input id="lead-phone" v-model="ctx.form.value.phone" type="text" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-email">{{ t('crm.form.email') }}</label>
                <input id="lead-email" v-model="ctx.form.value.email" type="email" :class="inputClass" />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-category">{{ t('crm.form.category') }}</label>
                <input id="lead-category" v-model="ctx.form.value.companyCategory" type="text" :class="inputClass"
                  :placeholder="t('crm.form.categoryPlaceholder')" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-state">{{ t('crm.col.state') }}</label>
                <input id="lead-state" v-model="ctx.form.value.state" type="text" :class="inputClass"
                  :placeholder="t('crm.form.statePlaceholder')" />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-priority">{{ t('crm.col.priority') }}</label>
                <select id="lead-priority" v-model="ctx.form.value.priority" :class="inputClass">
                  <option value="">{{ t('crm.form.undefined') }}</option>
                  <option v-for="opt in LEAD_PRIORITY_OPTIONS" :key="opt.value" :value="opt.value">{{ priorityLabel(opt.value) }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text" for="lead-visit-date">{{ t('crm.form.visitDate') }}</label>
                <input id="lead-visit-date" v-model="ctx.form.value.visitDate" type="date" :class="inputClass" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-contact-card">{{ t('crm.form.contactCard') }}</label>
              <input id="lead-contact-card" v-model="ctx.form.value.contactCard" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-status">{{ t('crm.form.followUp') }}</label>
              <select id="lead-status" v-model="ctx.form.value.status" :class="inputClass">
                <option v-for="opt in LEAD_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ statusLabel(opt.value) }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="lead-notes">{{ t('crm.col.comments') }}</label>
              <textarea id="lead-notes" v-model="ctx.form.value.notes" rows="3" :class="inputClass" />
            </div>

            <p v-if="ctx.saveError.value" class="text-sm text-danger">{{ ctx.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="ctx.closeModal">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="ctx.isSaving.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ ctx.isSaving.value ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLeads } from '../../composables/staffing/useLeads'
import { LEAD_PRIORITY_OPTIONS, LEAD_STATUS_OPTIONS, type LeadRow } from '../../services/leadsService'
import { getInitials, formatDateUS } from '../../lib/formatters'
import LeadCard from './LeadCard.vue'
import { useI18n, type MessageKey } from '../../i18n'
import type { LeadPriority, LeadStatus } from '../../types/database'
import {
  ChatRoundLineIcon, AddCircleIcon, PenIcon, TrashBin2Icon, MagnifierIcon, ListIcon, Widget5Icon,
} from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
  /** When set (admin viewing one vendedora from the sidebar), shows only her leads. */
  ownerId?: string | null
}>()

const { t } = useI18n()

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
    label: t(`crm.status.${opt.value}` as MessageKey),
    dot: COLUMN_DOTS[opt.value],
    leads: ownerFilteredLeads.value.filter(l => l.status === opt.value),
  }))
)

// With thousands of leads, drawing every card at once is what made the CRM slow to open. Each
// column starts with PAGE_SIZE cards and grows on demand; counts and drag-and-drop still use the
// full list.
const PAGE_SIZE = 30
const TABLE_PAGE_SIZE = 100
const shownByColumn = ref<Record<string, number>>({})
const tableShown = ref(TABLE_PAGE_SIZE)
const visibleInColumn = (col: { value: string; leads: LeadRow[] }) => col.leads.slice(0, shownByColumn.value[col.value] ?? PAGE_SIZE)
const showMoreInColumn = (value: string) => {
  shownByColumn.value = { ...shownByColumn.value, [value]: (shownByColumn.value[value] ?? PAGE_SIZE) + PAGE_SIZE }
}
const visibleTableLeads = computed(() => filteredLeads.value.slice(0, tableShown.value))
watch([search, statusFilter, () => props.ownerId], () => {
  shownByColumn.value = {}
  tableShown.value = TABLE_PAGE_SIZE
})

const draggingId = ref<string | null>(null)
const dragOverStatus = ref<LeadStatus | null>(null)

const handleDrop = (status: LeadStatus) => {
  dragOverStatus.value = null
  const lead = ownerFilteredLeads.value.find(l => l.id === draggingId.value)
  draggingId.value = null
  if (!lead) return
  ctx.updateStatus(lead, status)
}

const statusLabel = (status: LeadStatus) => t(`crm.status.${status}` as MessageKey)

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: 'text-text-muted',
  called: 'text-primary',
  answered: 'text-primary',
  emailed: 'text-primary',
  meeting: 'text-warning',
  won: 'text-success',
  lost: 'text-danger',
}
const statusClass = (status: LeadStatus) => STATUS_CLASSES[status] ?? STATUS_CLASSES.new

const priorityLabel = (priority: LeadPriority) => t(`crm.priority.${priority}` as MessageKey)

const PRIORITY_CLASSES: Record<LeadPriority, string> = {
  low: 'text-text-muted',
  medium: 'text-primary',
  high: 'text-danger',
}
const priorityClass = (priority: LeadPriority) => PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.low

const confirmDelete = (lead: LeadRow) => {
  if (window.confirm(t('crm.confirmDeleteLead', { name: lead.companyName }))) {
    ctx.handleDelete(lead.id)
  }
}
</script>
