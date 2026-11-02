<template>
  <div class="space-y-2">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      :class="active
        ? 'bg-primary text-text-inverse shadow-sm'
        : 'bg-bg-secondary text-text-secondary hover:bg-primary/10 hover:text-primary'"
      :aria-expanded="expanded"
      title="Encuentra quién compró o se hizo un producto o servicio, o quién ya debería volver"
      @click="open = !open"
    >
      Producto o servicio
      <span v-if="active" class="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden="true" />
    </button>

    <div v-if="expanded" class="flex flex-wrap items-center gap-2">
      <input
        :value="item"
        type="search"
        placeholder="Ej.: tinte, keratina, cartera…"
        aria-label="Producto o servicio"
        :class="[fieldClass, 'min-w-0 flex-1 sm:max-w-xs']"
        @input="emit('update:item', ($event.target as HTMLInputElement).value)"
      />
      <select
        :value="mode"
        aria-label="Qué buscar"
        :class="fieldClass"
        @change="emit('update:mode', ($event.target as HTMLSelectElement).value as ItemMode)"
      >
        <option value="did">Lo compraron o se lo hicieron</option>
        <option value="lapsed">No han vuelto a hacerlo desde hace…</option>
      </select>
      <select
        v-if="mode === 'lapsed'"
        :value="days"
        aria-label="Días sin volver"
        :class="fieldClass"
        @change="emit('update:days', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="d in WINDOW_OPTIONS" :key="d" :value="d">{{ daysLabel(d) }}</option>
      </select>
    </div>

    <p v-if="expanded" class="text-xs text-text-muted" aria-live="polite">
      <template v-if="error">No se pudo consultar. Intenta de nuevo.</template>
      <template v-else-if="searching">Buscando…</template>
      <template v-else-if="truncated">Hay muchísimas coincidencias: se muestran las 2000 más recientes.</template>
      <template v-else-if="active">
        Busca en productos vendidos y servicios realizados del último año. Lo vendido o atendido sin cliente registrado no se puede atribuir.
      </template>
      <template v-else>Escribe al menos {{ ITEM_MIN_CHARS }} letras.</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ITEM_MIN_CHARS, WINDOW_OPTIONS, isItemActive, type ItemMode } from './clientFilters'

const props = defineProps<{
  item: string
  mode: ItemMode
  days: number
  searching?: boolean
  truncated?: boolean
  error?: boolean
}>()

const emit = defineEmits<{
  'update:item': [value: string]
  'update:mode': [value: ItemMode]
  'update:days': [value: number]
}>()

const open = ref(false)
const active = computed(() => isItemActive({ item: props.item }))
// Si ya hay un texto escrito el panel no se puede quedar cerrado escondiendo un filtro que sigue activo.
const expanded = computed(() => open.value || props.item.trim() !== '')

const fieldClass = 'rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden'

const daysLabel = (d: number) => (d === 180 ? '6 meses' : `${d} días`)
</script>
