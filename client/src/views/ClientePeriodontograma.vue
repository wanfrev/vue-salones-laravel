<template>
  <header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
    <div>
      <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
        <ClipboardIcon class="h-4 w-4" />
        <span class="font-medium uppercase tracking-wider">Periodontograma</span>
      </div>
      <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || terminology.client || 'Paciente' }}</p>
    </div>
    <button @click="goBack" class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">
      <ArrowLeftIcon class="h-4 w-4" />
      Volver
    </button>
  </header>

  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Medición</label>
      <select :value="selectedId ?? '__new__'" @change="onSelect(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary">
        <option v-if="isCreatingNew" value="__new__">Medición nueva (sin guardar)</option>
        <option v-for="p in periodontograms" :key="p.id" :value="p.id">
          {{ formatDate(p.created_at) }}
        </option>
      </select>
    </div>
    <button @click="startNew" class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5">
      <AddCircleIcon class="h-4 w-4" />
      Nueva medición
    </button>
  </div>

  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <template v-else>
    <div class="space-y-4">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Arco superior</p>
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <PeriodontogramToothCard
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
          <PeriodontogramToothCard
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
        {{ isSaving ? 'Guardando...' : isCreatingNew ? 'Crear periodontograma' : 'Guardar periodontograma' }}
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, ClipboardIcon, AddCircleIcon } from '@solar-icons/vue/linear'
import { useBusinessStore } from '../store/business'
import { getClienteById } from '../services/clientesService'
import { usePeriodontograms } from '../composables/dental/usePeriodontograms'
import PeriodontogramToothCard from '../components/dental/PeriodontogramToothCard.vue'
import { FormTextarea } from '../components/forms'
import { UPPER_ARCH, LOWER_ARCH } from '../components/dental/odontogramGeometry'
import type { Periodontogram, PeriodontalToothMeasurement } from '../types/database'
import type { PeriodontogramSections } from '../services/dental/periodontogramService'

const route = useRoute()
const router = useRouter()
const businessStore = useBusinessStore()

const clienteId = computed(() => route.params.id as string)
const terminology = computed(() => businessStore.terminology)

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})
const cliente = computed(() => clienteData.value ?? null)

const { periodontograms, isLoading, createMutation, updateMutation } = usePeriodontograms(() => clienteId.value)

function emptyToothMeasurement(): PeriodontalToothMeasurement {
  return { sitios: {}, movilidad: '', furca: '' }
}

const teeth = reactive<Record<string, PeriodontalToothMeasurement>>({})
const observacionesGenerales = ref('')

function toothData(tooth: number): PeriodontalToothMeasurement {
  return teeth[String(tooth)] ?? emptyToothMeasurement()
}

function updateTooth(tooth: number, value: PeriodontalToothMeasurement) {
  teeth[String(tooth)] = value
}

const selectedId = ref<string | null>(null)
const isCreatingNew = ref(false)

const selectedPeriodontogram = computed<Periodontogram | null>(() => periodontograms.value.find(p => p.id === selectedId.value) ?? null)

function loadIntoForm(p: Periodontogram | null) {
  for (const key of Object.keys(teeth)) delete teeth[key]
  if (p) Object.assign(teeth, p.teeth)
  observacionesGenerales.value = p?.observaciones_generales ?? ''
}

watch(periodontograms, (list) => {
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
  loadIntoForm(selectedPeriodontogram.value)
}

function startNew() {
  selectedId.value = null
  isCreatingNew.value = true
  loadIntoForm(null)
}

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function buildPayload(): Partial<PeriodontogramSections> {
  return { teeth: { ...teeth }, observaciones_generales: observacionesGenerales.value }
}

async function handleSave() {
  if (isCreatingNew.value) {
    const created = await createMutation.mutateAsync(buildPayload())
    selectedId.value = created.id
    isCreatingNew.value = false
  } else if (selectedPeriodontogram.value) {
    await updateMutation.mutateAsync({ id: selectedPeriodontogram.value.id, data: buildPayload() })
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function goBack() {
  router.push(`/admin/clientes/${clienteId.value}`)
}
</script>
