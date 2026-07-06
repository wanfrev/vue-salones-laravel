<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :maxlength="maxlength"
      :class="[
        'w-full resize-none rounded-xl border bg-surface text-text outline-none transition-theme',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary',
        error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
        sizeClasses[size],
      ]"
    />
    <div class="flex items-center justify-between">
      <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
      <p v-if="maxlength && showCharCount" class="ml-auto text-xs text-text-muted">
        {{ modelValue?.length || 0 }}/{{ maxlength }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

export type TextareaSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  error?: string
  hint?: string
  rows?: number
  maxlength?: number
  showCharCount?: boolean
  size?: TextareaSize
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  showCharCount: true,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const textareaId = computed(() => props.id || `form-textarea-${++idCounter}`)

const sizeClasses: Record<TextareaSize, string> = {
  sm: 'py-2 px-3 text-sm',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-4 text-base',
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>
