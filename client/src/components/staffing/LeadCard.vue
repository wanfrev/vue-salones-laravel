<template>
  <div
    draggable="true"
    class="group relative cursor-grab rounded-xl border border-border bg-surface p-3 shadow-sm transition-theme hover:shadow-md hover:border-border-strong active:cursor-grabbing"
    :class="{ 'opacity-40': isDragging }"
    @dragstart="onDragStart"
    @dragend="emit('dragend')"
    @click="emit('edit', lead)"
  >
    <div v-if="lead.priority" class="absolute inset-y-0 left-0 w-1 rounded-l-xl" :class="priorityBarClass" />

    <div class="flex items-start justify-between gap-2 pl-1.5">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-text">{{ lead.companyName }}</p>
        <p v-if="lead.workArea || lead.address" class="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
          <MapPointIcon class="h-3 w-3 shrink-0" />
          <span class="truncate">{{ lead.workArea || lead.address }}</span>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" title="Eliminar" class="rounded-lg p-1 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
          @click.stop="emit('delete', lead)">
          <TrashBin2Icon class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div class="mt-2.5 flex flex-wrap items-center gap-1.5 pl-1.5">
      <span v-if="lead.priority" class="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide" :class="priorityChipClass">
        {{ priorityLabel }}
      </span>
      <span v-if="lead.visitDate" class="flex items-center gap-1 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
        <CalendarIcon class="h-3 w-3" />
        {{ formatDateUS(lead.visitDate) }}
      </span>
      <span v-if="lead.companyCategory" class="truncate rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
        {{ lead.companyCategory }}
      </span>
    </div>

    <div v-if="showOwner || lead.phone" class="mt-2.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-2 pl-1.5">
      <span v-if="showOwner" class="flex min-w-0 items-center gap-1.5" title="Vendedor">
        <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
          {{ getInitials(lead.ownerName) }}
        </span>
        <span class="truncate text-[11px] text-text-muted">{{ lead.ownerName || '—' }}</span>
      </span>
      <span v-else />
      <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="shrink-0 text-[11px] text-text-muted hover:text-primary" @click.stop>
        {{ lead.phone }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getInitials, formatDateUS } from '../../lib/formatters'
import { LEAD_PRIORITY_OPTIONS, type LeadRow } from '../../services/leadsService'
import { MapPointIcon, CalendarIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const props = defineProps<{
  lead: LeadRow
  showOwner?: boolean
  isDragging?: boolean
}>()

const emit = defineEmits<{
  edit: [lead: LeadRow]
  delete: [lead: LeadRow]
  dragstart: [lead: LeadRow]
  dragend: []
}>()

const priorityLabel = computed(() => LEAD_PRIORITY_OPTIONS.find(o => o.value === props.lead.priority)?.label ?? '')

const PRIORITY_BAR: Record<string, string> = {
  low: 'bg-text-muted/40',
  medium: 'bg-warning',
  high: 'bg-danger',
}
const priorityBarClass = computed(() => PRIORITY_BAR[props.lead.priority] ?? 'bg-transparent')

const PRIORITY_CHIP: Record<string, string> = {
  low: 'bg-bg-secondary text-text-muted',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-danger/10 text-danger',
}
const priorityChipClass = computed(() => PRIORITY_CHIP[props.lead.priority] ?? 'bg-bg-secondary text-text-muted')

const onDragStart = (event: DragEvent) => {
  event.dataTransfer?.setData('text/plain', props.lead.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  emit('dragstart', props.lead)
}
</script>
