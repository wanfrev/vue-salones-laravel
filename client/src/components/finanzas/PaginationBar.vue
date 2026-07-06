<template>
  <div v-if="visible" class="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle">
    <span class="text-xs text-text-muted">{{ start }}-{{ end }} de {{ total }}</span>
    <div class="flex gap-1">
      <button @click="$emit('prev')" :disabled="!hasPrev" class="rounded-md px-2 py-1 text-xs font-medium transition-theme" :class="hasPrev ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'">Anterior</button>
      <button @click="$emit('next')" :disabled="!hasNext" class="rounded-md px-2 py-1 text-xs font-medium transition-theme" :class="hasNext ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'">Siguiente</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  start: number
  end: number
  total: number
  hasPrev: boolean
  hasNext: boolean
}>()

defineEmits<{
  prev: []
  next: []
}>()
</script>
