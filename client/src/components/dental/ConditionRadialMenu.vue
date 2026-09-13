<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[90]" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
    <div class="fixed z-[100]" :style="{ left: `${center.x}px`, top: `${center.y}px` }">
      <div
        v-if="hoveredLabel"
        class="absolute -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2.5 py-1 text-xs font-semibold text-text-inverse shadow-lg"
        :style="{ left: '0px', top: `${-radius - 44}px` }"
      >
        {{ hoveredLabel }}
      </div>

      <button
        type="button"
        class="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-surface text-primary shadow-lg transition-theme hover:bg-primary/10"
        :title="hasEndoAnnex ? 'Ver anexo de endodoncia' : 'Crear anexo de endodoncia'"
        @click="emit('open-endo')"
        @mouseenter="hoveredLabel = hasEndoAnnex ? 'Ver anexo de endodoncia' : 'Crear anexo de endodoncia'"
        @mouseleave="hoveredLabel = ''"
      >
        <DocumentTextIcon class="h-5 w-5" />
        <span v-if="hasEndoAnnex" class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface" />
      </button>

      <button
        v-for="(condition, i) in conditions"
        :key="condition"
        type="button"
        class="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-md transition-transform hover:z-10 hover:scale-125"
        :style="{
          left: `${petalOffset(i).x}px`,
          top: `${petalOffset(i).y}px`,
          backgroundColor: CONDITION_COLORS[condition],
          borderColor: activeCondition === condition ? 'var(--color-text)' : 'var(--color-surface)',
        }"
        :title="CONDITION_LABELS[condition]"
        @click="emit('select', condition)"
        @mouseenter="hoveredLabel = CONDITION_LABELS[condition]"
        @mouseleave="hoveredLabel = ''"
      >
        <svg v-if="activeCondition === condition" class="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { DocumentTextIcon } from '@solar-icons/vue/linear'
import { CONDITION_COLORS, CONDITION_LABELS, CONDITION_ORDER } from './odontogramConditions'
import type { DentalCondition } from '../../types/database'

const props = defineProps<{
  x: number
  y: number
  activeCondition?: DentalCondition | null
  hasEndoAnnex?: boolean
}>()

const emit = defineEmits<{
  select: [condition: DentalCondition]
  'open-endo': []
  close: []
}>()

const conditions = CONDITION_ORDER
const radius = 78
const hoveredLabel = ref('')

// Clamp so the menu's full footprint (orbit radius + petal size) never runs off the viewport —
// this is a fixed-position popup that can open from a click anywhere near a screen edge. The top
// margin is taller than the others: the hover label floats above the ring (-radius - 44px), so a
// tooth clicked near the top of the screen needs extra headroom or the label itself gets clipped.
const center = computed(() => {
  const margin = radius + 28
  const topMargin = radius + 44 + 28
  const x = Math.min(Math.max(props.x, margin), window.innerWidth - margin)
  const y = Math.min(Math.max(props.y, topMargin), window.innerHeight - margin)
  return { x, y }
})

function petalOffset(index: number): { x: number; y: number } {
  const angle = (index / conditions.length) * 2 * Math.PI - Math.PI / 2
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
