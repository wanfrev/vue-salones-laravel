<template>
  <div class="space-y-1.5 min-w-0 w-full">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="flex items-center gap-1 min-w-0 w-full">
      <select :id="inputId" :value="hour12" @change="onHourChange" :disabled="disabled"
        class="flex-1 min-w-0 w-0 rounded-xl border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary pl-2 pr-4 sm:pr-5 py-2 text-sm"
        :class="error ? 'border-danger' : 'border-border hover:border-border-strong'">
        <option v-for="h in 12" :key="h" :value="h">{{ h }}</option>
      </select>
      <span class="text-text-muted font-medium shrink-0">:</span>
      <select :value="minute" @change="onMinuteChange" :disabled="disabled"
        class="flex-1 min-w-0 w-0 rounded-xl border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary pl-2 pr-4 sm:pr-5 py-2 text-sm"
        :class="error ? 'border-danger' : 'border-border hover:border-border-strong'">
        <option v-for="m in minuteOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <button type="button" :disabled="disabled" @click="toggleAmPm"
        class="shrink-0 rounded-xl border bg-surface text-xs font-semibold px-1.5 sm:px-2 py-2 outline-none transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary min-w-[36px] sm:min-w-[40px] text-center"
        :class="[
          error ? 'border-danger' : 'border-border hover:border-border-strong',
          isPM ? 'text-warning' : 'text-primary'
        ]">{{ isPM ? 'PM' : 'AM' }}</button>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

let idCounter = 0

interface Props {
  modelValue: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '09:00',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = computed(() => props.id || `form-time-${++idCounter}`)

const minuteOptions = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5
  return { value: m, label: String(m).padStart(2, '0') }
})

function parseTime(value: string): { h24: number; m: number } {
  const [h, m] = (value || '09:00').split(':').map(Number)
  return { h24: Number.isNaN(h) ? 9 : h, m: Number.isNaN(m) ? 0 : m }
}

const hour12 = computed(() => {
  const { h24 } = parseTime(props.modelValue)
  const h = h24 % 12 || 12
  return h
})

const isPM = computed(() => {
  const { h24 } = parseTime(props.modelValue)
  return h24 >= 12
})

const minute = computed(() => {
  const { m } = parseTime(props.modelValue)
  const snapped = Math.round(m / 5) * 5
  return snapped
})

function emitTime(h24: number, m: number) {
  const hh = String(h24).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  emit('update:modelValue', `${hh}:${mm}`)
}

function onHourChange(e: Event) {
  const h12 = Number((e.target as HTMLSelectElement).value)
  const { m } = parseTime(props.modelValue)
  const h24 = isPM.value ? (h12 % 12 + 12) : (h12 % 12)
  emitTime(h24, m)
}

function onMinuteChange(e: Event) {
  const { h24 } = parseTime(props.modelValue)
  const m = Number((e.target as HTMLSelectElement).value)
  emitTime(h24, m)
}

function toggleAmPm() {
  const { h24, m } = parseTime(props.modelValue)
  const newH24 = isPM.value ? h24 - 12 : h24 + 12
  emitTime(newH24, m)
}
</script>
