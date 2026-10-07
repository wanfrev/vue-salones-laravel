<template>
  <div class="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Nuevo caso</p>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de caso">
      <button
        v-for="t in CASE_TYPES"
        :key="t"
        type="button"
        role="radio"
        :aria-checked="type === t"
        @click="type = t"
        class="rounded-xl border px-3 py-2.5 text-left transition-theme"
        :class="type === t ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/30 hover:bg-primary/5'"
      >
        <p class="text-sm font-semibold" :class="type === t ? 'text-primary' : 'text-text'">{{ CASE_TYPE_LABELS[t] }}</p>
        <p class="mt-0.5 text-xs text-text-muted">{{ CASE_TYPE_HINTS[t] }}</p>
      </button>
    </div>

    <PatientPicker label="Agregar integrante" placeholder="Busca por nombre o teléfono" :exclude="members.map(m => m.client_id)" @select="addMember" />

    <ul v-if="members.length > 0" class="space-y-2">
      <li v-for="m in members" :key="m.client_id" class="grid grid-cols-1 items-center gap-2 rounded-lg border border-border-subtle bg-bg-secondary/40 p-2 sm:grid-cols-[1fr_11rem_auto_auto]">
        <span class="truncate text-sm font-medium text-text">{{ m.name }}</span>
        <FormSelect v-model="m.role" :options="roleOptions" />
        <label class="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
          <input type="radio" name="titular" :checked="primaryId === m.client_id" @change="primaryId = m.client_id" />
          Titular
        </label>
        <button type="button" @click="removeMember(m.client_id)" class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-danger transition-theme hover:bg-danger/5">Quitar</button>
      </li>
    </ul>
    <p v-else class="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">Busca y agrega a las personas del caso.</p>

    <p class="text-xs text-text-muted">El titular es quien aparece en la agenda y a quien se cobra la sesión conjunta. Cada integrante conserva su expediente individual privado.</p>

    <FormInput v-model="name" label="Nombre del caso" placeholder="Ej: Ana y Beto, Familia Soto" @update:model-value="nameEdited = true" />

    <p v-if="error" class="text-sm text-danger">{{ error }}</p>

    <div class="flex justify-end gap-3">
      <button @click="$emit('cancel')" class="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
      <button
        @click="handleSubmit"
        :disabled="!canSubmit || saving"
        class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
      >
        {{ saving ? 'Creando...' : 'Crear caso' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FormInput, FormSelect } from '../forms'
import PatientPicker, { type PickedPatient } from './PatientPicker.vue'
import { CASE_TYPES, CASE_TYPE_HINTS, CASE_TYPE_LABELS, ROLE_SUGGESTIONS, caseMembersError, suggestCaseName } from './cases'
import type { CreateCasePayload } from '../../services/clinical/caseService'
import type { ClinicalCaseType } from '../../types/database'

defineProps<{ saving: boolean }>()
const emit = defineEmits<{ submit: [payload: CreateCasePayload]; cancel: [] }>()

const type = ref<ClinicalCaseType>('couple')
const members = reactive<Array<{ client_id: string; name: string; role: string }>>([])
const primaryId = ref('')
const name = ref('')
const nameEdited = ref(false)

const roleOptions = computed(() => [{ value: '', label: 'Sin rol' }, ...ROLE_SUGGESTIONS[type.value].map(r => ({ value: r, label: r }))])

// Mientras nadie haya escrito el nombre, se sugiere a partir de los integrantes.
watch([type, () => members.map(m => m.name)], () => {
  if (!nameEdited.value) name.value = suggestCaseName(type.value, members.map(m => m.name))
})

// Cambiar de tipo con un rol que ya no existe en ese tipo lo limpia en vez de dejar un valor inválido en el select.
watch(type, t => {
  for (const m of members) if (m.role && !ROLE_SUGGESTIONS[t].includes(m.role)) m.role = ''
})

function addMember(p: PickedPatient) {
  if (members.some(m => m.client_id === p.id)) return
  members.push({ client_id: p.id, name: p.full_name, role: '' })
  if (!primaryId.value) primaryId.value = p.id
}

function removeMember(id: string) {
  const i = members.findIndex(m => m.client_id === id)
  if (i >= 0) members.splice(i, 1)
  if (primaryId.value === id) primaryId.value = members[0]?.client_id ?? ''
}

// El mensaje de error de integrantes solo aparece cuando ya se intentó armar el grupo (no con la lista vacía al abrir).
const error = computed(() => (members.length === 0 ? null : caseMembersError(type.value, members.length)))
const canSubmit = computed(() => members.length >= 2 && !caseMembersError(type.value, members.length) && !!name.value.trim() && !!primaryId.value)

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    type: type.value,
    name: name.value.trim(),
    primary_client_id: primaryId.value,
    members: members.map(m => ({ client_id: m.client_id, role: m.role || null })),
  })
}
</script>
