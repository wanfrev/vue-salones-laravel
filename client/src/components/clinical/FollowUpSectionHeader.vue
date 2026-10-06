<template>
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-base font-bold text-text">{{ title }}</h2>
      <p class="text-xs text-text-muted">{{ hint }}</p>
    </div>
    <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="TONES[tone]">{{ count }}</span>
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
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-bg-secondary text-text-secondary',
} as const
</script>
