<template>
  <nav class="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Herramientas clínicas">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.key"
      :title="`${tab.label} (tecla ${tab.shortcut})`"
      @click="$emit('update:modelValue', tab.key)"
      class="relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-theme"
      :class="modelValue === tab.key
        ? 'border-primary bg-primary/10 text-primary shadow-sm'
        : 'border-border bg-surface text-text-secondary hover:border-primary/30 hover:bg-primary/5 hover:text-text'"
    >
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        :class="modelValue === tab.key ? 'bg-primary/15' : 'bg-bg-secondary'"
      >
        <component :is="tab.icon" class="h-4 w-4" />
      </span>
      <span class="hidden sm:inline">{{ tab.label }}</span>
      <span class="sm:hidden">{{ tab.shortLabel || tab.label }}</span>
      <span
        class="h-1.5 w-1.5 shrink-0 rounded-full"
        :class="dotClass(tab)"
        :title="tab.isLoading ? 'Cargando...' : tab.hasData ? 'Con información registrada' : 'Sin información aún'"
      ></span>
      <span class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface text-[9px] font-bold text-text-muted opacity-70">
        {{ tab.shortcut }}
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface DentalNavTab {
  key: string
  label: string
  shortLabel?: string
  icon: Component
  /** Whether this section already has clinical data recorded for the current patient. */
  hasData: boolean
  isLoading?: boolean
  /** Number key (1-9) that jumps straight to this tab. */
  shortcut: number
}

defineProps<{
  tabs: DentalNavTab[]
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

function dotClass(tab: DentalNavTab): string {
  if (tab.isLoading) return 'animate-pulse bg-text-muted/30'
  return tab.hasData ? 'bg-success' : 'border border-text-muted/40'
}
</script>
