<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div :class="inline ? 'flex flex-wrap gap-4' : 'space-y-2'">
      <div v-for="option in options" :key="option.value" class="flex items-center gap-2">
        <div class="relative flex items-center">
          <input :id="`${radioId}-${option.value}`" type="radio" :name="radioId" :value="option.value"
            :checked="modelValue === option.value" @change="handleChange(option.value)"
            :disabled="disabled || option.disabled" :class="[
              'peer h-4 w-4 cursor-pointer appearance-none rounded-full border transition-theme',
              'checked:border-primary checked:bg-primary',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger' : 'border-border hover:border-border-strong',
            ]" />
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 hidden h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-inverse peer-checked:block">
          </div>
        </div>
        <label :for="`${radioId}-${option.value}`" class="cursor-pointer text-sm text-text"
          :class="{ 'opacity-50': option.disabled }">
          {{ option.label }}
        </label>
      </div>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

export interface RadioOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string | number | null
  options: RadioOption[]
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  inline?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  inline: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const radioId = computed(() => props.id || `form-radio-${++idCounter}`)

const handleChange = (value: string | number) => {
  emit('update:modelValue', value)
}
</script>
