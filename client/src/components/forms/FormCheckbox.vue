<template>
  <div class="flex items-start gap-3">
    <div class="relative flex items-center">
      <input
        :id="checkboxId"
        type="checkbox"
        :checked="modelValue"
        @change="handleChange"
        :disabled="disabled"
        :class="[
          'peer h-5 w-5 cursor-pointer appearance-none rounded-md border transition-theme',
          'checked:border-primary checked:bg-primary',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger' : 'border-border hover:border-border-strong',
        ]"
      />
      <svg
        class="pointer-events-none absolute left-1/2 top-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-text-inverse peer-checked:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div class="flex-1">
      <label :for="checkboxId" class="block cursor-pointer text-sm font-medium text-text">
        {{ label }}
        <span v-if="required" class="text-danger">*</span>
      </label>
      <p v-if="error" class="mt-0.5 text-sm text-danger">{{ error }}</p>
      <p v-else-if="hint" class="mt-0.5 text-sm text-text-muted">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

interface Props {
  modelValue: boolean
  label: string
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

const checkboxId = computed(() => props.id || `form-checkbox-${++idCounter}`)

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>
