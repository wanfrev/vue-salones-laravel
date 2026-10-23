<template>
  <div class="mb-1 flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h2 class="text-sm font-semibold text-text">{{ title }}</h2>
      <p class="text-xs text-text-muted">{{ hint }}</p>
    </div>
    <span class="shrink-0 text-lg font-bold leading-none tabular-nums" :class="TONES[tone]">{{ count }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  hint: string
  count: number
  tone: 'danger' | 'warning' | 'muted'
}>()

const TONES = {
  danger: 'text-danger',
  warning: 'text-warning',
  muted: 'text-text-secondary',
} as const
</script>
