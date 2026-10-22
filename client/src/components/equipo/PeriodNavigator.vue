<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <!-- Modo: Día / Semana / Mes… (se oculta si solo hay uno) -->
    <div v-if="modes.length > 1" class="inline-flex shrink-0 items-center rounded-lg bg-bg-secondary p-0.5" role="tablist" aria-label="Periodo">
      <button
        v-for="m in modes"
        :key="m.key"
        type="button"
        role="tab"
        :aria-selected="mode === m.key"
        class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
        :class="mode === m.key ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'"
        @click="emit('update:mode', m.key)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Mes: selector nativo + «Este mes» -->
    <div v-if="mode === 'month'" class="flex items-center gap-1.5">
      <input
        :value="monthValue"
        type="month"
        aria-label="Mes"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text outline-none transition-theme focus:border-primary"
        @change="onMonthChange"
      />
      <button
        v-if="!isCurrent"
        type="button"
        class="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        @click="emit('today')"
      >
        {{ todayLabel }}
      </button>
    </div>

    <!-- Día / Semana: flechas + etiqueta -->
    <div v-else-if="mode === 'day' || mode === 'week'" class="flex items-center gap-1">
      <button type="button" class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text" aria-label="Anterior" @click="emit('prev')">
        <ArrowLeftIcon :size="16" />
      </button>
      <span class="min-w-[8.5rem] text-center text-xs font-semibold text-text">{{ label }}</span>
      <button
        type="button"
        :disabled="isCurrent"
        class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Siguiente"
        @click="emit('next')"
      >
        <ArrowRightIcon :size="16" />
      </button>
      <button
        v-if="!isCurrent"
        type="button"
        class="ml-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        @click="emit('today')"
      >
        Hoy
      </button>
    </div>

    <!-- Todo / Rango: solo dice qué se está viendo -->
    <p v-else class="text-xs text-text-muted">Viendo: <span class="font-semibold text-text">{{ label }}</span></p>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import type { PeriodMode } from './payrollPeriods'

withDefaults(defineProps<{
  modes: { key: PeriodMode; label: string }[]
  mode: PeriodMode
  /** Texto del periodo: «19-25 Octubre 2026». */
  label: string
  /** ¿Ya es el periodo actual? Bloquea «siguiente» y oculta el botón de volver al actual. */
  isCurrent: boolean
  /** Valor del selector de mes, 'YYYY-MM'. */
  monthValue?: string
  todayLabel?: string
}>(), { monthValue: '', todayLabel: 'Este mes' })

const emit = defineEmits<{
  'update:mode': [mode: PeriodMode]
  'update:month': [value: string]
  prev: []
  next: []
  today: []
}>()

function onMonthChange(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) emit('update:month', value)
}
</script>
