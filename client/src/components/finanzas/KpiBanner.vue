<template>
  <div :class="['mx-3 sm:mx-5 mt-3 sm:mt-4 mb-0 rounded-xl border border-border-subtle p-3 sm:p-4', variantBg[variant]]">
    <div class="flex items-center gap-3">
      <div :class="['p-2.5 rounded-lg border shrink-0', variantIconBg[variant], variantIconText[variant]]">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="icon" />
        </svg>
      </div>
      <div>
        <span class="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider font-semibold">{{ label }}</span>
        <div class="flex items-baseline gap-2 mt-0.5 flex-wrap">
          <span class="text-xl sm:text-2xl font-bold text-text tracking-tight tabular-nums">{{ value }}</span>
          <span class="text-xs text-text-muted font-mono">{{ sublabel }}</span>
        </div>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  variant: 'success' | 'danger' | 'warning' | 'primary'
  icon: string
  label: string
  value: string | number
  sublabel: string
}>()

const variantBg: Record<string, string> = {
  success: 'bg-gradient-to-r from-success/[0.04] to-transparent',
  danger: 'bg-gradient-to-r from-danger/[0.04] to-transparent',
  warning: 'bg-gradient-to-r from-warning/[0.04] to-transparent',
  primary: 'bg-gradient-to-r from-primary/[0.04] to-transparent',
}

const variantIconBg: Record<string, string> = {
  success: 'bg-success/10 border-success/10',
  danger: 'bg-danger/10 border-danger/10',
  warning: 'bg-warning/10 border-warning/10',
  primary: 'bg-primary/10 border-primary/10',
}

const variantIconText: Record<string, string> = {
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  primary: 'text-primary',
}
</script>
