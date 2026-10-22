<template>
  <div>
    <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
      <div class="relative">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          :value="search"
          type="text"
          :placeholder="placeholder"
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Vista del inventario">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.value"
        class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
        :class="activeTab === tab.value ? 'text-primary' : 'text-text-secondary hover:text-text'"
        @click="emit('update:activeTab', tab.value)"
      >
        {{ tab.label }}
        <span v-if="activeTab === tab.value" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MagnifierIcon } from '@solar-icons/vue/linear'

defineProps<{
  search: string
  placeholder: string
  activeTab: string
  tabs: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:activeTab': [value: string]
}>()
</script>
