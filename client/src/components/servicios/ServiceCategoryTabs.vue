<template>
  <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Categorías">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === cat.id"
      class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
      :class="modelValue === cat.id ? 'text-primary' : 'text-text-secondary hover:text-text'"
      @click="emit('update:modelValue', cat.id)"
    >
      {{ cat.name }}
      <span v-if="modelValue === cat.id" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  categories: { id: string; name: string }[]
  modelValue: string
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
</script>
