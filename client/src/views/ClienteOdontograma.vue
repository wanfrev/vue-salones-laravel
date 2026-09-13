<template>
  <div class="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
    </div>
    <template v-else>
      <div class="mb-4 flex items-center gap-2">
        <label class="text-xs font-semibold uppercase tracking-wider text-text-muted">Dentición</label>
        <div class="inline-flex rounded-xl border border-border-subtle bg-bg-secondary p-1">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-theme"
            :class="denticion === 'permanente' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'"
            @click="denticion = 'permanente'"
          >
            Permanente
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-theme"
            :class="denticion === 'temporal' ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'"
            @click="denticion = 'temporal'"
          >
            Temporal (niños)
          </button>
        </div>
      </div>

      <Odontogram
        :teeth="teeth"
        :codes="codes"
        :denticion="denticion"
        :teeth-with-endo-annex="denticion === 'permanente' ? teethWithEndoAnnex : []"
        @face-click="openPicker"
      />
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
    :active-icdas="activeToothCode?.icdas ?? null"
    :active-black="activeToothCode?.black ?? null"
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
import type { DentalCondition, DentalFace, DentalTeeth, DentalTeethCodes, ToothFaceCode } from '../types/database'

const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)

const { chart, isLoading, saveMutation } = useDentalChart(() => clienteId.value)
const teeth = computed<DentalTeeth>(() => chart.value?.teeth ?? {})
const codes = computed<DentalTeethCodes>(() => chart.value?.codes ?? {})

// Only the permanent set is charted by default; a doctor charting a child's mouth switches
// this to see/edit the primary (deciduous) teeth instead — both live in the same DentalTeeth
// record since the FDI numbers never overlap, so nothing extra needs saving here.
const denticion = ref<'permanente' | 'temporal'>('permanente')

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

const activeToothCode = computed<ToothFaceCode | null>(() => {
  if (activeTooth.value == null || !activeFace.value) return null
  return codes.value[String(activeTooth.value)]?.[activeFace.value] ?? null
})

function openPicker(tooth: number, face: DentalFace, position: { x: number; y: number }) {
  activeTooth.value = tooth
  activeFace.value = face
  pickerPosition.value = position
  pickerOpen.value = true
}

function selectCondition(condition: DentalCondition, code?: number | string) {
  if (activeTooth.value == null || !activeFace.value) return
  const toothKey = String(activeTooth.value)
  const face = activeFace.value

  const nextTeeth: DentalTeeth = {
    ...teeth.value,
    [toothKey]: { ...teeth.value[toothKey], [face]: condition },
  }

  // Codes are a sibling map, same keying — clear any existing code for this face unless a new
  // one was just picked (e.g. switching a tooth from "caries" to "sano" drops its ICDAS code).
  const nextFaceCodes = { ...codes.value[toothKey] }
  if (code !== undefined) {
    nextFaceCodes[face] = condition === 'caries' ? { icdas: code as number } : { black: code as string }
  } else {
    delete nextFaceCodes[face]
  }
  const nextCodes: DentalTeethCodes = { ...codes.value, [toothKey]: nextFaceCodes }

  saveMutation.mutate({ teeth: nextTeeth, codes: nextCodes })
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
  // Preserve any active-encounter params (cita/service/time) already on the URL.
  router.push({
    path: `${basePath}/clientes/${clienteId.value}/expediente/anexo-endodoncia`,
    query: { ...route.query, tooth: activeTooth.value },
  })
}
</script>
