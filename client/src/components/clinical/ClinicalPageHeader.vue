<template>
  <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <component :is="icon" class="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ title }}</h1>
      </div>
      <p v-if="description" class="mt-1 max-w-2xl text-xs text-text-muted sm:text-sm">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="flex shrink-0 flex-wrap items-center gap-2"><slot /></div>
  </header>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description?: string
  icon: Component
}>()
</script>
