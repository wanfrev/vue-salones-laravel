<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="textClass">
    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Recibe el mapa de colores que ya existe (p. ej. RISK_TONE: «bg-danger/10 text-danger») y se queda
// solo con el color del texto: el punto y la palabra comparten color, sin cápsula de fondo.
const props = defineProps<{ tone: string }>()

const textClass = computed(() => props.tone.split(/\s+/).find(c => c.startsWith('text-')) ?? 'text-text-secondary')
</script>
