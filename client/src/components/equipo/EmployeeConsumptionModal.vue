<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useBusinessStore } from '../../store/business'
import { useCurrency } from '../../composables/common/useCurrency'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'consumption-saved'])
const businessStore = useBusinessStore()
const { formatUSD } = useCurrency()
const ctx = reactive(props.paymentsCtx)

const selectedProduct = computed(() => {
  if (!ctx.consumptionForm.productId) return null
  return ctx.productos?.find((p: any) => p.id === ctx.consumptionForm.productId) ?? null
})

const onProductSelected = () => {
  const p = selectedProduct.value
  if (!p) return
  ctx.consumptionForm.concept = p.name
  ctx.consumptionForm.unitPrice = p.unitPrice || 0
  ctx.consumptionForm.quantity = 1
  ctx.consumptionForm.amount = p.unitPrice || 0
}

watch([() => ctx.consumptionForm.quantity, () => ctx.consumptionForm.unitPrice, () => ctx.consumptionForm.mode], () => {
  if (ctx.consumptionForm.mode === 'product') {
    ctx.consumptionForm.amount = Math.round((ctx.consumptionForm.quantity || 0) * (ctx.consumptionForm.unitPrice || 0) * 100) / 100
  }
})

const handleSubmit = async () => {
  try {
    await ctx.handleSaveConsumption()
    emit('consumption-saved')
    emit('close')
  } catch {
    /* error handled in ctx */
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ctx.showConsumptionModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Debitar consumo</h2>
          <p class="text-sm text-text-muted">Registra un monto o un producto consumido por el empleado</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <!-- Selección de Empleado -->
          <div>
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select
              v-model="ctx.consumptionForm.employeeId"
              required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
            >
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name ?? emp.full_name }}</option>
            </select>
          </div>

          <!-- Selector de Modo de Consumo -->
          <div class="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
            <button
              type="button"
              @click="ctx.consumptionForm.mode = 'amount'"
              class="flex-1 rounded-md py-1.5 font-semibold transition-theme text-center"
              :class="ctx.consumptionForm.mode === 'amount' ? 'bg-primary text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text'"
            >
              Monto directo
            </button>
            <button
              type="button"
              @click="ctx.consumptionForm.mode = 'product'"
              class="flex-1 rounded-md py-1.5 font-semibold transition-theme text-center"
              :class="ctx.consumptionForm.mode === 'product' ? 'bg-primary text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text'"
            >
              Producto de inventario
            </button>
          </div>

          <!-- MODO: PRODUCTO DE INVENTARIO -->
          <template v-if="ctx.consumptionForm.mode === 'product'">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Producto de inventario</label>
              <select
                v-model="ctx.consumptionForm.productId"
                @change="onProductSelected"
                required
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
              >
                <option value="" disabled>Seleccionar producto...</option>
                <option
                  v-for="prod in ctx.productos"
                  :key="prod.id"
                  :value="prod.id"
                >
                  {{ prod.name }} (Stock: {{ prod.stockTotal ?? 0 }}) · {{ formatUSD(prod.unitPrice) }}
                </option>
              </select>
              <div v-if="selectedProduct" class="mt-1.5 flex items-center justify-between text-xs text-text-muted">
                <span>Stock disponible: <strong :class="(selectedProduct.stockTotal ?? 0) <= 0 ? 'text-danger' : 'text-text'">{{ selectedProduct.stockTotal ?? 0 }} unid.</strong></span>
                <span>Precio catálogo: <strong>{{ formatUSD(selectedProduct.unitPrice) }}</strong></span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Cantidad a rebajar</label>
                <input
                  v-model.number="ctx.consumptionForm.quantity"
                  type="number"
                  min="0.01"
                  step="1"
                  placeholder="1"
                  required
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Precio a cobrar ($)</label>
                <input
                  v-model.number="ctx.consumptionForm.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
                />
              </div>
            </div>

            <div class="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5 flex items-center justify-between text-xs">
              <span class="text-text-muted font-medium">Total a debitar al empleado:</span>
              <span class="text-sm font-bold text-primary tabular-nums">
                {{ formatUSD((ctx.consumptionForm.quantity || 0) * (ctx.consumptionForm.unitPrice || 0)) }}
              </span>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-text">Concepto en nómina</label>
              <input
                v-model="ctx.consumptionForm.concept"
                type="text"
                required
                placeholder="Ej: Producto consumido..."
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
              />
            </div>
          </template>

          <!-- MODO: MONTO DIRECTO -->
          <template v-else>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Concepto</label>
              <input
                v-model="ctx.consumptionForm.concept"
                type="text"
                required
                placeholder="Ej: Almuerzo, adelanto, producto..."
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Monto</label>
                <input
                  v-model.number="ctx.consumptionForm.amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
                <select
                  v-model="ctx.consumptionForm.currency"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
                >
                  <option value="USD">USD $</option>
                  <option value="VES">Bs</option>
                </select>
              </div>
            </div>
          </template>

          <div>
            <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input
              v-model="ctx.consumptionForm.paymentDate"
              type="date"
              required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input
              v-model="ctx.consumptionForm.notes"
              type="text"
              placeholder="Opcional..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
            />
          </div>

          <div v-if="ctx.saveError" class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {{ ctx.saveError }}
          </div>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="ctx.isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ ctx.isSaving ? 'Guardando...' : 'Debitar consumo' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
