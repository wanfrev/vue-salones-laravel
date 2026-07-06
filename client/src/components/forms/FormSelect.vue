<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="relative">
      <select
        :id="selectId"
        :value="modelValue"
        @change="handleChange"
        @blur="$emit('blur', $event)"
        :required="required"
        :disabled="disabled"
        :class="[
          'w-full appearance-none rounded-xl border bg-surface text-text outline-none transition-theme',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
          sizeClasses[size],
        ]"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export type SelectSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string | number
  options: SelectOption[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  size?: SelectSize
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const selectId = computed(() => props.id || `form-select-${++idCounter}`)

const sizeClasses: Record<SelectSize, string> = {
  sm: 'py-1.5 pl-3 pr-10 text-sm',
  md: 'py-2.5 pl-4 pr-10 text-sm',
  lg: 'py-3 pl-4 pr-10 text-base',
}

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>
