<template>
  <div
    class="group rounded-xl border border-border bg-surface px-3 py-2 shadow-sm transition-theme hover:shadow-md hover:border-warning/30 w-full sm:w-56"
    :class="{ 'cursor-pointer': !editing && isEditable }" @click="onCardClick">
    <!-- Display mode -->
    <template v-if="!editing">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Tasa del Día</p>
          <div class="flex items-baseline gap-1">
            <p class="text-lg font-bold leading-tight text-warning tabular-nums">{{ displayRate }}</p>
            <span class="text-[10px] text-text-muted font-medium">Bs</span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <div class="text-right">
            <p class="text-[9px] text-text-muted leading-tight">1 USD =</p>
          </div>
          <svg v-if="isEditable" class="h-3 w-3 text-text-muted transition-opacity" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div class="flex items-center gap-1.5">
        <input :value="editRateValue"
          @input="$emit('update:editRateValue', Number(($event.target as HTMLInputElement).value))"
          @keydown.enter="handleUpdate" type="number" step="0.01" min="0" placeholder="Tasa"
          class="w-full rounded-lg border border-border bg-bg-secondary px-2.5 py-1.5 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-warning focus:bg-surface"
          ref="inputRef" />
        <button @click.stop="handleUpdate" :disabled="updatingRate"
          class="flex items-center gap-1 rounded-lg bg-warning px-2.5 py-1.5 text-xs font-semibold text-text-inverse shadow-sm transition-theme hover:bg-warning/90 disabled:opacity-50 whitespace-nowrap">
          <svg v-if="updatingRate" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button @click.stop="cancelEdit"
          class="rounded-lg p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  isEditable: boolean
  editRateValue: number
  updatingRate: boolean
  displayRate: string
}>()

const emit = defineEmits<{
  'update:editRateValue': [value: number]
  'update-rate': []
}>()

const editing = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const onCardClick = () => {
  if (!props.isEditable) return
  editing.value = true
  nextTick(() => inputRef.value?.focus())
}

const handleUpdate = () => {
  emit('update-rate')
  editing.value = false
}

const cancelEdit = () => {
  editing.value = false
}

watch(editing, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>
