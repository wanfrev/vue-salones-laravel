<template>
  <svg v-if="scores.length > 1" :viewBox="`0 0 ${W} ${H}`" class="h-12 w-full max-w-[14rem]" role="img" :aria-label="`Evolución del puntaje: ${scores.join(', ')}`">
    <polyline :points="points" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle v-for="(p, i) in coords" :key="i" :cx="p.x" :cy="p.y" r="2.5" fill="var(--color-primary)" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Puntajes en orden cronológico (más antiguo primero). */
  scores: number[]
  max: number
}>()

const W = 140
const H = 48
const PAD = 5

const coords = computed(() => {
  const n = props.scores.length
  return props.scores.map((s, i) => ({
    x: PAD + (n === 1 ? 0 : (i / (n - 1)) * (W - PAD * 2)),
    y: H - PAD - (Math.min(s, props.max) / props.max) * (H - PAD * 2),
  }))
})

const points = computed(() => coords.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
</script>
