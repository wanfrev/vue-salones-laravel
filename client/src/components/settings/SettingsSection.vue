<template>
  <section>
    <header class="mb-7 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-text">{{ title }}</h1>
        <p v-if="description" class="mt-0.5 max-w-2xl text-xs leading-relaxed text-text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
