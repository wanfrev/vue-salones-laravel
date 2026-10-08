<template>
  <div class="relative" @keydown.esc="open = false">
    <FormInput
      v-model="query"
      :label="label"
      :placeholder="placeholder"
      autocomplete="off"
      @focus="open = true"
      @blur="closeSoon"
    />
    <ul
      v-if="open && query.trim().length >= MIN_CHARS"
      class="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface shadow-xl"
    >
      <li v-if="searching" class="px-3 py-2 text-sm text-text-muted">Buscando...</li>
      <li v-else-if="results.length === 0" class="px-3 py-2 text-sm text-text-muted">Ningún paciente coincide.</li>
      <li v-for="c in results" :key="c.id">
        <button type="button" @mousedown.prevent @click="pick(c)" class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-theme hover:bg-primary/5">
          <span class="truncate font-medium text-text">{{ c.full_name }}</span>
          <span class="shrink-0 text-xs text-text-muted">{{ c.phone }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { FormInput } from '../forms'
import { searchCasePatients } from '../../services/clinical/caseService'

export interface PickedPatient {
  id: string
  full_name: string
  phone: string | null
}

const MIN_CHARS = 2
const DEBOUNCE_MS = 250

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  /** Ids ya elegidos: no se vuelven a ofrecer. */
  exclude?: string[]
}>(), { label: 'Buscar paciente', placeholder: 'Nombre o teléfono', exclude: () => [] })

const emit = defineEmits<{ select: [patient: PickedPatient] }>()

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, ch => ch.toUpperCase())

const query = ref('')
const results = ref<PickedPatient[]>([])
const searching = ref(false)
const open = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
let seq = 0 // descarta respuestas viejas: si llegan desordenadas, solo cuenta la última búsqueda

watch(query, value => {
  if (timer) clearTimeout(timer)
  const q = value.trim()
  if (q.length < MIN_CHARS) {
    results.value = []
    searching.value = false
    return
  }
  open.value = true
  searching.value = true
  const mine = ++seq
  timer = setTimeout(async () => {
    try {
      const found = await searchCasePatients(q)
      if (mine === seq) results.value = found.filter(c => !props.exclude.includes(c.id)).map(c => ({ ...c, full_name: titleCase(c.full_name) }))
    } catch {
      if (mine === seq) results.value = []
    } finally {
      if (mine === seq) searching.value = false
    }
  }, DEBOUNCE_MS)
})

// El clic en un resultado no quita el foco del campo (mousedown.prevent), así que cerrar al salir del campo es seguro.
const closeSoon = () => { open.value = false }

function pick(c: PickedPatient) {
  emit('select', { id: c.id, full_name: c.full_name, phone: c.phone ?? null })
  query.value = ''
  results.value = []
  open.value = false
}

onUnmounted(() => { if (timer) clearTimeout(timer) })
</script>
