<template>
  <div class="border-t border-border-subtle bg-bg-secondary/20 px-4 py-2" data-testid="client-visits-detail">
    <div v-if="isLoading" class="space-y-2 py-2" aria-busy="true">
      <div v-for="i in 2" :key="i" class="h-3 w-3/4 animate-pulse rounded bg-bg-secondary" />
    </div>

    <p v-else-if="error" class="py-2 text-xs text-danger">No se pudieron cargar los servicios. Vuelve a tocar la fila para reintentar.</p>

    <p v-else-if="!visits.length" class="py-2 text-xs text-text-muted">Sin servicios en este período.</p>

    <ul v-else class="divide-y divide-border-subtle">
      <li v-for="v in visits" :key="v.id" data-testid="client-visit-row" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm">
        <span class="w-full shrink-0 whitespace-nowrap text-xs tabular-nums text-text-muted sm:w-40">{{ formatDateTime(v.date) }}</span>
        <span class="min-w-0 flex-1 truncate text-text">
          {{ v.service_name }}<span v-if="v.employee_name" class="ml-1 text-xs text-text-muted">· {{ v.employee_name }}</span>
        </span>
        <span v-if="badgeOf(v)" data-testid="visit-badge" class="rounded-full px-2 py-0.5 text-[11px] font-medium"
          :class="badgeOf(v)!.tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'">{{ badgeOf(v)!.label }}</span>
      </li>
    </ul>

    <button v-if="hasNextPage" type="button" data-testid="client-visits-more" :disabled="isFetchingNextPage"
      class="my-1 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-60" @click="fetchNextPage()">
      {{ isFetchingNextPage ? 'Cargando…' : 'Ver más servicios' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { formatDateTime } from '../../lib/formatters'
import { useClientVisits, type ClientVisit, type ServiceHistoryFilters } from '../../composables/services/useServiceHistory'
import { salePaymentBadge } from '../productos/productSalesHistory'

const props = defineProps<{
  /** `client_id` de la cliente, o `none` para las citas sin cliente registrado. */
  clientKey: string
  filters: ServiceHistoryFilters
}>()

const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useClientVisits(
  toRef(props, 'clientKey'),
  toRef(props, 'filters'),
)

const visits = computed<ClientVisit[]>(() => data.value?.pages.flatMap(p => p.visits) ?? [])
const badgeOf = (v: ClientVisit) => salePaymentBadge(v)
</script>
