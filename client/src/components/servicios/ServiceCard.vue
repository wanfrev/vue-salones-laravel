<template>
  <article
    data-testid="service-cell"
    class="group flex flex-col gap-3 border-b border-r border-border-subtle p-4 transition-colors hover:bg-bg-secondary/40"
  >
    <div class="flex items-start gap-3">
      <span :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', service.iconBg]">
        <svg class="h-[18px] w-[18px]" :class="service.iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="service.icon" />
        </svg>
      </span>

      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-semibold text-text">{{ service.name }}</h3>
        <p v-if="service.description" class="mt-0.5 line-clamp-2 text-xs text-text-muted">{{ service.description }}</p>
      </div>

      <div class="-mr-1.5 -mt-1 flex shrink-0 items-center">
        <button
          type="button"
          class="rounded-lg p-2 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
          title="Editar servicio"
          aria-label="Editar servicio"
          @click="$emit('edit', service)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
          title="Eliminar servicio"
          aria-label="Eliminar servicio"
          @click="$emit('delete', service)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <span class="text-lg font-bold leading-none text-text tabular-nums">${{ service.price }}</span>
        <p class="mt-1 truncate text-xs text-text-muted tabular-nums">{{ formatVESInline(service.price) }} Bs · {{ service.duration }} min</p>
      </div>
      <span class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium" :class="service.status === 'Activo' ? 'text-success' : 'text-text-muted'">
        <span class="h-1.5 w-1.5 rounded-full" :class="service.status === 'Activo' ? 'bg-success' : 'bg-text-muted/40'" />
        {{ service.status }}
      </span>
    </div>

    <div class="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs">
      <span class="truncate text-text-muted">{{ service.citasMes }} {{ appointmentLabel.toLowerCase() }} este mes</span>
      <span class="shrink-0 font-semibold text-success tabular-nums">{{ formatUSD(service.ingresos) }} ingresos</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'
import type { Servicio } from '../../types/servicio'

defineProps<{
  service: Servicio
  appointmentLabel: string
}>()

defineEmits<{
  edit: [service: Servicio]
  delete: [service: Servicio]
}>()

const { formatVESInline, formatUSD } = useCurrency()
</script>
