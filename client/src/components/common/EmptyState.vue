<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2">
      <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
      </svg>
    </div>
    <p class="text-sm text-text-muted">{{ title }}</p>
    <p v-if="subtitle" class="text-xs text-text-muted mt-1">{{ subtitle }}</p>
    <button v-if="actionLabel" @click="$emit('action')"
      class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20">
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>
