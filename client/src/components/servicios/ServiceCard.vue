<template>
  <div class="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-theme hover:shadow-md hover:border-border-strong sm:p-5">
    <div class="flex items-start justify-between">
      <div :class="['flex h-10 w-10 items-center justify-center rounded-lg transition-theme group-hover:scale-105', service.iconBg]">
        <svg class="h-5 w-5" :class="service.iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="service.icon" />
        </svg>
      </div>
      <div class="hidden sm:flex gap-1.5">
        <button
          @click="$emit('edit', service)"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
          title="Editar servicio"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          @click="$emit('delete', service)"
          class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
          title="Eliminar servicio"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="mt-3 sm:mt-4">
      <h3 class="font-semibold text-text">{{ service.name }}</h3>
      <p class="text-xs text-text-muted mt-0.5">{{ service.description }}</p>
    </div>

    <div class="mt-3 sm:mt-4 flex items-center justify-between">
      <div>
        <span class="text-lg font-bold text-text tabular-nums">${{ service.price }}</span>
        <span class="block text-xs text-text-muted tabular-nums">{{ formatVESInline(service.price) }} Bs</span>
        <span class="text-xs text-text-muted">{{ service.duration }} min</span>
      </div>
      <span :class="[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        service.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-muted'
      ]">
        <span :class="['h-1.5 w-1.5 rounded-full mr-1.5', service.status === 'Activo' ? 'bg-success' : 'bg-text-muted/40']"></span>
        {{ service.status }}
      </span>
    </div>

    <div class="mt-3 sm:mt-4 border-t border-border-subtle pt-3 sm:pt-4">
      <div class="flex items-center justify-between text-xs">
        <span class="text-text-muted">{{ service.citasMes }} {{ appointmentLabel }}s este mes</span>
        <span class="font-semibold text-success tabular-nums">{{ formatUSD(service.ingresos) }} ingresos</span>
      </div>
    </div>

    <!-- Mobile action bar -->
    <div class="sm:hidden mt-3 flex gap-2">
      <button
        @click="$emit('edit', service)"
        class="flex-1 rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-semibold text-primary transition-theme hover:bg-primary/10 active:bg-primary/20"
      >
        Editar
      </button>
      <button
        @click="$emit('delete', service)"
        class="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger transition-theme hover:bg-danger/10 active:bg-danger/20"
      >
        Eliminar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/useCurrency'
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
