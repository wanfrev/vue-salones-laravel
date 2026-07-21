<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {{ terminology?.pet || 'Mascotas' }} ({{ props.modelValue.filter(p => !p._delete).length }})
      </p>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
        @click="addPet"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Agregar {{ terminology?.pet || 'Mascota' }}
      </button>
    </div>

    <div v-if="props.modelValue.filter(p => !p._delete).length === 0" class="text-center py-6 text-sm text-text-muted border border-dashed border-border rounded-lg">
      Sin {{ (terminology?.pet || 'mascotas').toLowerCase() }} registradas
    </div>

    <div
      v-for="(pet, index) in props.modelValue"
      :key="index"
      v-show="!pet._delete"
      class="rounded-lg border border-border bg-bg-secondary/30 p-3 space-y-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-text">
          {{ terminology?.pet || 'Mascota' }} {{ index + 1 }}
        </span>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
          @click="removePet(index)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput
          :model-value="pet.name"
          :label="terminology?.pet || 'Nombre de mascota'"
          placeholder="Ej: Max, Luna"
          required
          @update:model-value="updatePet(index, 'name', $event)"
        />
        <FormInput
          :model-value="pet.breed || ''"
          :label="terminology?.breed || 'Raza'"
          placeholder="Ej: Golden Retriever"
          @update:model-value="updatePet(index, 'breed', $event)"
        />
        <FormInput
          :model-value="pet.weight || ''"
          :label="terminology?.weight || 'Peso'"
          placeholder="Ej: 15 kg"
          @update:model-value="updatePet(index, 'weight', $event)"
        />
      </div>
      <div class="sm:col-span-2">
        <FormTextarea
          :model-value="pet.notes || ''"
          :label="showVetFields ? 'Notas veterinarias' : 'Notas'"
          :placeholder="showVetFields ? 'Condiciones médicas, alergias, medicamentos...' : 'Notas adicionales...'"
          :rows="2"
          @update:model-value="updatePet(index, 'notes', $event)"
        />
      </div>
      <template v-if="showVetFields">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            :model-value="getMeta(pet, 'last_vaccine')"
            label="Última vacuna"
            type="date"
            @update:model-value="updateMeta(index, 'last_vaccine', $event)"
          />
          <FormInput
            :model-value="getMeta(pet, 'last_checkup')"
            label="Última revisión"
            type="date"
            @update:model-value="updateMeta(index, 'last_checkup', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormInput, FormTextarea } from '../forms'
import type { PetFormData } from '../../types/cliente'

interface Props {
  modelValue: PetFormData[]
  terminology?: Record<string, string>
  showVetFields?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [pets: PetFormData[]]
}>()

const addPet = () => {
  const newPet: PetFormData = { name: '', breed: '', weight: '', notes: '' }
  emit('update:modelValue', [...props.modelValue, newPet])
}

const removePet = (index: number) => {
  const updated = [...props.modelValue]
  if (updated[index].id) {
    updated[index] = { ...updated[index], _delete: true }
  } else {
    updated.splice(index, 1)
  }
  emit('update:modelValue', updated)
}

const updatePet = (index: number, key: string, value: string | number) => {
  const updated = [...props.modelValue]
  updated[index] = { ...updated[index], [key]: String(value) }
  emit('update:modelValue', updated)
}

const getMeta = (pet: PetFormData, key: string): string => {
  const meta = (pet.metadata ?? {}) as Record<string, unknown>
  return String(meta[key] ?? '')
}

const updateMeta = (index: number, key: string, value: string | number) => {
  const updated = [...props.modelValue]
  const currentMeta = (updated[index].metadata ?? {}) as Record<string, unknown>
  updated[index] = { ...updated[index], metadata: { ...currentMeta, [key]: String(value || '') || null } }
  emit('update:modelValue', updated)
}
</script>

<style scoped>
</style>
