<template>
  <div class="space-y-1.5" ref="dropdownRef">
    <label v-if="label" class="block text-sm font-medium text-text-secondary">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <div class="relative">
      <button type="button" @click="toggleDropdown" :disabled="disabled"
        class="w-full flex items-center gap-2 rounded-xl border bg-surface text-text outline-none transition-all text-left"
        :class="[
          isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-border-strong',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
          disabled ? 'cursor-not-allowed opacity-50 bg-bg-secondary' : 'cursor-pointer',
          sizeClasses[size],
        ]">
        <template v-if="selectedOption">
          <div v-if="selectedOption.icon" class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
            <span class="text-[10px] font-bold text-primary">{{ selectedOption.icon }}</span>
          </div>
          <span class="truncate flex-1">{{ selectedOption.label }}</span>
        </template>
        <span v-else class="text-text-muted truncate flex-1">{{ placeholder }}</span>
        <svg class="h-4 w-4 flex-shrink-0 text-text-muted transition-transform duration-200" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0 scale-95 -translate-y-1" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 -translate-y-1">
        <div v-if="isOpen" class="absolute left-0 top-full z-50 mt-1.5 w-auto min-w-[260px] max-w-[400px] rounded-xl border border-border bg-surface p-1.5 shadow-xl max-h-64 overflow-hidden flex flex-col">
          <div v-if="searchable && options.length > 3" class="px-2 py-1.5 mb-1">
            <input v-model="searchQuery" type="text" placeholder="Buscar..."
              class="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/20"
              @click.stop ref="searchInputRef" />
          </div>
          <div class="overflow-y-auto flex-1">
            <button v-if="!required && !placeholder" type="button" @click="selectOption('')"
              class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors"
              :class="modelValue === '' ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-bg-secondary'">
              <span class="flex-1 text-left text-text-muted">Ninguna</span>
              <svg v-if="modelValue === ''" class="h-4 w-4 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button v-for="option in filteredOptions" :key="option.value" type="button" @click="selectOption(option.value)" :disabled="option.disabled"
              class="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :class="modelValue === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-text hover:bg-bg-secondary'">
              <div v-if="option.icon" class="flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0"
                :class="modelValue === option.value ? 'bg-primary/20 text-primary' : 'bg-bg-secondary text-text-secondary'">
                <span class="text-[10px] font-bold">{{ option.icon }}</span>
              </div>
              <span class="flex-1 text-left whitespace-normal break-words">{{ option.label }}</span>
              <span v-if="option.sublabel" class="text-[11px] text-text-muted whitespace-nowrap shrink-0 ml-1">{{ option.sublabel }}</span>
              <svg v-if="modelValue === option.value" class="h-4 w-4 flex-shrink-0 text-primary ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <div v-if="filteredOptions.length === 0" class="px-3 py-4 text-center text-sm text-text-muted">
              Sin resultados
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

export interface DropdownOption {
  value: string | number
  label: string
  disabled?: boolean
  icon?: string
  sublabel?: string
}

export type DropdownSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string | number
  options: DropdownOption[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  size?: DropdownSize
  searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  searchable: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const sizeClasses: Record<DropdownSize, string> = {
  sm: 'py-1.5 pl-2.5 pr-2 text-sm',
  md: 'py-2.5 pl-3 pr-2.5 text-sm',
  lg: 'py-3 pl-3.5 pr-3 text-base',
}

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue))

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value && props.searchable && props.options.length > 3) {
    nextTick(() => searchInputRef.value?.focus())
  }
}

const selectOption = (value: string | number) => {
  emit('update:modelValue', value as string)
  isOpen.value = false
  searchQuery.value = ''
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
    searchQuery.value = ''
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

watch(() => isOpen.value, (val) => {
  if (!val) searchQuery.value = ''
})
</script>
