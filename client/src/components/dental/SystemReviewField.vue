<template>
  <div class="rounded-lg border border-border-subtle p-3">
    <FormToggle
      :model-value="modelValue.refiere"
      :label="label"
      @update:model-value="onToggle"
    />
    <FormTextarea
      v-if="modelValue.refiere"
      :model-value="modelValue.observaciones"
      label="Observaciones"
      placeholder="Describe lo que refiere el paciente..."
      :rows="2"
      class="mt-2"
      @update:model-value="onObservaciones"
    />
  </div>
</template>

<script setup lang="ts">
import { FormToggle, FormTextarea } from '../forms'
import type { SystemReview } from '../../types/database'

const props = defineProps<{
  modelValue: SystemReview
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SystemReview]
}>()

function onToggle(refiere: boolean) {
  emit('update:modelValue', { ...props.modelValue, refiere })
}

function onObservaciones(observaciones: string | number) {
  emit('update:modelValue', { ...props.modelValue, observaciones: String(observaciones) })
}
</script>
