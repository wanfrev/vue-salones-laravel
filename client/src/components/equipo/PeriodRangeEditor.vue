<template>
  <div class="flex flex-wrap items-end gap-x-3 gap-y-2">
    <label class="block">
      <span class="mb-1 block text-[11px] font-semibold text-text-muted">{{ fromLabel }}</span>
      <input
        :value="start"
        type="date"
        :max="end || undefined"
        :class="inputClass"
        @input="emit('update:start', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label class="block">
      <span class="mb-1 block text-[11px] font-semibold text-text-muted">{{ toLabel }}</span>
      <input
        :value="end"
        type="date"
        :min="start || undefined"
        :class="inputClass"
        @input="emit('update:end', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="p in RANGE_PRESETS"
        :key="p.key"
        type="button"
        class="rounded-full bg-bg-secondary px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
        @click="emit('preset', p.key)"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RANGE_PRESETS, type RangePreset } from './payrollPeriods'

withDefaults(defineProps<{
  start: string
  end: string
  fromLabel?: string
  toLabel?: string
}>(), { fromLabel: 'Desde', toLabel: 'Hasta' })

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
  preset: [preset: RangePreset]
}>()

const inputClass = 'rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary'
</script>
