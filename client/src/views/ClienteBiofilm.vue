<template>
  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Registro</label>
      <select :value="selectedId ?? '__new__'" @change="onSelect(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary">
        <option v-if="isCreatingNew" value="__new__">Registro nuevo (sin guardar)</option>
        <option v-for="r in records" :key="r.id" :value="r.id">
          {{ formatDate(r.created_at) }}
        </option>
      </select>
    </div>
    <button @click="startNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
      <AddCircleIcon class="h-4 w-4" />
      Nuevo registro
    </button>
  </div>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div class="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Índice de placa (O'Leary)</p>
        <p class="text-2xl font-bold" :class="indexColorClass">{{ plaqueIndex.toFixed(0) }}%</p>
      </div>
      <p class="text-xs text-text-muted">
        {{ plaqueSurfaces }} de {{ totalSurfaces }} superficies con placa visible.
        <span v-if="plaqueIndex <= 20" class="font-semibold text-success">Buen control de placa.</span>
        <span v-else class="font-semibold text-danger">Requiere refuerzo de técnica de higiene.</span>
      </p>
    </div>

    <div class="space-y-4">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Arco superior</p>
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <BiofilmToothRow
            v-for="layout in UPPER_ARCH"
            :key="layout.tooth"
            :tooth="layout.tooth"
            :model-value="toothData(layout.tooth)"
            @update:model-value="updateTooth(layout.tooth, $event)"
          />
        </div>
      </div>
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Arco inferior</p>
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <BiofilmToothRow
            v-for="layout in LOWER_ARCH"
            :key="layout.tooth"
            :tooth="layout.tooth"
            :model-value="toothData(layout.tooth)"
            @update:model-value="updateTooth(layout.tooth, $event)"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <FormTextarea v-model="observacionesGenerales" label="Observaciones generales" :rows="3" />
    </div>

    <div class="mt-4 flex justify-end">
      <button @click="handleSave" :disabled="isSaving"
        class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50">
        {{ isSaving ? 'Guardando...' : isCreatingNew ? 'Crear registro' : 'Guardar registro' }}
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useBiofilmRecords } from '../composables/dental/useBiofilmRecords'
import BiofilmToothRow from '../components/dental/BiofilmToothRow.vue'
import { FormTextarea } from '../components/forms'
import { UPPER_ARCH, LOWER_ARCH } from '../components/dental/odontogramGeometry'
import type { BiofilmFace, BiofilmRecord, BiofilmTeeth } from '../types/database'
import type { BiofilmRecordSections } from '../services/dental/biofilmService'

const route = useRoute()

const clienteId = computed(() => route.params.id as string)

const { records, isLoading, createMutation, updateMutation } = useBiofilmRecords(() => clienteId.value)

const teeth = reactive<BiofilmTeeth>({})
const observacionesGenerales = ref('')

function toothData(tooth: number): Partial<Record<BiofilmFace, boolean>> {
  return teeth[String(tooth)] ?? {}
}

function updateTooth(tooth: number, value: Partial<Record<BiofilmFace, boolean>>) {
  teeth[String(tooth)] = value
}

const ALL_TEETH = [...UPPER_ARCH, ...LOWER_ARCH].map(l => l.tooth)
const FACES: BiofilmFace[] = ['vestibular', 'lingual', 'mesial', 'distal']
const totalSurfaces = computed(() => ALL_TEETH.length * FACES.length)
const plaqueSurfaces = computed(() => ALL_TEETH.reduce((sum, tooth) => {
  const faces = teeth[String(tooth)]
  if (!faces) return sum
  return sum + FACES.filter(f => faces[f]).length
}, 0))
const plaqueIndex = computed(() => (totalSurfaces.value === 0 ? 0 : (plaqueSurfaces.value / totalSurfaces.value) * 100))
const indexColorClass = computed(() => (plaqueIndex.value <= 20 ? 'text-success' : plaqueIndex.value <= 50 ? 'text-warning' : 'text-danger'))

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)

const selectedRecord = computed<BiofilmRecord | null>(() => records.value.find(r => r.id === selectedId.value) ?? null)

function loadIntoForm(r: BiofilmRecord | null) {
  for (const key of Object.keys(teeth)) delete teeth[key]
  if (r) Object.assign(teeth, r.teeth)
  observacionesGenerales.value = r?.observaciones_generales ?? ''
}

watch(records, (list) => {
  if (selectedId.value || isCreatingNew.value) return
  if (list.length > 0) {
    selectedId.value = list[0].id
    loadIntoForm(list[0])
  } else {
    isCreatingNew.value = true
    loadIntoForm(null)
  }
}, { immediate: true })

function onSelect(value: string) {
  if (value === '__new__') { startNew(); return }
  selectedId.value = value
  isCreatingNew.value = false
  loadIntoForm(selectedRecord.value)
}

function startNew() {
  selectedId.value = null
  isCreatingNew.value = true
  loadIntoForm(null)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function buildPayload(): Partial<BiofilmRecordSections> {
  return { teeth: { ...teeth }, observaciones_generales: observacionesGenerales.value }
}

async function handleSave() {
  if (isCreatingNew.value) {
    const created = await createMutation.mutateAsync(buildPayload())
    selectedId.value = created.id
    isCreatingNew.value = false
  } else if (selectedRecord.value) {
    await updateMutation.mutateAsync({ id: selectedRecord.value.id, data: buildPayload() })
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
