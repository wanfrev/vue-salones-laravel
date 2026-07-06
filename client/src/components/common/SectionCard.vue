<template>
  <div class="rounded-xl border border-border bg-surface shadow-sm" :class="{ 'overflow-hidden': !noOverflow }">
    <div v-if="title || $slots.header" class="flex items-center justify-between border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div class="flex items-center gap-2">
        <div v-if="icon" class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
          </svg>
        </div>
        <div>
          <h3 v-if="title" class="text-sm font-semibold text-text">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-text-muted">{{ subtitle }}</p>
        </div>
      </div>
      <slot name="header-actions" />
    </div>
    <div :class="{ 'p-3 sm:p-5': !noPadding }">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t border-border-subtle px-3 sm:px-5 py-3">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  icon?: string
  noPadding?: boolean
  noOverflow?: boolean
}>()
</script>
