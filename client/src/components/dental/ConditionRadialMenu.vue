<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[90]" @click="emit('close')" @contextmenu.prevent="emit('close')"></div>
    <div class="fixed z-[100]" :style="{ left: `${center.x}px`, top: `${center.y}px` }">
      <!-- Step 2: code picker (ICDAS or Black) for a condition that needs one -->
      <div
        v-if="pendingCondition"
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-3 shadow-xl"
        style="width: 15rem"
        @click.stop
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <button type="button" class="text-text-muted transition-theme hover:text-text" title="Volver" @click="pendingCondition = null">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <p class="text-xs font-bold uppercase tracking-wide text-text">
            {{ codeKind === 'icdas' ? 'Severidad ICDAS' : 'Clasificación de Black' }}
          </p>
          <span class="h-4 w-4"></span>
        </div>
        <div class="flex flex-wrap justify-center gap-1.5">
          <button
            v-for="code in codeKind === 'icdas' ? ICDAS_CODES : BLACK_CODES"
            :key="code"
            type="button"
            class="flex h-8 min-w-8 items-center justify-center rounded-lg border-2 px-1.5 text-xs font-bold transition-theme"
            :class="isActiveCode(code)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-bg-secondary text-text-secondary hover:border-primary/40'"
            @click="chooseCode(code)"
          >
            {{ code }}
          </button>
        </div>
        <button type="button" class="mt-2 w-full text-center text-[11px] font-medium text-text-muted underline-offset-2 hover:text-text hover:underline" @click="skipCode">
          Marcar sin código
        </button>
      </div>

      <!-- Step 1: condition ring -->
      <template v-else>
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
          :title="codeKindFor(condition) ? `${CONDITION_LABELS[condition]} (elegir código)` : CONDITION_LABELS[condition]"
          @click="onConditionClick(condition)"
          @mouseenter="hoveredLabel = CONDITION_LABELS[condition]"
          @mouseleave="hoveredLabel = ''"
        >
          <svg v-if="activeCondition === condition" class="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { DocumentTextIcon, ArrowLeftIcon } from '@solar-icons/vue/linear'
import { CONDITION_COLORS, CONDITION_LABELS, CONDITION_ORDER } from './odontogramConditions'
import type { DentalCondition } from '../../types/database'

const props = defineProps<{
  x: number
  y: number
  activeCondition?: DentalCondition | null
  activeIcdas?: number | null
  activeBlack?: string | null
  hasEndoAnnex?: boolean
}>()

const emit = defineEmits<{
  select: [condition: DentalCondition, code?: number | string]
  'open-endo': []
  close: []
}>()

const conditions = CONDITION_ORDER
const radius = 78
const hoveredLabel = ref('')
const pendingCondition = ref<DentalCondition | null>(null)

const ICDAS_CODES = [0, 1, 2, 3, 4, 5, 6]
const BLACK_CODES = ['I', 'II', 'III', 'IV', 'V', 'VI']

/** Only these two conditions carry a clinical code — caries severity (ICDAS) and restoration
 * location (G.V. Black). Every other condition saves immediately, same as before. */
function codeKindFor(condition: DentalCondition): 'icdas' | 'black' | null {
  if (condition === 'caries') return 'icdas'
  if (condition === 'obturado') return 'black'
  return null
}

const codeKind = computed(() => (pendingCondition.value ? codeKindFor(pendingCondition.value) : null))

function isActiveCode(code: number | string): boolean {
  if (codeKind.value === 'icdas') return props.activeIcdas === code
  return props.activeBlack === code
}

function onConditionClick(condition: DentalCondition) {
  if (codeKindFor(condition)) {
    pendingCondition.value = condition
  } else {
    emit('select', condition)
  }
}

function chooseCode(code: number | string) {
  if (!pendingCondition.value) return
  emit('select', pendingCondition.value, code)
  pendingCondition.value = null
}

function skipCode() {
  if (!pendingCondition.value) return
  emit('select', pendingCondition.value)
  pendingCondition.value = null
}

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
  if (e.key !== 'Escape') return
  if (pendingCondition.value) {
    pendingCondition.value = null
  } else {
    emit('close')
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
