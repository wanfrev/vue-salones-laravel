<template>
  <div v-if="total > 0" class="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5 sm:px-4">
    <p class="text-xs text-text-muted sm:text-sm">
      <span class="font-medium text-text">{{ start }}-{{ end }}</span> de {{ total }}
    </p>

    <nav v-if="totalPages > 1" class="flex items-center gap-1" aria-label="Paginación">
      <button
        type="button"
        :disabled="!hasPrevious"
        class="rounded-lg p-1.5 transition-theme sm:px-2.5 sm:py-1.5 sm:text-sm sm:font-medium"
        :class="hasPrevious ? 'text-text-secondary hover:bg-bg-secondary' : 'cursor-not-allowed text-text-muted opacity-40'"
        aria-label="Página anterior"
        @click="emit('previous')"
      >
        <ArrowLeftIcon class="h-4 w-4 sm:hidden" />
        <span class="hidden sm:inline">Anterior</span>
      </button>

      <!-- Escritorio: números de página -->
      <template v-for="(page, i) in pageNumbers" :key="`${page}-${i}`">
        <span v-if="page === '...'" class="hidden px-1 text-text-muted sm:inline">…</span>
        <button
          v-else
          type="button"
          class="hidden min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium transition-theme sm:block"
          :class="page === currentPage ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-bg-secondary'"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="emit('goto', page as number)"
        >
          {{ page }}
        </button>
      </template>

      <!-- Móvil: indicador compacto -->
      <span class="px-1 text-xs font-medium text-text sm:hidden">{{ currentPage }} / {{ totalPages }}</span>

      <button
        type="button"
        :disabled="!hasNext"
        class="rounded-lg p-1.5 transition-theme sm:px-2.5 sm:py-1.5 sm:text-sm sm:font-medium"
        :class="hasNext ? 'text-text-secondary hover:bg-bg-secondary' : 'cursor-not-allowed text-text-muted opacity-40'"
        aria-label="Página siguiente"
        @click="emit('next')"
      >
        <ArrowRightIcon class="h-4 w-4 sm:hidden" />
        <span class="hidden sm:inline">Siguiente</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'

defineProps<{
  currentPage: number
  totalPages: number
  pageNumbers: (number | string)[]
  hasNext: boolean
  hasPrevious: boolean
  start: number
  end: number
  total: number
}>()

const emit = defineEmits<{
  goto: [page: number]
  next: []
  previous: []
}>()
</script>
