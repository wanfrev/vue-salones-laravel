<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs font-medium text-text-muted mb-2">Horario laboral</p>
      <div class="grid grid-cols-3 gap-2">
        <FormTime :model-value="formData.scheduleStart"
          @update:model-value="emit('update:modelValue', { ...formData, scheduleStart: $event })" label="Entrada"
          required :error="errors.scheduleStart" />
        <FormTime :model-value="formData.scheduleEnd"
          @update:model-value="emit('update:modelValue', { ...formData, scheduleEnd: $event })" label="Salida" required
          :error="errors.scheduleEnd" />
        <FormInput :model-value="formData.scheduleBreak"
          @update:model-value="emit('update:modelValue', { ...formData, scheduleBreak: String($event) })"
          label="Descanso" type="text" placeholder="13:00-14:00" :error="errors.scheduleBreak" />
      </div>
    </div>

    <div>
      <p class="text-xs font-medium text-text-muted mb-2">Días laborales</p>
      <div class="flex gap-1">
        <button v-for="day in dayOptions" :key="day.value" type="button" @click="toggleDay(day.value)" :class="[
          'flex-1 rounded-lg border py-2 text-xs font-semibold transition-theme',
          (formData.activeDays ?? []).includes(day.value)
            ? 'border-primary bg-primary text-text-inverse'
            : 'border-border text-text-muted hover:border-border-strong hover:bg-bg-secondary'
        ]">{{ day.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormInput, FormTime } from '../forms'
import type { EmpleadoFormData } from '../../types/empleado'

const props = defineProps<{ formData: EmpleadoFormData; errors: Partial<Record<string, string>> }>()
const emit = defineEmits<{ 'update:modelValue': [data: EmpleadoFormData] }>()

const dayOptions = [
  { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' },
  { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' },
  { value: 0, label: 'D' },
]

function toggleDay(day: number) {
  const current = props.formData.activeDays ?? []
  const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
  emit('update:modelValue', { ...props.formData, activeDays: next })
}
</script>
