<template>
  <div class="bg-bg-secondary p-1 rounded-xl border border-border-subtle inline-flex items-center gap-0.5 self-start"
    :class="{ 'sm:self-auto': $slots.extra || !$slots.default }">
    <button v-for="tab in tabs" :key="tab.key" @click="$emit('update:modelValue', tab.key)" :class="[
      'px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
      modelValue === tab.key
        ? 'bg-surface text-text shadow-sm shadow-black/5 border border-border font-semibold'
        : 'text-text-secondary hover:text-text hover:bg-surface/40'
    ]">
      <svg v-if="tab.icon" class="h-3.5 w-3.5" :class="modelValue === tab.key ? iconColorClass(tab) : ''" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path :d="tab.icon" />
      </svg>
      <span class="hidden sm:inline">{{ tab.label }}</span>
      <span class="sm:hidden">{{ tab.shortLabel || tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface SegmentedTab {
  key: string
  label: string
  shortLabel?: string
  icon?: string
  activeColor?: 'primary' | 'success' | 'warning' | 'info' | 'danger'
}

const props = defineProps<{
  tabs: SegmentedTab[]
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeColors: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  danger: 'text-danger',
}

function iconColorClass(tab: SegmentedTab): string {
  return activeColors[tab.activeColor || 'primary'] || ''
}
</script>
