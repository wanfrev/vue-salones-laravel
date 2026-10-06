<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <template v-else>
      <div class="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
        <LifeLineChart :events="events" :selected-id="selectedId" @select="selectedId = $event" />
        <p class="mt-1 text-center text-xs text-text-muted">{{ lifeLineSummary(events) }} · arriba lo positivo, abajo lo negativo</p>
      </div>

      <div class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Eventos</p>
          <button type="button" @click="addEvent" class="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">+ Agregar evento</button>
        </div>

        <p v-if="events.length === 0" class="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
          Registra los hechos importantes de la vida del paciente (nacimientos, mudanzas, pérdidas, logros...) y qué tan positivos o negativos fueron.
        </p>

        <div
          v-for="e in events"
          :key="e.id"
          class="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[6rem_1fr_11rem_auto]"
          :class="e.id === selectedId ? 'border-primary bg-primary/5' : 'border-border-subtle'"
          @click="selectedId = e.id"
        >
          <div>
            <FormInput :model-value="e.year" @update:model-value="patch(e.id, { year: Number($event) })" type="number" label="Año" />
            <p v-if="ageHint(e)" class="mt-1 text-[11px] text-text-muted">≈ {{ ageHint(e) }} años</p>
          </div>
          <FormInput :model-value="e.title" @update:model-value="patch(e.id, { title: $event as string })" label="Qué pasó" placeholder="Ej: Se mudó a otra ciudad" />
          <FormSelect :model-value="String(e.valence)" @update:model-value="patch(e.id, { valence: Number($event) as LifeValence })" label="Impacto" :options="VALENCE_OPTIONS" />
          <button type="button" @click.stop="remove(e.id)" class="self-end rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5" aria-label="Quitar evento">Quitar</button>
          <div class="sm:col-span-4">
            <FormTextarea :model-value="e.note" @update:model-value="patch(e.id, { note: $event })" label="Nota (opcional)" :rows="2" :show-char-count="false" />
          </div>
        </div>
      </div>

      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <div class="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <span v-if="dirty" class="mr-auto text-xs font-medium text-warning">Cambios sin guardar</span>
        <button type="button" @click="handleSave" :disabled="!dirty || saving || !!error"
          class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
          {{ saving ? 'Guardando...' : 'Guardar línea de vida' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FormInput, FormSelect, FormTextarea } from '../forms'
import LifeLineChart from './LifeLineChart.vue'
import { VALENCE_OPTIONS, ageAt, lifeLineError, lifeLinePayload, lifeLineSummary, newEvent } from './lifeLine'
import { useDiagram } from '../../composables/clinical/useDiagram'
import type { DiagramScope } from '../../services/clinical/diagramService'
import type { LifeEvent, LifeLineData, LifeValence } from '../../types/database'

const props = defineProps<{
  scope: DiagramScope
  /** Año de nacimiento del paciente (si se conoce): permite mostrar la edad aproximada en cada evento. */
  birthYear?: number | null
}>()

const { diagram, isLoading, saveMutation } = useDiagram<LifeLineData>(() => props.scope, 'life_line')
const saving = computed(() => saveMutation.isPending.value)

const events = ref<LifeEvent[]>([])
const savedSnapshot = ref(JSON.stringify([]))
const selectedId = ref<string | null>(null)

const snapshotOf = (list: LifeEvent[]) => JSON.stringify(lifeLinePayload(list).events)
const dirty = computed(() => snapshotOf(events.value) !== savedSnapshot.value)
const error = computed(() => lifeLineError(events.value))

function load(data: LifeLineData | null | undefined) {
  events.value = (data?.events ?? []).map(e => ({ ...e }))
  savedSnapshot.value = snapshotOf(events.value)
}

// Un refetch en segundo plano nunca pisa lo que se está editando.
watch(() => diagram.value, d => { if (!dirty.value) load(d?.data) }, { immediate: true })
watch(() => props.scope.id, () => load(diagram.value?.data))

function addEvent() {
  const last = [...events.value].sort((a, b) => b.year - a.year)[0]
  const e = newEvent(last?.year ?? new Date().getFullYear())
  events.value = [...events.value, e]
  selectedId.value = e.id
}

const patch = (id: string, change: Partial<LifeEvent>) => {
  events.value = events.value.map(e => (e.id === id ? { ...e, ...change } : e))
}
const remove = (id: string) => { events.value = events.value.filter(e => e.id !== id) }

const ageHint = (e: LifeEvent) => ageAt(e.year, props.birthYear)

async function handleSave() {
  if (!dirty.value || error.value) return
  try {
    const result = await saveMutation.mutateAsync(lifeLinePayload(events.value))
    load(result.data)
  } catch {
    // El toast de error ya lo muestra onError; los eventos conservan lo escrito.
  }
}
</script>
