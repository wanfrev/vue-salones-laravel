<template>
  <div class="card-hairline group rounded-xl p-3 shadow-sm transition-theme hover:shadow-md sm:p-4"
    :class="hoverBorderClass">
    <div class="flex items-center gap-2.5 sm:gap-3">
      <svg class="h-5 w-5 shrink-0 opacity-70 transition-theme group-hover:opacity-100 sm:h-6 sm:w-6" :class="iconColorClass"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
        <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
      </svg>
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

const colorMap: Record<string, { text: string; border: string }> = {
  primary: { text: 'text-primary', border: 'hover:border-primary/30' },
  success: { text: 'text-success', border: 'hover:border-success/30' },
  warning: { text: 'text-warning', border: 'hover:border-warning/30' },
  info: { text: 'text-info', border: 'hover:border-info/30' },
}

const colors = computed(() => colorMap[props.iconColor])
const iconColorClass = computed(() => colors.value.text)
const hoverBorderClass = computed(() => colors.value.border)
</script>
