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

    <div class="space-y-2 p-3 sm:p-5 lg:hidden">
      <div v-for="tx in transactions" :key="tx.id"
        class="rounded-lg border border-border-subtle bg-bg-secondary p-3.5 transition-theme hover:bg-bg-secondary/80">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="min-w-0 flex-1">
            <div class="text-xs text-text-muted">{{ tx.date }}</div>
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
              {{ tx.description }}
            </div>
          </div>
          <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0',
            tx.type === 'ingreso' ? 'bg-success/10 text-success' :
              tx.type === 'nomina' ? 'bg-warning/10 text-warning' :
                'bg-danger/10 text-danger'
          ]">
            {{ tx.type === 'ingreso' ? 'Ingreso' : tx.type === 'nomina' ? 'Nómina' : 'Gasto' }}
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
          </div>
        </div>
      </div>
    </div>

    <div class="overflow-x-auto hidden lg:block">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-subtle">
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Fecha</th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Descripción</th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Tipo
            </th>
            <th class="px-4 pb-3 pt-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Método</th>
            <th class="px-4 pb-3 pt-2 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Monto</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          <tr v-for="tx in transactions" :key="tx.id" class="text-sm transition-theme hover:bg-bg-secondary/30">
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
                {{ tx.description }}
              </div>
            </td>
            <td class="px-4 py-3.5">
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold',
                tx.type === 'ingreso' ? 'bg-success/10 text-success' :
                  tx.type === 'nomina' ? 'bg-warning/10 text-warning' :
                    'bg-danger/10 text-danger'
              ]">
                {{ tx.type === 'ingreso' ? 'Ingreso' : tx.type === 'nomina' ? 'Nómina' : 'Gasto' }}
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCurrency } from '../../composables/common/useCurrency'

defineProps<{
  transactions: any[]
  canViewAll: boolean
}>()

defineEmits<{
  viewAll: []
}>()

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()
</script>
