<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div ref="containerRef" class="relative">
      <button type="button" @click="toggleOpen" :disabled="disabled" :class="[
        'w-full rounded-xl border bg-surface text-left outline-none transition-theme',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-secondary',
        error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
        open ? 'border-primary ring-2 ring-primary/20' : '',
        sizeClasses[size],
      ]">
        <span v-if="selectedLabel" class="text-text">{{ selectedLabel }}</span>
        <span v-else class="text-text-muted">{{ placeholder }}</span>
      </button>
      <button type="button" @click="toggleOpen" :disabled="disabled"
        class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" tabindex="-1">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Teleport to="body">
        <div v-if="open" ref="dropdownRef" :style="dropdownStyle"
          class="absolute z-[9999] mt-1 w-full min-w-[200px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          <div class="relative border-b border-border">
            <input ref="searchInputRef" v-model="search" type="text" :placeholder="searchPlaceholder"
              class="w-full border-0 bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
              @keydown.escape="close" @keydown.enter.prevent="selectFirstMatch" />
            <div class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div class="max-h-48 overflow-y-auto">
            <button v-if="filteredOptions.length === 0" type="button" disabled
              class="w-full px-3 py-2 text-sm text-text-muted text-left">
              Sin resultados
            </button>
            <button v-for="option in filteredOptions" :key="option.value" type="button" :disabled="option.disabled"
              :class="[
                'w-full px-3 py-2 text-sm text-left transition-colors',
                option.value === modelValue ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-bg-secondary',
                option.disabled ? 'opacity-50 cursor-not-allowed' : '',
              ]" @mousedown.prevent="select(option.value)">
              {{ option.label }}
            </button>
          </div>
        </div>
      </Teleport>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { SelectOption } from './FormSelect.vue'
import type { SelectSize } from './FormSelect.vue'

let idCounter = 0

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: SelectOption[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  size?: SelectSize
  id?: string
}>(), {
  size: 'md',
  searchPlaceholder: 'Buscar...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const selectId = computed(() => props.id || `form-search-select-${++idCounter}`)
const containerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const open = ref(false)
const search = ref('')

const normalize = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const filteredOptions = computed(() => {
  if (!search.value) return props.options
  const q = normalize(search.value)
  return props.options.filter(o => normalize(o.label).includes(q))
})

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt?.label ?? ''
})

const dropdownStyle = computed(() => {
  if (!containerRef.value) return {}
  const rect = containerRef.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
})

const sizeClasses: Record<SelectSize, string> = {
  sm: 'py-1.5 pl-3 pr-10 text-sm',
  md: 'py-2.5 pl-4 pr-10 text-sm',
  lg: 'py-3 pl-4 pr-10 text-base',
}

const toggleOpen = () => {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    search.value = ''
    nextTick(() => searchInputRef.value?.focus())
  }
}

const select = (value: string | number) => {
  emit('update:modelValue', String(value))
  open.value = false
  search.value = ''
}

const close = () => {
  open.value = false
  search.value = ''
}

const selectFirstMatch = () => {
  if (filteredOptions.value.length > 0) {
    select(filteredOptions.value[0].value)
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (containerRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  close()
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) {
    close()
    containerRef.value?.querySelector('button')?.focus()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside, true)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside, true)
  document.removeEventListener('keydown', handleEscape)
})
</script>
