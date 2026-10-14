<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button v-for="card in cards" :key="card.status" type="button"
        class="rounded-xl border bg-surface p-4 text-left transition-all hover:border-primary/40"
        :class="status === card.status ? 'border-primary ring-2 ring-primary/15' : 'border-border'"
        :aria-pressed="status === card.status"
        @click="emit('update:status', card.status)">
        <p class="text-2xl font-extrabold tabular-nums" :class="card.tone">{{ card.count }}</p>
        <p class="mt-1 text-xs font-medium text-text-secondary">{{ card.label }}</p>
        <p class="text-[10.5px] text-text-muted">{{ card.hint }}</p>
      </button>
    </div>

    <div v-if="niches.length > 1" class="flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">Nicho</span>
      <button type="button" :class="chipClass(niche === '')" @click="emit('update:niche', '')">
        Todos <span class="ml-1 opacity-70">{{ counts.all }}</span>
      </button>
      <button v-for="n in niches" :key="n.niche" type="button" :class="chipClass(niche === n.niche)" @click="emit('update:niche', niche === n.niche ? '' : n.niche)">
        {{ nicheLabel(n.niche) }} <span class="ml-1 opacity-70">{{ n.count }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatusCounts, StatusFilter } from './businessFilters'

const props = defineProps<{
  counts: StatusCounts
  niches: { niche: string; count: number }[]
  nicheLabel: (niche: string) => string
  status: StatusFilter
  niche: string
}>()

const emit = defineEmits<{
  (e: 'update:status', v: StatusFilter): void
  (e: 'update:niche', v: string): void
}>()

const cards = computed(() => [
  { status: 'all' as const, label: 'Negocios', hint: 'Todos los vigentes', count: props.counts.all, tone: 'text-text' },
  { status: 'active' as const, label: 'Activos', hint: 'Funcionando normal', count: props.counts.active, tone: 'text-success' },
  { status: 'inactive' as const, label: 'Suspendidos', hint: 'Sin acceso por ahora', count: props.counts.inactive, tone: props.counts.inactive ? 'text-warning' : 'text-text-muted' },
  { status: 'deleted' as const, label: 'Eliminados', hint: 'Se pueden restaurar', count: props.counts.deleted, tone: props.counts.deleted ? 'text-danger' : 'text-text-muted' },
])

const chipClass = (active: boolean) => [
  'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:border-primary/40 hover:text-text',
]
</script>
