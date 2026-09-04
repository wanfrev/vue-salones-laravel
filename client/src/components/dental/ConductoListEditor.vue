<template>
  <div class="space-y-3">
    <div v-for="(conducto, index) in modelValue" :key="index" class="rounded-lg border border-border-subtle p-3">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs font-semibold text-text-muted">Conducto {{ index + 1 }}</p>
        <button type="button" class="text-xs font-medium text-danger hover:underline" @click="removeAt(index)">
          Quitar
        </button>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-5">
        <FormInput :model-value="conducto.nombre" label="Nombre" @update:model-value="update(index, 'nombre', $event)" />
        <FormInput :model-value="conducto.conductometria_tentativa" label="Conductometría tentativa" @update:model-value="update(index, 'conductometria_tentativa', $event)" />
        <FormInput :model-value="conducto.conductometria_definitiva" label="Conductometría definitiva" @update:model-value="update(index, 'conductometria_definitiva', $event)" />
        <FormInput :model-value="conducto.lap" label="LAP" @update:model-value="update(index, 'lap', $event)" />
        <FormInput :model-value="conducto.referencia" label="Referencia" @update:model-value="update(index, 'referencia', $event)" />
      </div>
    </div>

    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
      @click="addConducto"
    >
      <AddCircleIcon class="h-4 w-4" />
      Agregar conducto
    </button>
  </div>
</template>

<script setup lang="ts">
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { FormInput } from '../forms'
import type { EndoConducto } from '../../types/database'

const props = defineProps<{
  modelValue: EndoConducto[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EndoConducto[]]
}>()

function emptyConducto(): EndoConducto {
  return { nombre: '', conductometria_tentativa: '', conductometria_definitiva: '', lap: '', referencia: '' }
}

function addConducto() {
  emit('update:modelValue', [...props.modelValue, emptyConducto()])
}

function removeAt(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function update(index: number, key: keyof EndoConducto, value: string | number) {
  const next = props.modelValue.map((c, i) => (i === index ? { ...c, [key]: String(value) } : c))
  emit('update:modelValue', next)
}
</script>
