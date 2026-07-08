<template>
  <div
    class="group rounded-xl border border-border bg-surface p-2.5 shadow-sm transition-theme hover:shadow-md hover:border-warning/30 sm:p-4"
    :class="{ 'cursor-pointer': !editing && isEditable }" @click="onCardClick">
    <!-- Display mode -->
    <template v-if="!editing">
      <div class="flex items-center gap-2 sm:gap-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 text-warning shrink-0 sm:h-10 sm:w-10 transition-theme group-hover:bg-warning/15 group-hover:scale-105">
          <svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-medium uppercase tracking-wider text-text-secondary sm:text-xs">Tasa del Día</p>
          <div class="flex items-baseline gap-0.5">
            <p
              class="text-lg font-bold leading-tight text-warning tabular-nums whitespace-nowrap sm:text-2xl lg:text-xl xl:text-2xl">
              {{ displayRate }}</p>
            <span class="text-[10px] text-text-muted font-medium">Bs</span>
          </div>
          <p class="text-[10px] text-text-muted font-medium">1 USD</p>
        </div>
        <svg v-if="isEditable" class="h-3.5 w-3.5 text-text-muted transition-opacity shrink-0" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div class="flex flex-col gap-2">
        <p class="text-[10px] font-medium uppercase tracking-wider text-text-secondary sm:text-xs">Actualizar Tasa</p>
        <div class="flex items-center gap-2">
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            <svg v-else class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span class="hidden sm:inline">Guardar</span>
          </button>
          <button @click.stop="cancelEdit"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
