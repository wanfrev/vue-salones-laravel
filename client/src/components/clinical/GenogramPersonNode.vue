<template>
  <div class="genogram-person" :class="{ selected }">
    <Handle id="t" type="source" :position="Position.Top" />
    <Handle id="b" type="source" :position="Position.Bottom" />
    <Handle id="l" type="source" :position="Position.Left" />
    <Handle id="r" type="source" :position="Position.Right" />

    <!-- Convención del genograma: ▢ hombre, ◯ mujer, ◇ otro; ✕ fallecido; doble contorno = paciente índice. -->
    <svg viewBox="0 0 64 64" class="h-14 w-14" role="img" :aria-label="`${PERSON_KIND_LABELS[data.kind]}${data.name ? `: ${data.name}` : ''}`">
      <rect v-if="data.kind === 'male'" x="8" y="8" width="48" height="48" class="shape" />
      <circle v-else-if="data.kind === 'female'" cx="32" cy="32" r="24" class="shape" />
      <polygon v-else points="32,6 58,32 32,58 6,32" class="shape" />
      <template v-if="data.index">
        <rect v-if="data.kind === 'male'" x="3" y="3" width="58" height="58" class="shape-index" />
        <circle v-else-if="data.kind === 'female'" cx="32" cy="32" r="29" class="shape-index" />
        <polygon v-else points="32,0 64,32 32,64 0,32" class="shape-index" />
      </template>
      <template v-if="data.deceased">
        <line x1="12" y1="12" x2="52" y2="52" class="cross" />
        <line x1="52" y1="12" x2="12" y2="52" class="cross" />
      </template>
    </svg>

    <p class="name">{{ data.name || 'Sin nombre' }}</p>
    <p v-if="data.age" class="age">{{ data.age }}{{ /^\d+$/.test(data.age) ? ' años' : '' }}</p>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { PERSON_KIND_LABELS } from './genogram'
import type { GenogramPerson } from '../../types/database'

defineProps<{
  data: Omit<GenogramPerson, 'id' | 'x' | 'y'>
  selected?: boolean
}>()
</script>

<style scoped>
.genogram-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 7.5rem;
  cursor: grab;
}
.shape { fill: var(--color-surface, #fff); stroke: var(--color-text, #111); stroke-width: 2.5; }
.shape-index { fill: none; stroke: var(--color-primary, #869c84); stroke-width: 2.5; }
.cross { stroke: var(--color-text, #111); stroke-width: 2.5; stroke-linecap: round; }
.selected .shape { stroke: var(--color-primary, #869c84); stroke-width: 3.5; }
.name { margin-top: 0.15rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; font-weight: 600; color: var(--color-text, #111); }
.age { font-size: 0.65rem; color: var(--color-text-muted, #64748b); }
:deep(.vue-flow__handle) { opacity: 0; width: 10px; height: 10px; }
.genogram-person:hover :deep(.vue-flow__handle), .selected :deep(.vue-flow__handle) { opacity: 0.9; background: var(--color-primary, #869c84); }
</style>
