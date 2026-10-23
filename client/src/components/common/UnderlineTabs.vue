<template>
  <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.value"
      class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
      :class="modelValue === t.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
      @click="emit('update:modelValue', t.value)"
    >
      {{ t.label }}
      <span v-if="modelValue === t.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
defineProps<{
  tabs: Array<{ value: T; label: string }>
  modelValue: T
  ariaLabel?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>
