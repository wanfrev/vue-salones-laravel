<template>
  <Teleport to="body">
    <div v-if="state" ref="el" role="tooltip" data-testid="hover-card"
      class="pointer-events-none fixed z-[95] w-64 rounded-lg border border-border bg-surface p-3 text-xs shadow-lg"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px`, visibility: measured ? 'visible' : 'hidden' }">
      <div class="flex items-center justify-between gap-2 text-text-secondary">
        <span class="tabular-nums">{{ state.summary.timeRange }}</span>
        <span class="inline-flex items-center gap-1.5 font-medium" :class="textClass(state.summary.status)">
          <span class="h-2 w-2 rounded-full" :class="dotClass(state.summary.status)" />{{ state.summary.statusLabel }}
        </span>
      </div>
      <p class="mt-2 text-sm font-semibold leading-tight text-text">{{ state.summary.clientName }}</p>
      <p v-if="state.summary.petName" class="mt-0.5 font-medium text-primary/80">{{ state.summary.petName }}</p>

      <ul class="mt-2 space-y-1 border-t border-border-subtle pt-2">
        <li v-for="(s, i) in state.summary.services" :key="i" class="flex items-baseline justify-between gap-3">
          <span class="text-text">{{ s.name }}</span>
          <span v-if="s.detail" class="shrink-0 tabular-nums text-text-muted">{{ s.detail }}</span>
        </li>
      </ul>
      <div v-if="state.summary.total" class="mt-1.5 flex items-baseline justify-between border-t border-border-subtle pt-1.5 font-semibold text-text">
        <span>Total · {{ state.summary.duration }}</span><span class="tabular-nums">{{ state.summary.total }}</span>
      </div>
      <p v-else class="mt-1.5 text-text-muted">Duración {{ state.summary.duration }}</p>

      <p v-if="state.summary.employeeName" class="mt-2 border-t border-border-subtle pt-2 text-text-secondary">{{ state.summary.employeeName }}</p>
      <p v-if="state.summary.notes" class="mt-1 line-clamp-2 italic text-text-muted">{{ state.summary.notes }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { placeCard } from './hoverCard'
import type { HoverState } from './useHoverCard'

const props = defineProps<{ state: HoverState | null }>()

const el = ref<HTMLElement | null>(null)
const pos = ref({ x: 0, y: 0 })
const measured = ref(false)

// Se mide ya dibujada (la altura depende de cuántos servicios traiga) y se oculta hasta colocarla para que no salte.
watch(() => props.state, async s => {
  measured.value = false
  if (!s) return
  await nextTick()
  const box = el.value
  if (!box) return
  pos.value = placeCard(s.anchor, { width: box.offsetWidth, height: box.offsetHeight }, { width: window.innerWidth, height: window.innerHeight })
  measured.value = true
}, { flush: 'post' })

const DOT: Record<string, string> = { confirmed: 'bg-warning', pending: 'bg-danger', paid: 'bg-success', cancelled: 'bg-danger', no_show: 'bg-danger' }
const TEXT: Record<string, string> = { confirmed: 'text-warning', pending: 'text-danger', paid: 'text-success', cancelled: 'text-danger', no_show: 'text-danger' }
const dotClass = (s: string) => DOT[s] ?? 'bg-primary'
const textClass = (s: string) => TEXT[s] ?? 'text-text'
</script>
