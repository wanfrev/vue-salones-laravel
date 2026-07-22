<template>
  <div class="space-y-1.5 min-w-0 w-full">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="relative min-w-0 w-full">
      <div v-if="prefixIcon" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="prefixIcon" />
        </svg>
      </div>
      <input :id="inputId" :type="inputType" :value="modelValue" @input="handleInput" @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)" :placeholder="placeholder" :required="required" :disabled="disabled"
        :readonly="readonly" :autocomplete="autocomplete" :class="[
          'w-full min-w-0 max-w-full rounded-xl border bg-surface text-text outline-none transition-theme',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
          prefixIcon ? (inputType === 'date' ? 'pl-8 sm:pl-8.5' : 'pl-10') : 'pl-4',
          suffixIcon || showPasswordToggle ? 'pr-10' : (inputType === 'date' ? 'pr-1' : 'pr-4'),
          sizeClasses[size],
        ]" />
      <button v-if="showPasswordToggle && type === 'password'" type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors text-primary hover:opacity-80"
        :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="passwordVisible = !passwordVisible">
        {{ passwordVisible ? 'Ocultar' : 'Ver' }}
      </button>
      <div v-else-if="suffixIcon" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="suffixIcon" />
        </svg>
      </div>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

let idCounter = 0

export type InputSize = 'sm' | 'md' | 'lg'
export type InputType = 'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'time' | 'search' | 'url'

interface Props {
  modelValue: string | number | undefined
  label?: string
  type?: InputType
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  error?: string
  hint?: string
  prefixIcon?: string
  suffixIcon?: string
  size?: InputSize
  id?: string
  autocomplete?: string
  showPasswordToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputId = computed(() => props.id || `form-input-${++idCounter}`)

const passwordVisible = ref(false)

const inputType = computed(() => {
  if (props.type === 'password' && props.showPasswordToggle && passwordVisible.value) {
    return 'text'
  }
  return props.type
})

const sizeClasses: Record<InputSize, string> = {
  sm: 'py-1.5 text-sm',
  md: 'py-2.5 text-sm',
  lg: 'py-3 text-base',
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const raw = target.value
  emit('update:modelValue', props.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw)
}
</script>
