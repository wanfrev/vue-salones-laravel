<template>
  <div class="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <div class="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-text">Transacciones Recientes</h3>
        <p class="text-xs text-text-muted">Últimos movimientos registrados</p>
      </div>
      <button v-if="canViewAll" type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
        @click="$emit('viewAll')">
        Ver todas
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Encabezados (solo escritorio) -->
    <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
      <span :class="headClass">Fecha</span>
      <span :class="headClass">Descripción · Empleado · Método</span>
      <span :class="headClass">Tipo</span>
      <span :class="[headClass, 'text-right']">Monto</span>
    </div>

    <ul class="divide-y divide-border-subtle">
      <li v-for="tx in transactions" :key="tx.id" data-testid="recent-tx">
        <div
          :class="[gridClass, 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 transition-colors', hasItems(tx) ? 'cursor-pointer hover:bg-bg-secondary/50' : 'hover:bg-bg-secondary/30']"
          @click="hasItems(tx) && toggleExpand(tx.id)"
        >
          <!-- Fecha (en móvil comparte línea con el tipo) -->
          <p class="col-start-1 row-start-1 text-xs text-text-muted lg:col-start-auto lg:row-start-auto lg:whitespace-nowrap lg:text-sm lg:text-text-secondary">{{ tx.date }}</p>

          <!-- Descripción, origen, empleado y método -->
          <div class="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:row-start-auto">
            <div class="flex items-center gap-1.5 text-sm font-medium text-text">
              <svg v-if="tx.type === 'ingreso'" class="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" class="fill-success/10" />
                <path d="M8 4v5M5 8l3 3 3-3" stroke="currentColor" class="text-success" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <svg v-else class="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" class="fill-danger/10" />
                <path d="M8 11V6M5 7l3-3 3 3" stroke="currentColor" class="text-danger" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="min-w-0 truncate">{{ tx.description }}</span>
              <span v-if="hasItems(tx)" class="shrink-0 text-[11px] font-semibold text-primary">
                Factura ({{ tx.items.length }} {{ tx.items.length === 1 ? 'prod.' : 'prods.' }})
              </span>
              <svg v-if="hasItems(tx)"
                :class="['h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200', expandedTxIds.has(tx.id) ? 'rotate-180 text-primary' : '']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-text-muted">
              <span>{{ tx.sourceLabel }}</span>
              <template v-if="tx.employee">
                <span aria-hidden="true">·</span>
                <span v-if="tx.items || tx.source === 'product_sale'" class="font-medium text-primary">Vendido por: {{ tx.employee }}</span>
                <span v-else class="text-text-secondary">{{ tx.employee }}</span>
              </template>
              <template v-if="tx.method">
                <span aria-hidden="true">·</span>
                <span class="text-text-secondary">{{ tx.method }}</span>
              </template>
            </p>
          </div>

          <!-- Tipo -->
          <span :class="['col-start-2 row-start-1 justify-self-end text-xs font-semibold lg:col-start-auto lg:row-start-auto lg:justify-self-start', typeText(tx.type)]">
            {{ tx.type === 'ingreso' ? (tx.items ? (tx.receiptCode ? 'Factura #' + tx.receiptCode : 'Factura') : 'Ingreso') : tx.type === 'nomina' ? 'Nómina' : 'Gasto' }}
          </span>

          <!-- Monto -->
          <div class="col-span-2 row-start-3 text-right lg:col-span-1 lg:row-start-auto">
            <div class="whitespace-nowrap text-sm font-semibold tabular-nums" :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'">
              {{ tx.type === 'ingreso' ? '+' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ?? tx.amount) : formatUSD(tx.amount) }}
            </div>
            <div class="whitespace-nowrap text-xs tabular-nums text-text-muted">
              {{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatSecondary(tx.amount, tx.exchangeRateUsed) }}
            </div>
            <span v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0" class="mt-0.5 inline-block text-[11px] font-semibold text-primary">
              +${{ (tx.tipAmount ?? 0).toFixed(2) }} propina
            </span>
          </div>
        </div>

        <!-- Productos de la factura -->
        <div v-if="hasItems(tx) && expandedTxIds.has(tx.id)" class="border-t border-border-subtle bg-bg-secondary/40 px-4 py-3">
          <div class="mb-1 flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Productos incluidos en la factura
            </span>
            <span class="font-normal text-text-muted">{{ tx.items.length }} {{ tx.items.length === 1 ? 'producto' : 'productos' }}</span>
          </div>
          <div class="divide-y divide-border-subtle/60">
            <div v-for="item in tx.items" :key="item.id" class="flex flex-wrap items-center justify-between gap-x-5 gap-y-0.5 py-1.5 text-xs">
              <span class="min-w-0 truncate font-medium text-text">{{ item.product }}</span>
              <div class="flex flex-wrap items-center gap-x-5 tabular-nums text-text-secondary">
                <span>Cantidad: <strong class="text-text">{{ item.quantity }}</strong></span>
                <span>Precio unit.: <strong class="text-text">{{ formatUSD(item.unitPrice) }}</strong></span>
                <span>Total: <strong class="font-semibold text-success">{{ formatUSD(item.total) }}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  transactions: any[]
  canViewAll: boolean
}>()

defineEmits<{
  viewAll: []
}>()

const { formatUSD, formatSecondary, formatVESEs } = useCurrency()

const gridClass = 'lg:grid lg:grid-cols-[6rem_minmax(0,1fr)_7rem_8rem] lg:items-center lg:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const hasItems = (tx: any) => !!(tx.items && tx.items.length > 0)
// Mismo color de siempre por tipo de movimiento.
const typeText = (type: string) => (type === 'ingreso' ? 'text-success' : type === 'nomina' ? 'text-warning' : 'text-danger')

const expandedTxIds = ref<Set<string>>(new Set())

const toggleExpand = (id: string) => {
  const newSet = new Set(expandedTxIds.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedTxIds.value = newSet
}
</script>

