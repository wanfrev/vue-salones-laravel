<template>
  <header class="mb-4 flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ title }}</h1>
        <span
          class="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-primary"
          :title="summary"
          data-testid="directory-total"
        >{{ total }}</span>
      </div>
      <p class="mt-0.5 truncate text-xs text-text-muted" data-testid="directory-total-label">{{ summary }}</p>
    </div>
    <div v-if="$slots.default" class="flex shrink-0 items-center gap-2"><slot /></div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBusinessStore } from '../../store/business'
import { useI18n } from '../../i18n'

const props = defineProps<{
  title: string
  /** Total del alcance actual (negocio o sucursal), antes de aplicar búsqueda o filtros. */
  total: number
  /** Sustantivo en singular y plural, ya en minúscula: «cliente» / «clientes». */
  singular: string
  plural: string
}>()

const businessStore = useBusinessStore()
const { t } = useI18n()

/**
 * Con varias sucursales la lista es la de la sucursal activa (más lo que no tiene sucursal asignada);
 * con una sola, es la del negocio. Mientras la sucursal no ha cargado no se afirma ninguna.
 */
const scope = computed(() => {
  if (!businessStore.isMultiBranch) return t('directory.inBusiness')
  const name = businessStore.currentBranch?.name
  return name ? t('directory.inBranch', { name }) : ''
})

const summary = computed(() => {
  const noun = props.total === 1 ? props.singular : props.plural
  const registered = t(props.total === 1 ? 'directory.registeredOne' : 'directory.registeredMany')
  return [`${props.total} ${noun} ${registered}`, scope.value].filter(Boolean).join(' ')
})
</script>
