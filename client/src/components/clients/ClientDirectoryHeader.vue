<template>
  <header class="mb-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ title }}</h1>
        <span
          class="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-primary"
          :title="summary"
          data-testid="client-total"
        >{{ total }}</span>
      </div>
      <p class="mt-0.5 truncate text-xs text-text-muted" data-testid="client-total-label">{{ summary }}</p>
    </div>
    <slot />
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBusinessStore } from '../../store/business'

const props = defineProps<{
  /** Total de clientes del alcance actual (negocio o sucursal), antes de aplicar búsqueda o filtros. */
  total: number
}>()

const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)
const title = computed(() => terminology.value.clientPlural || 'Clientes')

/**
 * Con varias sucursales la lista es la de la sucursal activa (más los clientes sin sucursal asignada);
 * con una sola, es la del negocio. Mientras la sucursal no ha cargado no se afirma ninguna.
 */
const scope = computed(() => {
  if (!businessStore.isMultiBranch) return 'en el negocio'
  const name = businessStore.currentBranch?.name
  return name ? `en la sucursal ${name}` : ''
})

const summary = computed(() => {
  const noun = props.total === 1
    ? (terminology.value.client || 'cliente').toLowerCase()
    : (terminology.value.clientPlural || 'clientes').toLowerCase()
  const registered = props.total === 1 ? 'registrado' : 'registrados'
  return [`${props.total} ${noun} ${registered}`, scope.value].filter(Boolean).join(' ')
})
</script>
