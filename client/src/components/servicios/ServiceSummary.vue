<template>
  <dl class="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border-subtle px-4 py-3 sm:flex sm:flex-wrap sm:gap-x-10" data-testid="service-summary">
    <div>
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{{ plural }} activos</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">{{ activos }}</dd>
    </div>
    <div>
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Categorías</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">{{ categorias }}</dd>
    </div>
    <div>
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Citas del mes</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">{{ citasMes }}</dd>
    </div>
    <div>
      <dt class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Precio promedio</dt>
      <dd class="mt-0.5 text-lg font-bold tabular-nums text-text">
        {{ formatUSD(precioPromedio) }}
        <span class="text-xs font-normal text-text-muted">{{ formatVESInline(precioPromedio) }} Bs</span>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  plural: string
  activos: number
  categorias: number
  citasMes: number
  precioPromedio: number
}>()

const { formatUSD, formatVESInline } = useCurrency()
</script>
