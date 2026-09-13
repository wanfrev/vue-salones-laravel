<template>
  <div class="odontogram">
    <svg :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" class="w-full select-none" role="img" aria-label="Odontograma">
      <defs>
        <clipPath v-for="(d, shapeId) in TOOTH_SHAPE_PATHS" :key="shapeId" :id="`odontogram-clip-${shapeId}`" clipPathUnits="userSpaceOnUse">
          <path :d="d" />
        </clipPath>
      </defs>
      <g v-for="row in rows" :key="row.arch">
        <g v-for="(layout, i) in row.teeth" :key="layout.tooth" :transform="`translate(${i * (CELL + GAP)}, ${row.y})`">
          <text :x="CELL / 2" :y="row.arch === 'upper' ? -8 : CELL + 16" text-anchor="middle" class="fill-text-muted text-[9px] font-semibold">
            {{ layout.tooth }}
          </text>
          <g :transform="mirrorTransform(layout)">
            <g :clip-path="`url(#odontogram-clip-${shapeFor(layout.tooth)})`">
              <polygon
                v-for="side in (['top', 'bottom', 'left', 'right', 'center'] as const)"
                :key="side"
                :points="pointsFor(side)"
                class="cursor-pointer transition-opacity hover:opacity-75"
                :fill="faceColor(layout, side)"
                @click="onFaceClick(layout, side, $event)"
              />
            </g>
            <path :d="TOOTH_SHAPE_PATHS[shapeFor(layout.tooth)]" fill="none" class="stroke-border" stroke-width="1.4" />
          </g>
          <circle
            v-if="hasEndoAnnex(layout.tooth)"
            :cx="CELL - 4"
            :cy="row.arch === 'upper' ? -4 : CELL + 4"
            r="4.5"
            class="fill-primary stroke-surface"
            stroke-width="1.2"
          >
            <title>Diente {{ layout.tooth }}: tiene anexo de endodoncia</title>
          </circle>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DentalCondition, DentalFace, DentalTeeth } from '../../types/database'
import { CONDITION_COLORS } from './odontogramConditions'
import { UPPER_ARCH, LOWER_ARCH, facesForTooth, mirrorFor, toothCellShapes, type ToothLayout } from './odontogramGeometry'
import { TOOTH_SHAPE_PATHS, shapeForTooth } from './odontogramShapes'

const props = withDefaults(defineProps<{
  teeth: DentalTeeth
  /** Tooth numbers that already have an endodoncia annex — drawn as a small badge on the cell. */
  teethWithEndoAnnex?: number[]
}>(), {
  teethWithEndoAnnex: () => [],
})

const emit = defineEmits<{
  'face-click': [tooth: number, face: DentalFace, position: { x: number; y: number }]
}>()

const CELL = 40
const GAP = 10

const viewBoxWidth = computed(() => UPPER_ARCH.length * (CELL + GAP))
const viewBoxHeight = 40 + CELL * 2 + GAP + 40

const rows = computed(() => [
  { arch: 'upper' as const, y: 30, teeth: UPPER_ARCH },
  { arch: 'lower' as const, y: 30 + CELL + GAP, teeth: LOWER_ARCH },
])

type CellSide = 'top' | 'bottom' | 'left' | 'right' | 'center'

const cellShapes = toothCellShapes(0, 0, CELL)

function pointsFor(side: CellSide): string {
  return cellShapes[side]
}

function shapeFor(tooth: number) {
  return shapeForTooth(tooth)
}

/** Places the canonically-drawn silhouette (and its clip) correctly for this tooth's quadrant/arch. */
function mirrorTransform(layout: ToothLayout): string {
  const { flipX, flipY } = mirrorFor(layout)
  const tx = flipX === -1 ? CELL : 0
  const ty = flipY === -1 ? CELL : 0
  return `translate(${tx},${ty}) scale(${flipX},${flipY})`
}

function faceNameFor(layout: ToothLayout, side: CellSide): DentalFace | null {
  if (side === 'center') return 'oclusal'
  return facesForTooth(layout)[side]
}

function conditionFor(layout: ToothLayout, side: CellSide): DentalCondition {
  const face = faceNameFor(layout, side)
  if (!face) return 'sano'
  return props.teeth[String(layout.tooth)]?.[face] ?? 'sano'
}

function faceColor(layout: ToothLayout, side: CellSide): string {
  return CONDITION_COLORS[conditionFor(layout, side)]
}

const endoAnnexTeeth = computed(() => new Set(props.teethWithEndoAnnex))
function hasEndoAnnex(tooth: number): boolean {
  return endoAnnexTeeth.value.has(tooth)
}

function onFaceClick(layout: ToothLayout, side: CellSide, event: MouseEvent) {
  const face = faceNameFor(layout, side)
  if (!face) return
  emit('face-click', layout.tooth, face, { x: event.clientX, y: event.clientY })
}
</script>
