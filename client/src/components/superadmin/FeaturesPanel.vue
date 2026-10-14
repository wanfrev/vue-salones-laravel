<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-text-secondary">
        <span class="font-bold text-text">{{ stats.on }} de {{ stats.total }}</span> funciones activas
        <template v-if="stats.changed > 0">
          · <span class="font-semibold text-warning">{{ stats.changed }} distinta{{ stats.changed === 1 ? '' : 's' }} de lo que trae el nicho «{{ nicheLabel }}»</span>
        </template>
        <template v-else> · igual que lo que trae el nicho «{{ nicheLabel }}»</template>
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <input v-model="onlyChanged" type="checkbox" class="h-3.5 w-3.5 rounded border-border accent-primary" />
          Solo las distintas del nicho
        </label>
        <div class="relative">
          <MagnifierIcon class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="search" placeholder="Buscar función..." aria-label="Buscar función"
            class="w-52 rounded-xl border border-border bg-surface py-2 pl-8 pr-3 text-xs text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </div>
      </div>
    </div>

    <p v-if="shownGroups.length === 0" class="rounded-2xl border border-border bg-surface py-10 text-center text-sm text-text-muted">
      Ninguna función coincide con tu búsqueda.
    </p>

    <section v-for="g in shownGroups" :key="g.group.id" class="rounded-2xl border border-border bg-surface p-5">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="text-sm font-bold text-text">{{ g.group.title }}</h3>
          <p class="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-text-muted">{{ g.group.description }}</p>
        </div>
        <span class="shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-text-muted">{{ g.on }} de {{ g.group.flags.length }} activas</span>
      </div>

      <ul class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
        <li v-for="flag in g.flags" :key="flag.key" class="flex items-center justify-between gap-4 px-4 py-3" :class="isLocked(flag.key) ? 'opacity-60' : ''">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-text">{{ flag.label }}</p>
              <span v-if="isChanged(flag.key)" class="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning"
                :title="`El nicho trae esta función ${nicheDefaults[flag.key] ? 'activada' : 'desactivada'} por defecto`">
                Distinta del nicho
              </span>
            </div>
            <p class="text-[11px] leading-relaxed text-text-muted">{{ flag.description }}</p>
            <p v-if="isLocked(flag.key)" class="mt-0.5 text-[10px] font-semibold text-warning">No disponible para el nicho «{{ nicheLabel }}»</p>
          </div>
          <button type="button" role="switch" :aria-checked="!!features[flag.key]" :aria-label="`${flag.label}: ${features[flag.key] ? 'activada' : 'desactivada'}`"
            :disabled="busy || isLocked(flag.key)" :title="isLocked(flag.key) ? `No disponible para el nicho ${nicheLabel}` : undefined"
            class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
            :class="[isLocked(flag.key) ? 'cursor-not-allowed' : '', features[flag.key] ? 'bg-primary' : 'bg-border']"
            @click="emit('toggle', flag.key)">
            <span class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" :class="features[flag.key] ? 'translate-x-4.5' : 'translate-x-0.5'" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { MagnifierIcon } from '@solar-icons/vue/linear'
import { flagMatches, flagStats, type FlagGroup } from './featureCatalog'

const props = defineProps<{
  groups: FlagGroup[]
  /** Resolved values (defaults → niche → stored → locks): what each switch shows. */
  features: Record<string, any>
  /** What a business of this niche gets with nothing stored — to flag the ones that were changed. */
  nicheDefaults: Record<string, any>
  lockedKeys: Set<string>
  busy: boolean
  nicheLabel: string
}>()

const emit = defineEmits<{ (e: 'toggle', key: string): void }>()

const search = ref('')
const onlyChanged = ref(false)

const isLocked = (key: string) => props.lockedKeys.has(key)
const isChanged = (key: string) => !isLocked(key) && !!props.features[key] !== !!props.nicheDefaults[key]

const stats = computed(() => flagStats(props.groups, props.features, props.nicheDefaults))

const shownGroups = computed(() =>
  props.groups
    .map(group => {
      const flags = group.flags.filter(f => flagMatches(f, search.value) && (!onlyChanged.value || isChanged(f.key)))
      return { group, flags, on: group.flags.filter(f => !!props.features[f.key]).length }
    })
    .filter(g => g.flags.length > 0),
)
</script>
