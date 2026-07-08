<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormSelect :model-value="formData.payType"
        @update:model-value="emit('update:modelValue', { ...formData, payType: $event as EmpleadoFormData['payType'] })"
        label="Tipo de pago" :options="payTypeOptions" required :error="errors.payType" />
      <FormSelect :model-value="formData.salaryFrequency"
        @update:model-value="emit('update:modelValue', { ...formData, salaryFrequency: $event as EmpleadoFormData['salaryFrequency'] })"
        label="Frecuencia" :options="salaryFrequencyOptions" :disabled="formData.payType === 'percentage'"
        :error="errors.salaryFrequency" />
    </div>

    <div class="rounded-lg bg-bg-secondary/50 p-3 space-y-3">
      <p class="text-xs font-medium text-text-muted">Condiciones económicas</p>
      <div class="grid grid-cols-2 gap-3">
        <FormInput :model-value="formData.payPercentage?.toString() ?? ''"
          @update:model-value="emit('update:modelValue', { ...formData, payPercentage: Number($event) || 0 })"
          :label="`% ${terminology.employee}`" type="number" min="0" max="100" placeholder="50"
          :disabled="formData.payType === 'salary'" :error="errors.payPercentage" />
        <FormInput :model-value="formData.baseSalary?.toString() ?? ''"
          @update:model-value="emit('update:modelValue', { ...formData, baseSalary: Number($event) || 0 })"
          label="Sueldo base ($)" type="number" min="0" placeholder="0" :disabled="formData.payType === 'percentage'"
          :error="errors.baseSalary" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormInput, FormSelect } from '../forms'
import type { EmpleadoFormData } from '../../types/empleado'

defineProps<{ formData: EmpleadoFormData; terminology: Record<string, string>; errors: Partial<Record<string, string>> }>()
const emit = defineEmits<{ 'update:modelValue': [data: EmpleadoFormData] }>()

const payTypeOptions = [
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'salary', label: 'Sueldo base' },
  { value: 'mixed', label: 'Sueldo + %' },
]
const salaryFrequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
]
</script>
