<template>
  <div class="space-y-3">
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>

    <template v-else>
      <!-- Barra de herramientas -->
      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm">
        <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Agregar</span>
        <button v-for="k in PERSON_KIND_OPTIONS" :key="k.value" type="button" @click="addPerson(k.value)"
          class="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
          + {{ k.label }}
        </button>
        <span class="mx-1 hidden h-5 w-px bg-border sm:block"></span>
        <label class="flex items-center gap-2 text-xs font-semibold text-text-secondary">
          Al conectar, crear:
          <select v-model="newEdgeKind" class="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-primary">
            <option v-for="k in EDGE_KIND_OPTIONS" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </label>
        <span class="ml-auto text-xs text-text-muted">{{ genogramSummary(current) }}</span>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_17rem]">
        <!-- Lienzo -->
        <div class="h-[28rem] overflow-hidden rounded-xl border border-border bg-surface shadow-sm" data-testid="genogram-canvas">
          <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :min-zoom="0.3"
            :max-zoom="1.8"
            :default-viewport="{ x: 0, y: 0, zoom: 1 }"
            :connection-mode="ConnectionMode.Loose"
            :delete-key-code="null"
            fit-view-on-init
            @connect="onConnect"
          >
            <template #node-person="nodeProps">
              <GenogramPersonNode :data="nodeProps.data" :selected="nodeProps.selected" />
            </template>
          </VueFlow>
        </div>

        <!-- Panel de edición -->
        <aside class="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <template v-if="selectedPerson">
            <p class="text-xs font-semibold uppercase tracking-wider text-primary">Persona</p>
            <FormInput :model-value="selectedPerson.data.name" @update:model-value="patchPerson({ name: $event as string })" label="Nombre" />
            <FormInput :model-value="selectedPerson.data.age" @update:model-value="patchPerson({ age: $event as string })" label="Edad" placeholder="Ej: 45 o 45†" />
            <FormSelect :model-value="selectedPerson.data.kind" @update:model-value="patchPerson({ kind: $event as GenogramPersonKind })" label="Género" :options="PERSON_KIND_OPTIONS" />
            <FormToggle :model-value="selectedPerson.data.deceased" @update:model-value="patchPerson({ deceased: $event })" label="Fallecido(a)" />
            <FormToggle :model-value="selectedPerson.data.index" @update:model-value="markIndex($event)" label="Paciente índice" />
            <FormTextarea :model-value="selectedPerson.data.notes" @update:model-value="patchPerson({ notes: $event })" label="Notas" :rows="3" :show-char-count="false" />
            <button type="button" @click="deleteSelectedPerson" class="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">
              Quitar persona (y sus vínculos)
            </button>
          </template>

          <template v-else-if="selectedEdge">
            <p class="text-xs font-semibold uppercase tracking-wider text-primary">Vínculo</p>
            <FormSelect :model-value="selectedEdge.data?.kind ?? 'partner'" @update:model-value="patchEdgeKind($event as GenogramEdgeKind)" label="Tipo" :options="EDGE_KIND_OPTIONS" />
            <p class="text-xs text-text-muted">{{ EDGE_STYLES[(selectedEdge.data?.kind ?? 'partner') as GenogramEdgeKind].hint }}</p>
            <button type="button" @click="deleteSelectedEdge" class="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">
              Quitar vínculo
            </button>
          </template>

          <div v-else class="space-y-2 text-xs text-text-muted">
            <p class="font-semibold text-text-secondary">Cómo se usa</p>
            <p>1. Agrega personas con los botones de arriba y arrástralas a su lugar.</p>
            <p>2. Une dos personas arrastrando desde el punto de una hacia la otra: se crea el vínculo elegido en «Al conectar».</p>
            <p>3. Toca una persona o una línea para editarla. Rueda del mouse o pellizco para acercar.</p>
          </div>

          <ul class="space-y-1 border-t border-border-subtle pt-3">
            <li v-for="k in EDGE_KIND_OPTIONS" :key="k.value" class="flex items-center gap-2 text-[11px] text-text-secondary">
              <svg width="34" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="34" y2="4" :stroke="EDGE_STYLES[k.value].stroke" :stroke-width="EDGE_STYLES[k.value].width" :stroke-dasharray="EDGE_STYLES[k.value].dash" />
              </svg>
              {{ k.label }}<span v-if="EDGE_STYLES[k.value].mark" class="font-bold"> {{ EDGE_STYLES[k.value].mark }}</span>
            </li>
          </ul>
        </aside>
      </div>

      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <div class="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <span v-if="dirty" class="mr-auto text-xs font-medium text-warning">Cambios sin guardar</span>
        <button type="button" @click="handleSave" :disabled="!dirty || saving || !!error"
          class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
          {{ saving ? 'Guardando...' : 'Guardar genograma' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ConnectionMode, VueFlow, useVueFlow, type Connection } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { FormInput, FormSelect, FormTextarea, FormToggle } from '../forms'
import GenogramPersonNode from './GenogramPersonNode.vue'
import {
  EDGE_KIND_OPTIONS, EDGE_STYLES, PERSON_KIND_OPTIONS, emptyGenogram, fromFlow, genogramError, genogramSummary, hasLink,
  newId, newPerson, removePerson, sameGenogram, setIndexPerson, toFlowEdges, toFlowNodes, type FlowNode,
} from './genogram'
import { useDiagram } from '../../composables/clinical/useDiagram'
import type { DiagramScope } from '../../services/clinical/diagramService'
import type { GenogramData, GenogramEdgeKind, GenogramPersonKind } from '../../types/database'

const props = defineProps<{ scope: DiagramScope }>()

const { diagram, isLoading, saveMutation } = useDiagram<GenogramData>(() => props.scope, 'genogram')
const saving = computed(() => saveMutation.isPending.value)

// El estado editable vive en nodos/aristas de Vue Flow; `current` lo traduce al modelo que se guarda.
const nodes = ref(toFlowNodes(emptyGenogram()))
const edges = ref(toFlowEdges(emptyGenogram()))
const saved = ref<GenogramData>(emptyGenogram())
const newEdgeKind = ref<GenogramEdgeKind>('married')

// Tras agregar/quitar personas el lienzo se reencuadra: si no, la nueva persona puede quedar fuera de la vista.
const { fitView } = useVueFlow()
const reframe = () => nextTick(() => fitView({ padding: 0.35, maxZoom: 1 }))

const current = computed<GenogramData>(() => fromFlow(nodes.value, edges.value))
const dirty = computed(() => !sameGenogram(current.value, saved.value))
const error = computed(() => genogramError(current.value))

function load(data: GenogramData) {
  nodes.value = toFlowNodes(data)
  edges.value = toFlowEdges(data)
  saved.value = data
}

// Un refetch en segundo plano nunca pisa un dibujo con cambios sin guardar.
watch(() => diagram.value, d => { if (!dirty.value) load(d?.data ?? emptyGenogram()) }, { immediate: true })
watch(() => props.scope.id, () => load(diagram.value?.data ?? emptyGenogram()))

// Reemplaza todo el dibujo conservando posiciones (se leen de los nodos actuales).
const commit = (data: GenogramData) => { nodes.value = toFlowNodes(data); edges.value = toFlowEdges(data) }

function addPerson(kind: GenogramPersonKind) {
  const data = current.value
  data.nodes.push(newPerson(kind, data.nodes, { name: data.nodes.length === 0 ? 'Paciente' : '', index: data.nodes.length === 0 }))
  commit(data)
  reframe()
}

function onConnect(c: Connection) {
  if (!c.source || !c.target || c.source === c.target) return
  if (hasLink(current.value.edges, c.source, c.target, newEdgeKind.value)) return
  edges.value = [...edges.value, ...toFlowEdges({ nodes: [], edges: [{ id: newId('e'), source: c.source, target: c.target, kind: newEdgeKind.value }] })]
}

// ── Selección y edición ──
const selectedPerson = computed(() => nodes.value.find(n => n.selected) ?? null)
const selectedEdge = computed(() => (selectedPerson.value ? null : edges.value.find(e => e.selected) ?? null))

function patchPerson(patch: Partial<FlowNode['data']>) {
  const node = selectedPerson.value
  if (node) node.data = { ...node.data, ...patch }
}

function markIndex(on: boolean) {
  const node = selectedPerson.value
  if (!node) return
  const data = current.value
  data.nodes = on ? setIndexPerson(data.nodes, node.id) : data.nodes.map(p => (p.id === node.id ? { ...p, index: false } : p))
  const keep = node.id
  commit(data)
  nodes.value = nodes.value.map(n => ({ ...n, selected: n.id === keep }))
}

function patchEdgeKind(kind: GenogramEdgeKind) {
  const edge = selectedEdge.value
  if (!edge) return
  const [rebuilt] = toFlowEdges({ nodes: [], edges: [{ id: edge.id, source: edge.source, target: edge.target, kind }] })
  edges.value = edges.value.map(e => (e.id === edge.id ? { ...rebuilt, selected: true } : e))
}

function deleteSelectedPerson() {
  const node = selectedPerson.value
  if (node) {
    commit(removePerson(current.value, node.id))
    reframe()
  }
}

function deleteSelectedEdge() {
  const edge = selectedEdge.value
  if (edge) edges.value = edges.value.filter(e => e.id !== edge.id)
}

async function handleSave() {
  if (!dirty.value || error.value) return
  try {
    const result = await saveMutation.mutateAsync(current.value)
    saved.value = result.data
  } catch {
    // El toast de error ya lo muestra onError; el dibujo conserva lo hecho.
  }
}

</script>
