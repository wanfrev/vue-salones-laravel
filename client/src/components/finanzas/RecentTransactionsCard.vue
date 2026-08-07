<template>
  <div class="mb-4 rounded-xl border border-border bg-surface shadow-sm">
    <div class="border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-text">Transacciones Recientes</h3>
            <p class="text-xs text-text-muted">Últimos movimientos registrados</p>
          </div>
        </div>
        <button v-if="canViewAll" type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text hover:border-border-strong"
          @click="$emit('viewAll')">
          Ver todas
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="space-y-2 p-3 sm:p-5 lg:hidden">
      <div v-for="tx in transactions" :key="tx.id"
        :class="[
          'rounded-lg border border-border-subtle bg-bg-secondary p-3.5 transition-theme',
          tx.items && tx.items.length > 0 ? 'cursor-pointer hover:border-primary/40' : ''
        ]"
        @click="tx.items && tx.items.length > 0 && toggleExpand(tx.id)">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0 flex-1">
            <div class="text-xs text-text-muted flex items-center gap-1.5">
              <span>{{ tx.date }}</span>
              <span v-if="tx.items && tx.items.length > 0" class="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Factura ({{ tx.items.length }} {{ tx.items.length === 1 ? 'prod.' : 'prods.' }})
              </span>
            </div>
            <div class="font-medium text-text text-sm mt-0.5 flex items-center gap-1.5">
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
              <span>{{ tx.description }}</span>
              <svg v-if="tx.items && tx.items.length > 0"
                :class="['h-3.5 w-3.5 text-text-muted transition-transform duration-200 ml-auto', expandedTxIds.has(tx.id) ? 'rotate-180 text-primary' : '']"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div class="mt-1 text-[11px] text-text-muted">{{ tx.sourceLabel }}</div>
            <div v-if="tx.employee" class="mt-0.5 text-[11px]">
              <span v-if="tx.items || tx.source === 'product_sale'" class="text-primary font-medium flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Vendido por: {{ tx.employee }}
              </span>
              <span v-else class="text-text-secondary">{{ tx.employee }}</span>
            </div>
          </div>
          <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0',
            tx.type === 'ingreso' ? 'bg-success/10 text-success' :
              tx.type === 'nomina' ? 'bg-warning/10 text-warning' :
                'bg-danger/10 text-danger'
          ]">
            {{ tx.type === 'ingreso' ? (tx.items ? 'Factura' : 'Ingreso') : tx.type === 'nomina' ? 'Nómina' : 'Gasto' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-text-muted">{{ tx.method }}</span>
          <div class="text-right">
            <div class="font-semibold text-sm tabular-nums whitespace-nowrap"
              :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'">
              {{ tx.type === 'ingreso' ? '+' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ??
                tx.amount) : formatUSD(tx.amount) }}
            </div>
            <div class="text-xs text-text-muted tabular-nums whitespace-nowrap">
              {{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatVESInline(tx.amount, tx.exchangeRateUsed) + ' Bs'
              }}
            </div>
            <span v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0"
              class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">
              +${{ (tx.tipAmount ?? 0).toFixed(2) }} propina
            </span>
          </div>
        </div>

        <!-- Expanded product details for tienda niche -->
        <div v-if="tx.items && tx.items.length > 0 && expandedTxIds.has(tx.id)" class="mt-3 pt-2.5 border-t border-border-subtle/60 space-y-1.5 bg-surface/60 rounded-lg p-2.5">
          <div class="text-[11px] font-semibold text-text-secondary mb-1 flex items-center justify-between">
            <span>Productos en esta factura:</span>
            <span class="text-text-muted font-normal">{{ tx.items.length }} {{ tx.items.length === 1 ? 'ítem' : 'ítems' }}</span>
          </div>
          <div v-for="item in tx.items" :key="item.id" class="flex items-center justify-between text-xs py-1 border-b border-border-subtle/30 last:border-0">
            <span class="font-medium text-text truncate max-w-[180px]">{{ item.product }}</span>
            <div class="text-right shrink-0">
              <span class="text-text-muted mr-2">{{ item.quantity }} x {{ formatUSD(item.unitPrice) }}</span>
              <span class="font-semibold text-success tabular-nums">{{ formatUSD(item.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="overflow-x-auto hidden lg:block">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-subtle">
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Fecha</th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Descripción</th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Empleado</th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Tipo
            </th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Método</th>
            <th class="px-4 pb-3 pt-2 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Monto</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <template v-for="tx in transactions" :key="tx.id">
            <tr
              :class="[
                'text-sm transition-theme',
                tx.items && tx.items.length > 0 ? 'cursor-pointer hover:bg-bg-secondary/60' : 'hover:bg-bg-secondary/30'
              ]"
              @click="tx.items && tx.items.length > 0 && toggleExpand(tx.id)"
            >
              <td class="px-4 py-3.5 text-text-secondary whitespace-nowrap">{{ tx.date }}</td>
              <td class="px-4 py-3.5 font-medium text-text">
                <div class="flex items-center gap-2">
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
                  <span>{{ tx.description }}</span>
                  <svg v-if="tx.items && tx.items.length > 0"
                    :class="['h-3.5 w-3.5 text-text-muted transition-transform duration-200', expandedTxIds.has(tx.id) ? 'rotate-180 text-primary' : '']"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div class="mt-1 text-[11px] text-text-muted">{{ tx.sourceLabel }}</div>
              </td>
              <td class="px-4 py-3.5 text-text-secondary whitespace-nowrap">{{ tx.employee || '—' }}</td>
              <td class="px-4 py-3.5">
                <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  tx.type === 'ingreso' ? 'bg-success/10 text-success' :
                    tx.type === 'nomina' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                ]">
                  {{ tx.type === 'ingreso' ? (tx.items ? 'Factura' : 'Ingreso') : tx.type === 'nomina' ? 'Nómina' : 'Gasto' }}
                </span>
              </td>
              <td class="px-4 py-3.5">
                <span
                  class="inline-flex items-center rounded-md bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">{{
                  tx.method }}</span>
              </td>
              <td class="px-4 py-3.5 text-right">
                <div class="font-semibold tabular-nums whitespace-nowrap"
                  :class="tx.type === 'ingreso' ? 'text-success' : 'text-danger'">
                  {{ tx.type === 'ingreso' ? '+' : '-' }}{{ tx._currency === 'VES' ? formatVESEs(tx._originalAmount ??
                    tx.amount) : formatUSD(tx.amount) }}
                </div>
                <div class="text-xs text-text-muted tabular-nums whitespace-nowrap">
                  {{ tx._currency === 'VES' ? formatUSD(tx.amount) : formatVESInline(tx.amount, tx.exchangeRateUsed) + ' Bs' }}
                </div>
                <span v-if="tx.type === 'ingreso' && (tx.tipAmount ?? 0) > 0"
                  class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">
                  +${{ (tx.tipAmount ?? 0).toFixed(2) }} propina
                </span>
              </td>
            </tr>
            <!-- Expanded row details for desktop -->
            <tr v-if="tx.items && tx.items.length > 0 && expandedTxIds.has(tx.id)" :key="tx.id + '-expanded'" class="bg-bg-secondary/40">
              <td colspan="6" class="px-6 py-3">
                <div class="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
                  <div class="text-xs font-semibold text-text-secondary flex items-center justify-between">
                    <span class="flex items-center gap-1.5">
                      <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Productos incluidos en la factura
                    </span>
                    <span class="text-text-muted font-normal">{{ tx.items.length }} {{ tx.items.length === 1 ? 'producto' : 'productos' }}</span>
                  </div>
                  <div class="divide-y divide-border-subtle/50">
                    <div v-for="item in tx.items" :key="item.id" class="flex items-center justify-between py-1.5 text-xs">
                      <span class="font-medium text-text">{{ item.product }}</span>
                      <div class="flex items-center gap-5 text-text-secondary tabular-nums">
                        <span>Cantidad: <strong class="text-text">{{ item.quantity }}</strong></span>
                        <span>Precio unit.: <strong class="text-text">{{ formatUSD(item.unitPrice) }}</strong></span>
                        <span>Total: <strong class="text-success font-semibold">{{ formatUSD(item.total) }}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
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

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()

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

