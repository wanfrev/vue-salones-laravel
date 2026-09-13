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
          <!-- Rendered outside the mirrored group so ICDAS/Black text never appears flipped. -->
          <g v-for="item in codedFacesFor(layout)" :key="item.side">
            <circle :cx="item.pos.x" :cy="item.pos.y" r="7" class="fill-text stroke-surface" stroke-width="1" />
            <text :x="item.pos.x" :y="item.pos.y" text-anchor="middle" dominant-baseline="central" class="fill-white text-[7px] font-bold">{{ item.code }}</text>
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
import type { DentalCondition, DentalFace, DentalTeeth, DentalTeethCodes } from '../../types/database'
import { CONDITION_COLORS } from './odontogramConditions'
import {
  UPPER_ARCH, LOWER_ARCH, PRIMARY_UPPER_ARCH, PRIMARY_LOWER_ARCH,
  facesForTooth, mirrorFor, toothCellShapes, type ToothLayout,
} from './odontogramGeometry'
import { TOOTH_SHAPE_PATHS, shapeForTooth } from './odontogramShapes'

const props = withDefaults(defineProps<{
  teeth: DentalTeeth
  /** Tooth numbers that already have an endodoncia annex — drawn as a small badge on the cell. */
  teethWithEndoAnnex?: number[]
  /** ICDAS (caries)/Black (obturado) codes per face — drawn as a small numbered badge. */
  codes?: DentalTeethCodes
  /** Which arch set to render/edit — permanent (default) or primary/deciduous. */
  denticion?: 'permanente' | 'temporal'
}>(), {
  teethWithEndoAnnex: () => [],
  codes: () => ({}),
  denticion: 'permanente',
})

const emit = defineEmits<{
  'face-click': [tooth: number, face: DentalFace, position: { x: number; y: number }]
}>()

const CELL = 40
const GAP = 10

const rows = computed(() => props.denticion === 'temporal'
  ? [
      { arch: 'upper' as const, y: 30, teeth: PRIMARY_UPPER_ARCH },
      { arch: 'lower' as const, y: 30 + CELL + GAP, teeth: PRIMARY_LOWER_ARCH },
    ]
  : [
      { arch: 'upper' as const, y: 30, teeth: UPPER_ARCH },
      { arch: 'lower' as const, y: 30 + CELL + GAP, teeth: LOWER_ARCH },
    ])

const viewBoxWidth = computed(() => rows.value[0].teeth.length * (CELL + GAP))
const viewBoxHeight = 40 + CELL * 2 + GAP + 40

type CellSide = 'top' | 'bottom' | 'left' | 'right' | 'center'
const ALL_SIDES: CellSide[] = ['top', 'bottom', 'left', 'right', 'center']

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

/** Same mirroring as mirrorTransform, applied numerically to one point instead of via SVG
 * transform — used for the code badges, which must stay upright (unflipped) text. */
function mirroredPoint(layout: ToothLayout, lx: number, ly: number): { x: number; y: number } {
  const { flipX, flipY } = mirrorFor(layout)
  const tx = flipX === -1 ? CELL : 0
  const ty = flipY === -1 ? CELL : 0
  return { x: tx + flipX * lx, y: ty + flipY * ly }
}

function localAnchor(side: CellSide): { x: number; y: number } {
  const pad = 8
  if (side === 'center') return { x: CELL / 2, y: CELL / 2 }
  if (side === 'top') return { x: CELL / 2, y: pad }
  if (side === 'bottom') return { x: CELL / 2, y: CELL - pad }
  if (side === 'left') return { x: pad, y: CELL / 2 }
  return { x: CELL - pad, y: CELL / 2 }
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

function codedFacesFor(layout: ToothLayout): { side: CellSide; code: string; pos: { x: number; y: number } }[] {
  const result: { side: CellSide; code: string; pos: { x: number; y: number } }[] = []
  for (const side of ALL_SIDES) {
    const face = faceNameFor(layout, side)
    if (!face) continue
    const entry = props.codes[String(layout.tooth)]?.[face]
    if (!entry) continue
    const code = entry.icdas != null ? String(entry.icdas) : entry.black
    if (!code) continue
    const anchor = localAnchor(side)
    result.push({ side, code, pos: mirroredPoint(layout, anchor.x, anchor.y) })
  }
  return result
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
