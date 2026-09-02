<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { formatPayType } from '../../lib/formatters'
import { getEmployeeBalance, type EmployeeBalance } from '../../services/employeePaymentsService'

const props = defineProps<{
  paymentsCtx: any
  businessId: string | null
  branchId: string | null
  employees: any[]
}>()

const emit = defineEmits(['close', 'payment-saved'])
const { formatUSD, formatSecondary, formatVESEs, employeeRate } = useCurrency()
const businessStore = useBusinessStore()

const ctx = reactive(props.paymentsCtx)

const toYmd = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
const now = new Date()
const periodStart = ref(toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)))
const periodEnd = ref(toYmd(now))

const balance = ref<EmployeeBalance | null>(null)
const loadingBalance = ref(false)

const fetchBalance = async () => {
  const empId = ctx.paymentForm.employeeId
  if (!empId || !props.businessId) { balance.value = null; return }
  loadingBalance.value = true
  try {
    balance.value = await getEmployeeBalance(props.businessId, empId, props.branchId, periodStart.value || undefined, periodEnd.value || undefined)
  } catch {
    balance.value = null
  } finally {
    loadingBalance.value = false
  }
}

watch(() => ctx.paymentForm.employeeId, fetchBalance)
watch([periodStart, periodEnd], fetchBalance)
watch(ctx.showPaymentModal, (v) => {
  if (v) { balance.value = null; showConsumptionForm.value = false; fetchBalance() }
})

const effectiveRate = computed(() => {
  if (balance.value?.employee_ves_rate && balance.value.employee_ves_rate > 0) {
    return balance.value.employee_ves_rate
  }
  return employeeRate.value
})

const pendingBalance = computed(() => {
  if (!balance.value) return 0
  return Math.max(0, balance.value.total_earned - balance.value.total_paid - balance.value.total_consumed)
})

const rateLabel = computed(() => {
  if (balance.value?.employee_ves_rate && balance.value.employee_ves_rate > 0) {
    return `tasa del empleado: ${balance.value.employee_ves_rate}`
  }
  return `tasa empleados: ${employeeRate.value}`
})

const convertedAmount = computed(() => {
  const amount = ctx.paymentForm.amount
  if (!amount || amount <= 0) return ''
  if (ctx.paymentForm.currency === 'USD') {
    return `${formatSecondary(amount, effectiveRate.value)}`
  }
  return `${formatUSD(amount / effectiveRate.value)}`
})

const isDayRateMode = computed(() =>
  !!businessStore.features.payroll_day_average_rate_enabled && !ctx.editingPaymentId
)

watch(balance, (b) => {
  if (b && !ctx.dayRateForm.tasa) {
    ctx.dayRateForm.tasa = effectiveRate.value
  }
})

const dayRatePreview = computed(() => {
  const pendingUsd = pendingBalance.value
  const { divisas, tasa, bolivares } = ctx.dayRateForm
  const rate = tasa || effectiveRate.value
  const pendingBs = pendingUsd * rate
  const paidUsdEquivalent = divisas + (tasa > 0 ? bolivares / tasa : 0)
  const paidBs = divisas * tasa + bolivares
  return {
    pendingUsd,
    pendingBs,
    remainingUsd: pendingUsd - paidUsdEquivalent,
    remainingBs: pendingBs - paidBs,
  }
})

const handleSubmit = async () => {
  try {
    if (isDayRateMode.value) {
      await ctx.handleSaveDayRatePayment()
    } else {
      await ctx.handleSavePayment()
    }
    emit('payment-saved'); emit('close')
  } catch { }
}

const showConsumptionForm = ref(false)
const consumptionForm = reactive({
  mode: 'amount' as 'amount' | 'product',
  productId: '',
  quantity: 1,
  unitPrice: 0,
  concept: '',
  amount: 0,
  currency: 'USD' as 'USD' | 'VES',
  paymentDate: toYmd(now),
  notes: '',
})
const consumptionSaving = ref(false)
const consumptionError = ref('')

const selectedProduct = computed(() => {
  if (!consumptionForm.productId) return null
  return ctx.productos?.find((p: any) => p.id === consumptionForm.productId) ?? null
})

const onProductSelected = () => {
  const p = selectedProduct.value
  if (!p) return
  consumptionForm.concept = p.name
  consumptionForm.unitPrice = p.unitPrice || 0
  consumptionForm.quantity = 1
  consumptionForm.amount = p.unitPrice || 0
}

watch([() => consumptionForm.quantity, () => consumptionForm.unitPrice, () => consumptionForm.mode], () => {
  if (consumptionForm.mode === 'product') {
    consumptionForm.amount = Math.round(consumptionForm.quantity * consumptionForm.unitPrice * 100) / 100
  }
})

const openConsumptionForm = () => {
  consumptionForm.mode = 'amount'
  consumptionForm.productId = ''
  consumptionForm.quantity = 1
  consumptionForm.unitPrice = 0
  consumptionForm.concept = ''
  consumptionForm.amount = 0
  consumptionForm.currency = 'USD'
  consumptionForm.paymentDate = toYmd(now)
  consumptionForm.notes = ''
  consumptionError.value = ''
  showConsumptionForm.value = true
}

const cancelConsumption = () => {
  showConsumptionForm.value = false
}

const handleSaveConsumption = async () => {
  if (!ctx.paymentForm.employeeId) return
  if (consumptionForm.mode === 'product' && !consumptionForm.productId) {
    consumptionError.value = 'Por favor selecciona un producto'
    return
  }
  consumptionSaving.value = true
  consumptionError.value = ''
  try {
    ctx.consumptionForm.mode = consumptionForm.mode
    ctx.consumptionForm.employeeId = ctx.paymentForm.employeeId
    ctx.consumptionForm.productId = consumptionForm.mode === 'product' ? consumptionForm.productId : ''
    ctx.consumptionForm.quantity = consumptionForm.mode === 'product' ? consumptionForm.quantity : 1
    ctx.consumptionForm.unitPrice = consumptionForm.mode === 'product' ? consumptionForm.unitPrice : 0
    ctx.consumptionForm.concept = consumptionForm.concept
    ctx.consumptionForm.amount = consumptionForm.amount
    ctx.consumptionForm.currency = consumptionForm.currency
    ctx.consumptionForm.paymentDate = consumptionForm.paymentDate
    ctx.consumptionForm.notes = consumptionForm.notes || ''
    await ctx.handleSaveConsumption()
    showConsumptionForm.value = false
    await fetchBalance()
    emit('payment-saved')
  } catch (err: any) {
    consumptionError.value = err?.message || 'Error al registrar consumo'
  } finally {
    consumptionSaving.value = false
  }
}

const consumptionConvertedAmount = computed(() => {
  const amount = consumptionForm.amount
  if (!amount || amount <= 0) return ''
  if (consumptionForm.currency === 'USD') {
    return `${formatSecondary(amount, effectiveRate.value)}`
  }
  return `${formatUSD(amount / effectiveRate.value)}`
})
</script>

<template>
  <Teleport to="body">
    <div v-if="ctx.showPaymentModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">{{ ctx.editingPaymentId ? 'Editar pago' : 'Registrar pago' }}</h2>
          <p class="text-sm text-text-muted">{{ ctx.editingPaymentId ? 'Modifica los datos del pago' : 'Registra un adelanto, sueldo o comisión pagada' }}</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div v-if="!ctx.editingPaymentId">
            <label class="mb-1 block text-sm font-medium text-text">{{ businessStore.terminology.employee || 'Empleado' }}</label>
            <select v-model="ctx.paymentForm.employeeId" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
              <option value="" disabled>Seleccionar {{ (businessStore.terminology.employee || 'empleado').toLowerCase() }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name ?? emp.full_name }}</option>
            </select>
          </div>

          <div v-if="!ctx.editingPaymentId" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios desde</label>
              <input v-model="periodStart" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-text-muted">Servicios hasta</label>
              <input v-model="periodEnd" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
            </div>
          </div>

          <div v-if="loadingBalance" class="text-center text-sm text-text-muted py-3">Cargando balance...</div>

          <div v-else-if="balance" class="rounded-xl border border-border bg-bg-secondary/50 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Tipo de pago</span>
              <span class="text-sm font-semibold text-text">{{ formatPayType(balance.pay_type, balance.base_salary, balance.pay_percentage) }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Devengado</span>
                <span class="font-semibold text-text">{{ formatUSD(balance.total_earned - (balance.tips ?? 0)) }}</span>
              </div>
              <div v-if="balance.tips > 0" class="flex items-center justify-between text-sm">
                <span class="text-text-muted pl-2">Propina</span>
                <span class="font-medium text-primary">{{ formatUSD(balance.tips) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm border-t border-border-subtle pt-2">
                <span class="font-semibold text-text">Total</span>
                <span class="font-bold text-text">{{ formatUSD(balance.total_earned) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Pagado</span>
                <span class="font-medium text-success">{{ formatUSD(balance.total_paid) }}</span>
              </div>
              <div v-if="balance.total_consumed > 0" class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Consumos / Deducciones</span>
                <span class="font-medium text-warning">{{ formatUSD(balance.total_consumed) }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-border pt-2.5">
              <span class="text-sm font-semibold text-text">Pendiente por pagar</span>
              <span class="text-base font-bold" :class="pendingBalance > 0 ? 'text-primary' : 'text-success'">
                {{ formatUSD(pendingBalance) }}
              </span>
            </div>

            <button v-if="pendingBalance > 0" type="button"
              @click="ctx.paymentForm.amount = pendingBalance"
              class="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
              Pagar saldo pendiente ({{ formatUSD(pendingBalance) }})
            </button>

            <div v-if="businessStore.features.payroll_locked_exchange_rate"
              class="rounded-lg border border-dashed border-border bg-bg-secondary/40 p-3 space-y-1.5">
              <p class="text-xs font-medium text-text-secondary">Desglose en Bs (tasa del día de cada servicio)</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Comisión</span>
                <span class="font-medium text-text">{{ formatVESEs(balance.commission_bs ?? 0) }}</span>
              </div>
              <div v-if="(balance.tips_bs ?? 0) > 0 && !(balance.tips_usd ?? 0) && !(balance.tips_ves ?? 0) && !(balance.tips_unspecified ?? 0)"
                class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Propina</span>
                <span class="font-medium text-text">{{ formatVESEs(balance.tips_bs ?? 0) }}</span>
              </div>
              <div v-if="(balance.tips_usd ?? 0) > 0 || (balance.tips_ves ?? 0) > 0 || (balance.tips_unspecified ?? 0) > 0"
                class="pl-2 space-y-1 border-l-2 border-border-subtle">
                <p class="text-[11px] text-text-muted">Propinas recibidas por moneda:</p>
                <div v-if="(balance.tips_usd ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">En dólares</span>
                  <span class="font-medium text-text">{{ formatUSD(balance.tips_usd ?? 0) }}</span>
                </div>
                <div v-if="(balance.tips_ves ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">En bolívares</span>
                  <span class="font-medium text-text">{{ formatVESEs(balance.tips_ves ?? 0) }}</span>
                </div>
                <div v-if="(balance.tips_unspecified ?? 0) > 0" class="flex items-center justify-between text-[11px]">
                  <span class="text-text-muted">Sin moneda especificada</span>
                  <span class="font-medium text-text">{{ formatUSD(balance.tips_unspecified ?? 0) }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs border-t border-border-subtle pt-1.5">
                <span class="text-text-muted">Pendiente (estimado)</span>
                <span class="font-medium text-text">{{ formatVESEs(balance.pending_bs_estimated ?? 0) }}</span>
              </div>
            </div>

            <div v-if="businessStore.features.payroll_currency_breakdown_enabled"
              class="rounded-lg border border-dashed border-border bg-bg-secondary/40 p-3 space-y-1.5">
              <p class="text-xs font-medium text-text-secondary">Generó según moneda de cobro</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">En dólares</span>
                <span class="text-right">
                  <span class="font-medium text-text">{{ formatUSD(balance.commission_usd_actual ?? 0) }}</span>
                  <span class="block text-[10px] text-text-muted/70">≈ {{ formatSecondary(balance.commission_usd_actual ?? 0, effectiveRate) }}</span>
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-muted">En bolívares</span>
                <span class="text-right">
                  <span class="font-medium text-text">{{ formatVESEs(balance.commission_ves_actual_bs ?? 0) }}</span>
                  <span class="block text-[10px] text-text-muted/70">≈ {{ formatUSD((balance.commission_ves_actual_bs ?? 0) / effectiveRate) }}</span>
                </span>
              </div>
              <div v-if="(balance.commission_unspecified_actual ?? 0) > 0" class="flex items-center justify-between text-xs">
                <span class="text-text-muted">Sin moneda especificada</span>
                <span class="font-medium text-text">{{ formatUSD(balance.commission_unspecified_actual ?? 0) }}</span>
              </div>
            </div>
          </div>

          <div v-if="balance && !ctx.editingPaymentId" class="space-y-3">
            <button v-if="!showConsumptionForm" type="button"
              @click="openConsumptionForm"
              class="w-full rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs font-semibold text-warning transition-theme hover:bg-warning/10">
              + Debitar consumo / deducción
            </button>

            <div v-else class="rounded-xl border border-warning/20 bg-warning/5 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-text">Debitar consumo</span>
                <button type="button" @click="cancelConsumption"
                  class="rounded-lg p-1 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Tipo de consumo selector -->
              <div class="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
                <button
                  type="button"
                  @click="consumptionForm.mode = 'amount'"
                  class="flex-1 rounded-md py-1.5 font-semibold transition-theme text-center"
                  :class="consumptionForm.mode === 'amount' ? 'bg-warning text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text'"
                >
                  Monto directo
                </button>
                <button
                  type="button"
                  @click="consumptionForm.mode = 'product'"
                  class="flex-1 rounded-md py-1.5 font-semibold transition-theme text-center"
                  :class="consumptionForm.mode === 'product' ? 'bg-warning text-text-inverse shadow-sm' : 'text-text-secondary hover:text-text'"
                >
                  Producto de inventario
                </button>
              </div>

              <!-- Si es Producto de inventario -->
              <template v-if="consumptionForm.mode === 'product'">
                <div>
                  <label class="mb-1 block text-xs font-medium text-text-muted">Producto de inventario</label>
                  <select
                    v-model="consumptionForm.productId"
                    @change="onProductSelected"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning"
                    required
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
                  <div v-if="selectedProduct" class="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Stock disponible: <strong :class="(selectedProduct.stockTotal ?? 0) <= 0 ? 'text-danger' : 'text-text'">{{ selectedProduct.stockTotal ?? 0 }} unid.</strong></span>
                    <span>Precio catálogo: <strong>{{ formatUSD(selectedProduct.unitPrice) }}</strong></span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-muted">Cantidad a rebajar</label>
                    <input
                      v-model.number="consumptionForm.quantity"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-muted">Precio unitario ($)</label>
                    <input
                      v-model.number="consumptionForm.unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning"
                    />
                  </div>
                </div>

                <div class="rounded-lg border border-dashed border-warning/40 bg-warning/10 p-2.5 flex items-center justify-between text-xs">
                  <span class="text-text-muted font-medium">Total a debitar al empleado:</span>
                  <span class="text-sm font-bold text-warning tabular-nums">
                    {{ formatUSD(consumptionForm.quantity * consumptionForm.unitPrice) }}
                  </span>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-text-muted">Concepto en nómina</label>
                  <input
                    v-model="consumptionForm.concept"
                    type="text"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning"
                    placeholder="Ej: Producto consumido..."
                    required
                  />
                </div>
              </template>

              <!-- Si es Monto directo -->
              <template v-else>
                <div>
                  <label class="mb-1 block text-xs font-medium text-text-muted">Concepto</label>
                  <input v-model="consumptionForm.concept" type="text"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning"
                    placeholder="Ej: Producto, servicio consumido..." required />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-muted">Monto</label>
                    <input v-model.number="consumptionForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning" />
                    <p v-if="consumptionConvertedAmount" class="mt-1 text-xs text-text-muted">
                      {{ consumptionForm.currency === 'USD' ? '≈' : '=' }} {{ consumptionConvertedAmount }}
                      <span class="text-text-muted/60">({{ rateLabel }})</span>
                    </p>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-text-muted">Moneda</label>
                    <select v-model="consumptionForm.currency"
                      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning">
                      <option value="USD">USD $</option>
                      <option value="VES">Bs</option>
                    </select>
                  </div>
                </div>
              </template>

              <div>
                <label class="mb-1 block text-xs font-medium text-text-muted">Fecha</label>
                <input v-model="consumptionForm.paymentDate" type="date" required
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning" />
              </div>

              <div>
                <label class="mb-1 block text-xs font-medium text-text-muted">Notas</label>
                <input v-model="consumptionForm.notes" type="text" placeholder="Opcional"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-warning" />
              </div>

              <div v-if="consumptionError" class="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{{ consumptionError }}</div>

              <div class="flex items-center justify-end gap-2">
                <button type="button" @click="cancelConsumption"
                  class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">
                  Cancelar
                </button>
                <button type="button" @click="handleSaveConsumption" :disabled="consumptionSaving"
                  class="inline-flex items-center justify-center rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-text-inverse shadow-sm transition-theme hover:bg-warning-hover disabled:cursor-not-allowed disabled:opacity-60">
                  {{ consumptionSaving ? 'Guardando...' : 'Debitar' }}
                </button>
              </div>
            </div>
          </div>

          <template v-if="isDayRateMode">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Divisas a pagar ($)</label>
                <input v-model.number="ctx.dayRateForm.divisas" type="number" min="0" step="0.01" placeholder="0.00"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">Tasa (Bs por $)</label>
                <input v-model.number="ctx.dayRateForm.tasa" type="number" min="0.01" step="0.01" placeholder="0.00"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Bolívares a pagar (Bs)</label>
              <input v-model.number="ctx.dayRateForm.bolivares" type="number" min="0" step="0.01" placeholder="0.00"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
            </div>
            <div class="rounded-lg border border-dashed border-border bg-bg-secondary/40 p-3 space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-text-muted">Pendiente actual</span>
                <span class="font-medium text-text">{{ formatUSD(dayRatePreview.pendingUsd) }} · {{ formatVESEs(dayRatePreview.pendingBs) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-border-subtle pt-1.5 font-semibold">
                <span class="text-text">Restante</span>
                <span class="text-text">{{ formatUSD(dayRatePreview.remainingUsd) }} · {{ formatVESEs(dayRatePreview.remainingBs) }}</span>
              </div>
            </div>
          </template>
          <div v-else class="grid grid-cols-3 gap-3">
            <div class="col-span-3 sm:col-span-1">
              <label class="mb-1 block text-sm font-medium text-text">Monto</label>
              <input v-model.number="ctx.paymentForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" required
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
              <p v-if="convertedAmount" class="mt-1 text-xs text-text-muted">
                {{ ctx.paymentForm.currency === 'USD' ? '≈' : '=' }} {{ convertedAmount }}
                <span class="text-text-muted/60">({{ rateLabel }})</span>
              </p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Moneda</label>
              <select v-model="ctx.paymentForm.currency"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="USD">USD $</option>
                <option value="VES">Bs</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">Método</label>
              <select v-model="ctx.paymentForm.paymentMethod"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="zelle">Zelle</option>
                <option value="pago_movil">Pago Móvil</option>
              </select>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Fecha</label>
            <input v-model="ctx.paymentForm.paymentDate" type="date" required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Notas</label>
            <input v-model="ctx.paymentForm.notes" type="text" placeholder="Ej: Comisión servicios, adelanto..."
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary" />
          </div>

          <div v-if="ctx.saveError" class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{{ ctx.saveError }}</div>

          <div class="flex items-center justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">Cancelar</button>
            <button type="submit" :disabled="ctx.isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ ctx.isSaving ? 'Guardando...' : (ctx.editingPaymentId ? 'Actualizar pago' : 'Guardar pago') }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
