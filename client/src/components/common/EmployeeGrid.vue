<template>
  <div class="mb-4 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div v-for="member in employees" :key="member.id"
      class="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-theme hover:shadow-md hover:border-border-strong sm:p-5"
      :class="{ 'opacity-60': member.active === false }">
      <div class="flex items-start gap-3">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-bold text-primary transition-theme group-hover:scale-105 group-hover:shadow-sm">
          {{ getInitials(member.name) }}
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-text truncate">{{ member.name }}</h3>
            <span v-if="member.active === false" class="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">Inactivo</span>
          </div>
          <p class="text-xs text-text-muted">{{ member.role }}</p>
          <p v-if="member.email" class="text-xs text-text-muted truncate mt-0.5">{{ member.email }}</p>
        </div>
      </div>

      <div class="mt-4" :class="isStaffing ? 'space-y-1.5' : 'grid grid-cols-2 gap-2'">
        <template v-if="isStaffing">
          <p v-if="!member.staffingAssignments?.length" class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 p-2.5 text-center text-xs text-text-muted">
            Sin empresa asignada
          </p>
          <div v-for="assignment in member.staffingAssignments" :key="assignment.companyId"
            class="flex items-center gap-2.5 rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 px-2.5 py-2">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V7m8 14V11l-4-2v12M9 9h.01M9 12h.01M9 15h.01" />
              </svg>
            </div>
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-text">{{ assignment.companyName || 'Empresa' }}</span>
            <span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{{ assignment.role }}</span>
          </div>
        </template>
        <template v-else>
          <div class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 p-2.5 text-center">
            <p class="text-sm font-semibold text-text">{{ member.payTypeLabel }}</p>
            <p class="text-xs text-text-muted">Tipo de pago</p>
          </div>
          <div class="rounded-lg bg-gradient-to-br from-bg-secondary/80 to-bg-secondary/40 p-2.5 text-center">
            <p class="text-sm font-semibold text-text">{{ member.payValueLabel }}</p>
            <p class="text-xs text-text-muted">Condición</p>
          </div>
        </template>
      </div>

      <div class="mt-4 grid gap-1.5" :class="showAgenda ? 'grid-cols-3' : 'grid-cols-2'">
        <button v-if="showAgenda" @click="$emit('viewAgenda', member)"
          class="rounded-lg border border-border py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-primary/5 hover:text-primary hover:border-primary/30 flex items-center justify-center gap-1"
          title="Ver Agenda">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="hidden sm:inline">Agenda</span>
        </button>
        <button @click="$emit('viewRecibo', member)"
          class="rounded-lg border border-border py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-primary/5 hover:text-primary hover:border-primary/30 flex items-center justify-center gap-1"
          title="Imprimir Recibo de Pago">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Recibo</span>
        </button>
        <button @click="$emit('edit', member)"
          class="rounded-lg border border-border py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text hover:border-border-strong flex items-center justify-center gap-1"
          title="Editar Empleado">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span class="hidden sm:inline">Editar</span>
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
withDefaults(defineProps<{
  employees: any[]
  showAll: boolean
  hasMore: boolean
  totalCount: number
  getInitials: (name?: string) => string
  isStaffing?: boolean
  showAgenda?: boolean
}>(), {
  isStaffing: false,
  showAgenda: true,
})

defineEmits<{
  edit: [employee: any]
  viewAgenda: [employee: any]
  viewRecibo: [employee: any]
  toggleShowAll: []
}>()
</script>
