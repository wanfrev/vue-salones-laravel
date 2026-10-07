<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full" role="img" :aria-label="`Línea de vida con ${events.length} eventos`">
    <!-- Franjas: arriba lo positivo, abajo lo negativo -->
    <rect x="0" y="0" :width="W" :height="layout.baseline" class="fill-success/5" />
    <rect x="0" :y="layout.baseline" :width="W" :height="H - layout.baseline" class="fill-danger/5" />
    <line :x1="PAD" :y1="layout.baseline" :x2="W - PAD" :y2="layout.baseline" stroke="var(--color-border, #e2e8f0)" stroke-width="1.5" />

    <g v-for="t in layout.ticks" :key="t.year">
      <line :x1="t.x" :y1="layout.baseline - 4" :x2="t.x" :y2="layout.baseline + 4" stroke="var(--color-text-muted, #94a3b8)" />
      <text :x="t.x" :y="H - 6" text-anchor="middle" class="fill-text-muted" font-size="11">{{ t.year }}</text>
    </g>

    <polyline v-if="layout.points.length > 1" :points="line" fill="none" stroke="var(--color-primary, #869c84)" stroke-width="2" stroke-linejoin="round" />

    <g v-for="p in layout.points" :key="p.id" class="cursor-pointer" @click="$emit('select', p.id)">
      <line :x1="p.x" :y1="layout.baseline" :x2="p.x" :y2="p.y" :stroke="VALENCE_COLORS[p.event.valence]" stroke-width="1" stroke-dasharray="2 3" />
      <circle :cx="p.x" :cy="p.y" :r="p.id === selectedId ? 9 : 7" :fill="VALENCE_COLORS[p.event.valence]" stroke="white" stroke-width="2" />
      <title>{{ p.event.year }} — {{ p.event.title }} ({{ VALENCE_LABELS[p.event.valence] }})</title>
      <text :x="p.x" :y="p.event.valence >= 0 ? p.y - 13 : p.y + 20" :text-anchor="anchorFor(p.x)" class="fill-text" font-size="10.5" font-weight="600">
        {{ shorten(p.event.title) }}
      </text>
    </g>

    <text v-if="events.length === 0" :x="W / 2" :y="H / 2" text-anchor="middle" class="fill-text-muted" font-size="13">Agrega eventos para ver la línea de vida</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VALENCE_COLORS, VALENCE_LABELS, chartLayout } from './lifeLine'
import type { LifeEvent } from '../../types/database'

const props = defineProps<{ events: LifeEvent[]; selectedId?: string | null }>()
defineEmits<{ select: [id: string] }>()

const W = 760
const H = 330 // alto extra: el rótulo de un evento muy negativo no debe chocar con los años del eje
const PAD = 36
const PAD_Y = 46
const LABEL_ROOM = 95 // ancho aprox. de un rótulo: cerca de los bordes se alinea hacia adentro para no cortarse

const layout = computed(() => chartLayout(props.events.filter(e => Number.isInteger(e.year)), { width: W, height: H, padX: PAD, padY: PAD_Y }))
const line = computed(() => layout.value.points.map(p => `${p.x},${p.y}`).join(' '))
const anchorFor = (x: number) => (x < LABEL_ROOM ? 'start' : x > W - LABEL_ROOM ? 'end' : 'middle')
const shorten = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s)
</script>
