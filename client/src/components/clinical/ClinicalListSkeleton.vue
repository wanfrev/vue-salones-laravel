<template>
  <ul class="divide-y divide-border-subtle" aria-hidden="true" data-testid="list-skeleton">
    <li v-for="i in rows" :key="i" class="animate-pulse space-y-2 px-3 py-3.5 sm:px-4">
      <div class="h-3 w-1/3 rounded bg-bg-secondary" />
      <div class="h-2.5 w-1/2 rounded bg-bg-secondary/70" />
    </li>
  </ul>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>
