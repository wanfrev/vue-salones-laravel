<template>
  <div class="group rounded-xl border border-border bg-surface p-3 shadow-sm transition-theme hover:shadow-md sm:p-4"
    :class="hoverBorderClass">
    <div class="flex items-center gap-2.5 sm:gap-3">
      <div
        :class="['flex h-9 w-9 items-center justify-center rounded-lg shrink-0 sm:h-10 sm:w-10 transition-theme group-hover:scale-105', iconBgClass]">
        <svg class="h-4 w-4 sm:h-5 sm:w-5" :class="iconColorClass" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
        </svg>
      </div>
      <div class="min-w-0">
        <p class="text-lg font-bold text-text tabular-nums sm:text-xl">{{ value }}</p>
        <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted sm:text-xs">{{ label }}</p>
        <p v-if="sublabel" class="text-xs text-text-muted">{{ sublabel }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon: string
  iconColor?: 'primary' | 'success' | 'warning' | 'info'
  value: string | number
  label: string
  sublabel?: string
}>(), {
  iconColor: 'primary',
})

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'hover:border-primary/30' },
  success: { bg: 'bg-success/10', text: 'text-success', border: 'hover:border-success/30' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'hover:border-warning/30' },
  info: { bg: 'bg-info/10', text: 'text-info', border: 'hover:border-info/30' },
}

const colors = computed(() => colorMap[props.iconColor])
const iconBgClass = computed(() => colors.value.bg)
const iconColorClass = computed(() => colors.value.text)
const hoverBorderClass = computed(() => colors.value.border)
</script>
