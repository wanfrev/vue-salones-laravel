<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { api as supabase } from '../../lib/api'
import { formatMethod } from '../../lib/formatters'
import SectionCard from '../common/SectionCard.vue'
import { DualAmount } from '../common'
import type { Cita, PaymentEditContext, AppointmentProduct } from '../../types/cita'

const props = defineProps<{
  show: boolean
  cita: Cita | null
  paymentData: PaymentEditContext | null
  transactionIds: string[]
}>()

const emit = defineEmits<{
  close: []
  rollback: [payload: { transactionIds: string[]; appointmentId: string }]
  delete: [transactionIds: string[]]
}>()

const { formatUSD, formatVESInline } = useCurrency()
const businessStore = useBusinessStore()
const t = computed(() => businessStore.terminology)

const mode = ref<'actions' | 'factura'>('actions')
const appointmentProducts = ref<AppointmentProduct[]>([])

const appointmentProductsTotal = computed(() =>
  appointmentProducts.value.reduce((s, p) => s + p.quantity * p.unitCost, 0),
)

watch(() => props.show, (visible) => { if (visible) mode.value = 'actions' })

watch(() => props.paymentData, (data) => {
  appointmentProducts.value = []
  if (data?.appointmentId) {
    supabase
      .from('inventory_movements')
      .select('id, product_id, products(name, unit_price), quantity, unit_cost')
      .eq('reference_type', 'appointment')
      .eq('reference_id', data.appointmentId)
      .then(({ data: items }: any) => {
        appointmentProducts.value = (items ?? []).map((m: any) => {
          const price = Number(m.products?.unit_price ?? 0)
          return {
            movementId: m.id,
            productId: m.product_id,
            productName: m.products?.name ?? m.product_id,
            quantity: Math.abs(m.quantity),
            unitCost: price > 0 ? price : Number(m.unit_cost ?? 0),
          }
        })
      })
      .catch(() => { appointmentProducts.value = [] })
  }
}, { immediate: true, deep: true })

const onRollback = () => {
  const apptId = props.cita?.id
  if (!apptId) return
  emit('rollback', { transactionIds: props.transactionIds, appointmentId: apptId })
}

const onDelete = () => {
  emit('delete', props.transactionIds)
}

const paymentMethodOptions: { value: string; label: string }[] = [
  { value: 'cash', label: 'Efectivo ($)' },
  { value: 'cash_ves', label: 'Efectivo (Bs)' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'punto_venta', label: 'Punto de Venta (Bs)' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'other', label: 'Otro' },
]

const displayMethodLabel = computed(() => {
  const pd = props.paymentData
  if (!pd) return ''
  const hasBreakdown = pd.breakdown && pd.breakdown.length > 1
  if (hasBreakdown) {
    return pd.breakdown!
      .map((b) => {
        const label = paymentMethodOptions.find(o => o.value === b.method)?.label ?? formatMethod(b.method)
        const amt = b.currency === 'VES'
          ? `${b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
          : `$${b.inputAmount.toFixed(2)}`
        return `${label} ${amt}`
      })
      .join(' + ')
  }
  return paymentMethodOptions.find(o => o.value === pd.method)?.label ?? formatMethod(pd.method)
})

const serviceName = computed(() => props.cita?.service ?? '')
const employeeName = computed(() => props.cita?.employee ?? '')
const assistantName = computed(() => props.cita?.assistantName ?? '')
const employeePercentage = computed(() => props.cita?.employeePercentageOverride ?? null)
const assistantPercentage = computed(() => props.cita?.assistantPercentage ?? 0)
</script>

<template>
  <Teleport to="body">
    <!-- SCREEN 1: Action buttons -->
    <div
      v-if="show && mode === 'actions'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5 text-center">
          <h2 class="text-lg font-bold text-text">Opciones del cobro</h2>
          <p class="mt-1 text-sm text-text-muted line-clamp-1">
            {{ cita?.clientName }} · {{ cita?.service }}
          </p>
        </div>

        <div class="space-y-2.5">
          <button
            type="button"
            @click="mode = 'factura'"
            class="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-theme hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text">Ver Factura</p>
              <p class="text-xs text-text-muted">Consultar los detalles del cobro</p>
            </div>
          </button>

          <button
            type="button"
            @click="onRollback"
            class="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-theme hover:border-warning/40 hover:bg-warning/[0.03]"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text">Volver a Punto de Venta</p>
              <p class="text-xs text-text-muted">Eliminar cobro y recargar en POS</p>
            </div>
          </button>

          <button
            type="button"
            @click="onDelete"
            class="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-theme hover:border-danger/40 hover:bg-danger/[0.03]"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text">Eliminar cobro</p>
              <p class="text-xs text-text-muted">Regresar la cita a pendiente</p>
            </div>
          </button>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </div>

    <!-- SCREEN 2: Factura (read-only invoice) -->
    <div
      v-if="show && mode === 'factura'"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4 rounded-t-2xl">
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="mode = 'actions'"
              class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
              title="Volver a opciones"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 class="text-lg font-bold text-text">Factura</h2>
              <p class="text-xs text-text-muted">{{ cita?.date }} · {{ cita?.time }}</p>
            </div>
          </div>
          <button
            type="button"
            @click="emit('close')"
            class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-text"
            title="Cerrar"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-5">
          <!-- Client -->
          <SectionCard title="Cliente" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" noPadding>
            <div class="p-3 space-y-1">
              <p class="font-medium text-text">{{ cita?.clientName || '—' }}</p>
              <p v-if="cita?.clientPhone" class="text-sm text-text-secondary">{{ cita?.clientPhone }}</p>
            </div>
          </SectionCard>

          <!-- Services -->
          <SectionCard title="Servicios" icon="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" noPadding>
            <div class="p-3 space-y-3">
              <div class="space-y-1">
                <p class="font-medium text-text">{{ serviceName }}</p>
                <p class="text-sm text-text-secondary">
                  {{ t.employee }}: {{ employeeName }}
                  <span v-if="employeePercentage != null" class="text-primary font-medium">({{ employeePercentage }}%)</span>
                </p>
                <p v-if="assistantName" class="text-sm text-text-secondary">
                  Asistente: {{ assistantName }}
                  <span v-if="assistantPercentage > 0">({{ assistantPercentage }}%)</span>
                </p>
              </div>
              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <span>{{ formatUSD(cita?.price ?? 0) }}</span>
                <span v-if="cita?.duration" class="text-text-muted">· {{ cita?.duration }} min</span>
              </div>
            </div>
          </SectionCard>

          <!-- Products -->
          <SectionCard v-if="appointmentProducts.length > 0" title="Productos vendidos" icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" noPadding>
            <div class="divide-y divide-border-subtle">
              <div v-for="p in appointmentProducts" :key="p.movementId" class="flex items-center justify-between px-3 py-2 text-sm">
                <span class="text-text">{{ p.productName }}</span>
                <span class="text-text-muted">{{ p.quantity }} &times; {{ formatUSD(p.unitCost) }}</span>
              </div>
              <div class="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                <span class="text-text-muted">Total productos</span>
                <span class="text-text">{{ formatUSD(appointmentProductsTotal) }}</span>
              </div>
            </div>
          </SectionCard>

          <!-- Payment -->
          <SectionCard title="Cobro" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" noPadding>
            <div class="p-3 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Método</span>
                <span class="font-medium text-text">{{ displayMethodLabel }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Moneda</span>
                <span class="text-text">{{ paymentData?.currency ?? 'USD' }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Monto</span>
                <div class="text-right">
                  <span class="font-semibold text-success">{{ formatUSD(paymentData?.amount ?? 0) }}</span>
                  <span class="text-xs text-text-muted ml-1">{{ formatVESInline(paymentData?.amount ?? 0, paymentData?.exchangeRate ?? 1) }} Bs</span>
                </div>
              </div>
              <div v-if="(paymentData?.tipAmount ?? 0) > 0" class="flex items-center justify-between text-sm">
                <span class="text-text-muted">Propina</span>
                <span class="font-semibold text-primary">${{ (paymentData?.tipAmount ?? 0).toFixed(2) }}</span>
              </div>
              <div v-if="paymentData?.notes" class="flex items-start justify-between text-sm gap-3">
                <span class="text-text-muted shrink-0">Notas</span>
                <span class="text-text text-right">{{ paymentData?.notes }}</span>
              </div>
            </div>
          </SectionCard>

          <!-- Total -->
          <div class="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
            <span class="text-sm font-semibold text-text">Total</span>
            <DualAmount :amount="paymentData?.amount ?? 0" orientation="inline" size="sm" primary-class="text-primary font-semibold" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
