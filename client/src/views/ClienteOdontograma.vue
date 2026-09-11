<template>
  <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
    <template v-else>
      <Odontogram :teeth="teeth" @face-click="openPicker" />
      <div class="mt-6 border-t border-border pt-4">
        <OdontogramLegend />
      </div>
    </template>
  </div>

  <ModalBase
    :is-open="pickerOpen"
    :title="pickerTitle"
    size="sm"
    :show-footer="false"
    @close="pickerOpen = false"
  >
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="condition in CONDITION_ORDER"
        :key="condition"
        @click="selectCondition(condition)"
        class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition-theme hover:bg-bg-secondary"
      >
        <span class="h-3 w-3 shrink-0 rounded-sm border border-border" :style="{ backgroundColor: CONDITION_COLORS[condition] }" />
        {{ CONDITION_LABELS[condition] }}
      </button>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDentalChart } from '../composables/dental/useDentalChart'
import Odontogram from '../components/dental/Odontogram.vue'
import OdontogramLegend from '../components/dental/OdontogramLegend.vue'
import ModalBase from '../components/common/ModalBase.vue'
import { CONDITION_COLORS, CONDITION_LABELS, CONDITION_ORDER } from '../components/dental/odontogramConditions'
import type { DentalCondition, DentalFace, DentalTeeth } from '../types/database'

const route = useRoute()

const clienteId = computed(() => route.params.id as string)

const { chart, isLoading, saveMutation } = useDentalChart(() => clienteId.value)
const teeth = computed<DentalTeeth>(() => chart.value?.teeth ?? {})

const pickerOpen = ref(false)
const activeTooth = ref<number | null>(null)
const activeFace = ref<DentalFace | null>(null)

const FACE_LABELS: Record<DentalFace, string> = {
  vestibular: 'Vestibular',
  lingual: 'Lingual / Palatino',
  mesial: 'Mesial',
  distal: 'Distal',
  oclusal: 'Oclusal / Incisal',
}

const pickerTitle = computed(() =>
  activeTooth.value ? `Pieza ${activeTooth.value} · ${FACE_LABELS[activeFace.value!]}` : ''
)

function openPicker(tooth: number, face: DentalFace) {
  activeTooth.value = tooth
  activeFace.value = face
  pickerOpen.value = true
}

function selectCondition(condition: DentalCondition) {
  if (activeTooth.value == null || !activeFace.value) return
  const toothKey = String(activeTooth.value)
  const nextTeeth: DentalTeeth = {
    ...teeth.value,
    [toothKey]: { ...teeth.value[toothKey], [activeFace.value]: condition },
  }
  saveMutation.mutate(nextTeeth)
  pickerOpen.value = false
}
</script>
