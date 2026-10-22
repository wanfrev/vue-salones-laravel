<template>
  <div class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary shadow-sm transition-theme hover:bg-bg-secondary hover:text-text"
      title="Gestionar categorías"
      aria-label="Gestionar categorías"
      @click="open = !open"
    >
      <PenIcon class="h-4 w-4" />
    </button>
    <div v-if="open" class="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:left-0 sm:right-auto" style="overflow: clip;">
      <div class="border-b border-border-subtle px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Gestionar categorías</p>
      </div>
      <div class="max-h-60 touch-pan-y overflow-y-auto overscroll-contain py-1" style="-webkit-overflow-scrolling: touch;">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-secondary"
          @click="emit('select', cat.id)"
        >
          <span class="truncate font-medium text-text">{{ cat.name }}</span>
          <span class="ml-2 flex shrink-0 items-center gap-3 text-xs font-semibold">
            <span class="cursor-pointer text-primary hover:underline" @click.stop="emit('rename', cat.id); open = false">Editar</span>
            <span class="cursor-pointer text-danger hover:underline" @click.stop="emit('remove', cat.id); open = false">Eliminar</span>
          </span>
        </button>
        <div v-if="adding" class="flex items-center gap-1.5 border-t border-border-subtle px-3 py-2">
          <input
            v-model="name"
            type="text"
            placeholder="Nombre de categoría..."
            class="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-primary"
            @keyup.enter="emit('add')"
          />
          <button type="button" class="rounded bg-primary px-2 py-1 text-xs font-semibold text-white" @click="emit('add')">Agregar</button>
          <button type="button" class="rounded px-1.5 py-1 text-xs text-text-muted hover:text-text" aria-label="Cancelar" @click="adding = false; name = ''">✕</button>
        </div>
        <button
          v-else
          type="button"
          class="flex w-full items-center gap-2 border-t border-border-subtle px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          @click="adding = true"
        >
          <AddCircleIcon class="h-4 w-4" />
          Agregar categoría
        </button>
      </div>
    </div>
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PenIcon, AddCircleIcon } from '@solar-icons/vue/linear'

defineProps<{
  /** Categorías reales (sin «Todos»). */
  categories: { id: string; name: string }[]
}>()

const adding = defineModel<boolean>('adding', { default: false })
const name = defineModel<string>('name', { default: '' })

const emit = defineEmits<{
  select: [id: string]
  rename: [id: string]
  remove: [id: string]
  add: []
}>()

const open = ref(false)
</script>
