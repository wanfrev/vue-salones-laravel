<template>
  <div>
    <div class="mb-1 flex items-center gap-2">
      <svg class="h-3.5 w-3.5 shrink-0" :class="tone === 'info' ? 'text-info' : 'text-warning'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
      </svg>
      <span class="text-[10.5px] font-bold uppercase tracking-widest text-text-muted">{{ title }}</span>
    </div>
    <p v-if="description" class="mb-1.5 pl-[22px] text-xs leading-relaxed text-text-muted">{{ description }}</p>
    <div class="pl-[22px]"><slot /></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  /** SVG path (`d`) of the 24×24 outline icon shown before the title. */
  icon: string
  tone?: 'warning' | 'info'
}>(), { tone: 'warning' })
</script>
