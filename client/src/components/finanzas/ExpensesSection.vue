<template>
  <div class="rounded-xl border border-border bg-surface h-full flex flex-col">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5 shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-text">Gastos del Mes</h3>
          <p class="text-xs text-text-secondary">Egresos fijos y variables</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="canViewAllExpenses" type="button"
          class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text hover:border-border-strong"
          @click="emit('view-all')">
          Ver todos
        </button>
        <button @click="expensesCtx.openNew"
          class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Registrar gasto</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center flex-1 flex items-center justify-center">
      <div class="flex items-center justify-center gap-2 text-sm text-text-muted">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando gastos...
      </div>
    </div>

    <div v-else-if="error" class="py-8 text-center flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 mb-1">
          <svg class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p class="text-sm text-danger">{{ error }}</p>
      </div>
    </div>

    <div v-else-if="expenses.length === 0" class="py-8 text-center flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-1">
          <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
        </div>
        <p class="text-sm text-text-muted">No hay gastos en este período</p>
      </div>
    </div>

    <template v-else>
      <div class="lg:hidden space-y-2 mb-3 px-4 sm:px-5">
        <div v-for="expense in visibleExpenses" :key="expense.id"
          class="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <div class="flex items-start justify-between mb-1.5">
            <div>
              <div class="text-xs text-text-muted">{{ expense.date }}</div>
              <div class="font-medium text-text text-sm">{{ expense.name }}</div>
            </div>
            <span :class="[
              'rounded-full px-2 py-0.5 text-xs shrink-0',
              expense.category === 'Fijos' ? 'bg-info/10 text-info' :
                expense.category === 'Insumos' ? 'bg-warning/10 text-warning' :
                  'bg-primary/10 text-primary'
            ]">{{ expense.category }}</span>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium text-text whitespace-nowrap">{{ expense.currency === 'VES' ?
                formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</span>
              <div class="text-xs text-text-muted whitespace-nowrap">{{ expense.currency === 'VES' ?
                formatUSD(expense.amount) : formatVESInline(expense.amount, expense.exchangeRateUsed) + ' Bs' }}</div>
            </div>
            <div class="flex items-center gap-1">
              <button @click="expensesCtx.openEdit(expense)"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                title="Editar gasto">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button @click="expensesCtx.handleDelete(expense.id)"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                title="Eliminar gasto">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto hidden lg:block px-4 sm:px-5 flex-1">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-subtle">
              <th class="pb-3 text-left text-xs font-semibold uppercase text-text-secondary">Fecha</th>
              <th class="pb-3 text-left text-xs font-semibold uppercase text-text-secondary">Concepto</th>
              <th class="pb-3 text-left text-xs font-semibold uppercase text-text-secondary">Categoría</th>
              <th class="pb-3 text-right text-xs font-semibold uppercase text-text-secondary">Monto</th>
              <th class="pb-3 text-center text-xs font-semibold uppercase text-text-secondary">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="expense in visibleExpenses" :key="expense.id"
              class="text-sm transition-theme hover:bg-bg-secondary/50">
              <td class="py-3 text-text-secondary">{{ expense.date }}</td>
              <td class="py-3 font-medium text-text">{{ expense.name }}</td>
              <td class="py-3">
                <span :class="[
                  'rounded-full px-2 py-0.5 text-xs',
                  expense.category === 'Fijos' ? 'bg-info/10 text-info' :
                    expense.category === 'Insumos' ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                ]">{{ expense.category }}</span>
              </td>
              <td class="py-3 text-right">
                <div class="font-medium text-text whitespace-nowrap">{{ expense.currency === 'VES' ?
                  formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</div>
                <div class="text-xs text-text-muted whitespace-nowrap">{{ expense.currency === 'VES' ?
                  formatUSD(expense.amount) : formatVESInline(expense.amount, expense.exchangeRateUsed) + ' Bs' }}</div>
              </td>
              <td class="py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="expensesCtx.openEdit(expense)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                    title="Editar gasto">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button @click="expensesCtx.handleDelete(expense.id)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                    title="Eliminar gasto">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <div v-if="expensesCtx.showExpenseModal.value"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="expensesCtx.closeModal">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ expensesCtx.editingExpenseId.value ? 'Editar gasto' : 'Registrar gasto' }}</h2>
          <p class="text-sm text-text-muted">{{ expensesCtx.editingExpenseId.value ? 'Modifica los datos del egreso' : 'Agrega un egreso al negocio' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-name">Concepto</label>
            <input id="exp-name" v-model="expensesCtx.expenseForm.value.name" type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Ej: Renta del local" required />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-category">Categoría</label>
              <select id="exp-category" v-model="expensesCtx.expenseForm.value.category"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="Fijos">Fijos</option>
                <option value="Insumos">Insumos</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-amount">Monto</label>
              <input id="exp-amount" v-model.number="expensesCtx.expenseForm.value.amount" type="number" min="0"
                step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" required />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="exp-currency">Moneda</label>
              <select id="exp-currency" v-model="expensesCtx.expenseForm.value.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-date">Fecha</label>
            <input id="exp-date" v-model="expensesCtx.expenseForm.value.date" type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              required />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="exp-notes">Notas</label>
            <textarea id="exp-notes" v-model="expensesCtx.expenseForm.value.notes" rows="2"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Opcional" />
          </div>
          <p v-if="expensesCtx.saveError.value" class="text-sm text-danger">{{ expensesCtx.saveError.value }}</p>
          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="expensesCtx.closeModal">Cancelar</button>
            <button type="submit" :disabled="expensesCtx.saveMutation.isPending.value"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ expensesCtx.saveMutation.isPending.value ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useExpenses } from '../../composables/finanzas/useExpenses'
import type { ExpenseRow } from '../../services/expensesService'

const props = defineProps<{
  expenses: ExpenseRow[]
  businessId: string | null
  isLoading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'saved': []
  'view-all': []
}>()

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()

const expensesCtx = useExpenses(computed(() => props.businessId))

const handleSave = async () => {
  try {
    await expensesCtx.handleSave()
    emit('saved')
  } catch {
    // Error handled by composable's onError + saveError
  }
}

const visibleExpenses = computed(() => props.expenses.slice(0, 5))

const canViewAllExpenses = computed(() => props.expenses.length > 5)
</script>
