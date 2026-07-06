<template>
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <label v-if="label" :for="toggleId" class="block text-sm font-medium text-text">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      <p v-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
    </div>
    <button
      :id="toggleId"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      @click="toggle"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-theme focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        modelValue ? 'bg-primary' : 'bg-bg-secondary',
      ]"
    >
      <span
        :class="[
          'inline-block h-4 w-4 transform rounded-full bg-text-inverse transition-theme shadow-sm',
          modelValue ? 'translate-x-6' : 'translate-x-1',
        ]"
      />
    </button>
  </div>
  <p v-if="error" class="mt-1 text-sm text-danger">{{ error }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

interface Props {
  modelValue: boolean
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  id?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggleId = computed(() => props.id || `form-toggle-${++idCounter}`)

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>
