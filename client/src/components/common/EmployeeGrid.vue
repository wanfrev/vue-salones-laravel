<template>
  <div class="mb-4 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div v-for="member in employees" :key="member.id"
      class="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-theme hover:shadow-md hover:border-border-strong sm:p-5">
      <div class="flex items-start gap-3">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-bold text-primary transition-theme group-hover:scale-105 group-hover:shadow-sm">
          {{ getInitials(member.name) }}
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <h3 class="font-semibold text-text">{{ member.name }}</h3>
          <p class="text-xs text-text-muted">{{ member.role }}</p>
          <p v-if="member.email" class="text-xs text-text-muted truncate mt-0.5">{{ member.email }}</p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <div class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 p-2.5 text-center">
          <p class="text-sm font-semibold text-text">{{ member.payTypeLabel }}</p>
          <p class="text-xs text-text-muted">Tipo de pago</p>
        </div>
        <div class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 p-2.5 text-center">
          <p class="text-sm font-semibold text-text">{{ member.payValueLabel }}</p>
          <p class="text-xs text-text-muted">Condición</p>
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button @click="$emit('viewAgenda', member)"
          class="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-primary/5 hover:text-primary hover:border-primary/30">
          Ver Agenda
        </button>
        <button @click="$emit('edit', member)"
          class="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text hover:border-border-strong">
          Editar
        </button>
      </div>
    </div>
  </div>

  <div v-if="hasMore" class="mb-5 flex justify-center">
    <button type="button"
      class="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5 hover:border-primary/30"
      @click="$emit('toggleShowAll')">
      <svg class="h-4 w-4" :class="showAll ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      {{ showAll ? 'Ver menos' : 'Ver todos (' + totalCount + ')' }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  employees: any[]
  showAll: boolean
  hasMore: boolean
  totalCount: number
  getInitials: (name?: string) => string
}>()

defineEmits<{
  edit: [employee: any]
  viewAgenda: [employee: any]
  toggleShowAll: []
}>()
</script>
