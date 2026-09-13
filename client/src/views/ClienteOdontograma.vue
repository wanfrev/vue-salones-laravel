<template>
  <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
    <template v-else>
      <Odontogram :teeth="teeth" :teeth-with-endo-annex="teethWithEndoAnnex" @face-click="openPicker" />
      <div class="mt-6 border-t border-border pt-4">
        <OdontogramLegend />
      </div>
    </template>
  </div>

  <ConditionRadialMenu
    v-if="pickerOpen"
    :x="pickerPosition.x"
    :y="pickerPosition.y"
    :active-condition="activeToothCondition"
    :has-endo-annex="activeToothHasEndoAnnex"
    @select="selectCondition"
    @open-endo="goToEndoAnnex"
    @close="pickerOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDentalChart } from '../composables/dental/useDentalChart'
import { useEndoAnnexes } from '../composables/dental/useEndoAnnexes'
import Odontogram from '../components/dental/Odontogram.vue'
import OdontogramLegend from '../components/dental/OdontogramLegend.vue'
import ConditionRadialMenu from '../components/dental/ConditionRadialMenu.vue'
import type { DentalCondition, DentalFace, DentalTeeth } from '../types/database'

const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)

const { chart, isLoading, saveMutation } = useDentalChart(() => clienteId.value)
const teeth = computed<DentalTeeth>(() => chart.value?.teeth ?? {})

const { annexes: endoAnnexes } = useEndoAnnexes(() => clienteId.value)
const teethWithEndoAnnex = computed(() => [...new Set(endoAnnexes.value.map(a => a.tooth_number))])

const pickerOpen = ref(false)
const pickerPosition = ref({ x: 0, y: 0 })
const activeTooth = ref<number | null>(null)
const activeFace = ref<DentalFace | null>(null)

const activeToothCondition = computed<DentalCondition | null>(() => {
  if (activeTooth.value == null || !activeFace.value) return null
  return teeth.value[String(activeTooth.value)]?.[activeFace.value] ?? 'sano'
})

function openPicker(tooth: number, face: DentalFace, position: { x: number; y: number }) {
  activeTooth.value = tooth
  activeFace.value = face
  pickerPosition.value = position
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

const activeToothHasEndoAnnex = computed(() =>
  activeTooth.value != null && endoAnnexes.value.some(a => a.tooth_number === activeTooth.value)
)

// Jumps straight into the endodoncia tab with this tooth pre-selected — same shell, same base
// path (/admin or /dashboard) this page is already mounted under.
function goToEndoAnnex() {
  if (activeTooth.value == null) return
  const basePath = route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'
  pickerOpen.value = false
  router.push(`${basePath}/clientes/${clienteId.value}/expediente/anexo-endodoncia?tooth=${activeTooth.value}`)
}
</script>
