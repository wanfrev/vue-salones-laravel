<template>
  <div class="border-t border-border-subtle bg-bg-secondary/20 px-4 py-2" data-testid="client-sales-detail">
    <div v-if="isLoading" class="space-y-2 py-2" aria-busy="true">
      <div v-for="i in 2" :key="i" class="h-3 w-3/4 animate-pulse rounded bg-bg-secondary" />
    </div>

    <p v-else-if="error" class="py-2 text-xs text-danger">No se pudieron cargar las compras. Vuelve a tocar la fila para reintentar.</p>

    <p v-else-if="!sales.length" class="py-2 text-xs text-text-muted">Sin compras en este período.</p>

    <ul v-else class="divide-y divide-border-subtle">
      <li v-for="s in sales" :key="s.id" data-testid="client-sale-row" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm">
        <span class="w-full shrink-0 whitespace-nowrap text-xs tabular-nums text-text-muted sm:w-40">{{ formatDateTime(s.date) }}</span>
        <span class="min-w-0 flex-1 truncate text-text">
          {{ s.product_name }}<span v-if="s.variant_name" class="ml-1 text-xs text-text-muted">({{ s.variant_name }})</span>
        </span>
        <span v-if="badgeOf(s)" data-testid="sale-badge" class="rounded-full px-2 py-0.5 text-[11px] font-medium"
          :class="badgeOf(s)!.tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'">{{ badgeOf(s)!.label }}</span>
        <span class="w-14 shrink-0 text-right font-medium tabular-nums text-text">×{{ unitsLabel(s.quantity) }}</span>
      </li>
    </ul>

    <button v-if="hasNextPage" type="button" data-testid="client-sales-more" :disabled="isFetchingNextPage"
      class="my-1 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-60" @click="fetchNextPage()">
      {{ isFetchingNextPage ? 'Cargando…' : 'Ver más compras' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { formatDateTime } from '../../lib/formatters'
import { useClientSales, type ClientSale } from '../../composables/inventory/useProductSalesHistory'
import { salePaymentBadge, unitsLabel } from './productSalesHistory'

const props = defineProps<{
  /** `client_id` de la cliente, o `none` para las ventas sin cliente registrado. */
  clientKey: string
  filters: { q: string; productId: string | null; start: string; end: string; branchId: string | null }
}>()

const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useClientSales(
  toRef(props, 'clientKey'),
  toRef(props, 'filters'),
)

const sales = computed<ClientSale[]>(() => data.value?.pages.flatMap(p => p.sales) ?? [])
const badgeOf = (s: ClientSale) => salePaymentBadge(s)
</script>
