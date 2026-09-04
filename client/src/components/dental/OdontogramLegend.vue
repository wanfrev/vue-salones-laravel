<template>
  <div class="flex flex-wrap gap-x-4 gap-y-1.5">
    <div v-for="condition in CONDITION_ORDER" :key="condition" class="flex items-center gap-1.5 text-xs text-text-secondary">
      <span class="h-3 w-3 rounded-sm border border-border" :style="{ backgroundColor: CONDITION_COLORS[condition] }" />
      {{ CONDITION_LABELS[condition] }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONDITION_COLORS, CONDITION_LABELS, CONDITION_ORDER } from './odontogramConditions'
</script>
