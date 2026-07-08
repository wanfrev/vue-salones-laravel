<template>
  <div class="rounded-xl border border-border bg-surface p-4">
    <h2 class="mb-3 text-base font-semibold text-text">{{ title }}</h2>
    <!-- Desktop -->
    <div class="hidden sm:block overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-subtle">
            <slot name="desktop-thead" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <slot name="desktop-tbody" :items="items" />
          <tr v-if="totalCount === 0">
            <td :colspan="100" class="py-6 text-center text-sm text-text-muted">{{ emptyMessage }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Mobile -->
    <div class="sm:hidden space-y-2">
      <slot name="mobile-cards" :items="items" />
      <div v-if="totalCount === 0" class="py-6 text-center text-sm text-text-muted">{{ emptyMessage }}</div>
    </div>
    <PaginationBar :visible="pages.total > pageSize" :start="pages.start" :end="pages.end" :total="pages.total"
      :has-prev="pages.hasPrev" :has-next="pages.hasNext" @prev="$emit('prev')" @next="$emit('next')" />
  </div>
</template>

<script setup lang="ts">
import PaginationBar from './PaginationBar.vue'

defineProps<{
  title: string
  items: any[]
  totalCount: number
  emptyMessage: string
  pages: { total: number; start: number; end: number; hasPrev: boolean; hasNext: boolean }
  pageSize: number
}>()

defineEmits<{
  prev: []
  next: []
}>()
</script>
