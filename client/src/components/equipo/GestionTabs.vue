<template>
  <section class="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:mb-6">
    <!-- Título y pestañas -->
    <div class="border-b border-border-subtle px-4 pt-4 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-base font-bold text-text">
            <UsersGroupRoundedIcon :size="18" class="text-text-muted" />
            Gestión de Pagos y Horarios
          </h2>
          <p class="mt-0.5 text-xs text-text-muted">Comisiones, nómina, deuda y horarios del equipo</p>
        </div>
      </div>

      <!-- overflow-y-hidden: con solo overflow-x el navegador vuelve auto el eje vertical y aparecía un scroll de 1px.
           La barra de desplazamiento se oculta (en móvil las pestañas se deslizan). -->
      <div class="mt-3 flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Secciones de gestión">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          class="relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-semibold transition-colors"
          :class="activeTab === tab.key ? 'text-primary' : 'text-text-muted hover:text-text'"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="15" />
          <span class="hidden sm:inline">{{ tab.label }}</span><span class="sm:hidden">{{ tab.shortLabel }}</span>
          <span class="rounded-full bg-bg-secondary px-1.5 text-[10px] font-bold tabular-nums text-text-muted">{{ tab.count }}</span>
          <span v-if="activeTab === tab.key" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
        </button>
      </div>
    </div>

    <!-- Periodo + resumen (y, en Nómina, sus acciones): una sola franja en lugar de banners -->
    <div class="border-b border-border-subtle bg-bg-secondary/30 px-4 py-2.5 sm:px-5">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2" :class="activeTab === 'nomina' ? '' : 'justify-between'">
        <PeriodNavigator
          v-if="activeTab === 'pagos'"
          :modes="MONTH_ONLY" mode="month" :label="selectedMonth" :month-value="selectedMonth"
          :is-current="false" today-label="Ahora"
          @update:month="onMonthPicked" @today="emit('resetCurrentMonth')"
        />
        <PeriodNavigator
          v-else-if="activeTab === 'nomina'"
          :modes="NOMINA_MODES" :mode="nominaMode" :label="nominaLabel" :month-value="selectedMonth" :is-current="nominaMode === 'month' || nominaIsCurrent"
          @update:mode="onNominaMode" @update:month="onMonthPicked" @prev="nominaStep(-1)" @next="nominaStep(1)" @today="onNominaToday"
        />
        <PeriodNavigator
          v-else-if="activeTab === 'deuda'"
          :modes="DEBT_MODES" :mode="debtMode" :label="debtLabel" :month-value="monthKey(debtDate)" :is-current="debtMode === 'month' ? false : debtIsCurrent"
          @update:mode="onDebtMode" @update:month="onDebtMonth" @prev="debtStep(-1)" @next="debtStep(1)" @today="debtDate = new Date()"
        />

        <!-- Acciones de Nómina: viven dentro de la pestaña, no arriba de todas -->
        <div v-if="activeTab === 'nomina'" class="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
            @click="emit('openPayment')"
          >
            <AddCircleIcon :size="14" /> Registrar pago
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/20"
            @click="emit('openConsumption')"
          >
            <MinusCircleIcon :size="14" /> Debitar consumo
          </button>
        </div>

        <p class="text-xs text-text-muted" :class="activeTab === 'nomina' ? 'basis-full' : ''" data-testid="summary">
          <template v-for="(part, i) in summary" :key="i"><span :class="part.strong ? `font-bold tabular-nums ${part.tone ?? 'text-text'}` : undefined">{{ part.text }}</span></template>
        </p>
      </div>

      <PeriodRangeEditor
        v-if="activeTab === 'deuda' && debtMode === 'custom'"
        class="mt-3"
        :start="debtCustomStart" :end="debtCustomEnd" from-label="Servicios desde" to-label="Servicios hasta"
        @update:start="debtCustomStart = $event" @update:end="debtCustomEnd = $event" @preset="onPreset"
      />

      <!-- Deuda: siempre dice qué periodo se está evaluando (con rango, solo cuando ya hay las dos fechas) -->
      <p v-if="activeTab === 'deuda' && (debtMode !== 'custom' || (debtCustomStart && debtCustomEnd))" class="mt-2 text-xs text-text-muted" data-testid="debt-period">
        {{ debtMode === 'custom' ? 'Mostrando deuda del' : 'Período evaluado:' }} <span class="font-semibold text-text">{{ debtLabel }}</span>
      </p>
    </div>

    <Transition name="page-fade" mode="out-in">
      <ServiciosPanel v-if="activeTab === 'pagos'" key="pagos" :items="servicios" />
      <NominaPanel
        v-else-if="activeTab === 'nomina'" key="nomina" :items="filteredNomina"
        @edit="emit('openEditPayment', $event)" @delete="emit('deletePayment', $event)"
      />
      <DeudaPanel v-else-if="activeTab === 'deuda'" key="deuda" :items="deudaConSaldo" @open-recibo="emit('openRecibo', $event)" />
      <HorariosPanel v-else key="horarios" :items="teamSchedule" />
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AddCircleIcon, ClipboardIcon, ClockCircleIcon, DollarIcon, CardIcon, MinusCircleIcon, UsersGroupRoundedIcon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { toYmd } from '../../lib/periodUtils'
import PeriodNavigator from './PeriodNavigator.vue'
import PeriodRangeEditor from './PeriodRangeEditor.vue'
import ServiciosPanel, { type ServicePaymentRow } from './ServiciosPanel.vue'
import NominaPanel, { type PayrollPaymentRow } from './NominaPanel.vue'
import DeudaPanel, { type DebtRow } from './DeudaPanel.vue'
import HorariosPanel, { type ScheduleRow } from './HorariosPanel.vue'
import {
  inRange, isCurrentPeriod, monthKey, parseMonthInput, periodLabel, periodRange, periodYmd, presetRange, shiftAnchor,
  type PeriodMode, type RangePreset,
} from './payrollPeriods'

const props = defineProps<{
  /** useFinancialSummary: `employeePayments` = comisión por servicio del mes elegido. */
  summaryCtx: any
  /** useEmployeePayments: `allPayments` = pagos de nómina y consumos. */
  paymentsCtx: any
  teamSchedule: ScheduleRow[]
  totalComisiones: number
  /** Nómina del mes elegido (lo calcula Equipo.vue, igual que siempre): pagos y consumos por separado. */
  totalNominaPagada: number
  totalConsumido: number
  totalDeudaPendiente: number
  deudaConSaldo: DebtRow[]
  /** Mes elegido, 'YYYY-MM' (compartido entre Servicios y Nómina). */
  selectedMonth: string
  selectedPeriod: string
}>()

const emit = defineEmits<{
  'update:selectedPeriod': [v: string]
  'update:selectedMonth': [v: string]
  'update:debtDates': [dates: { start: string; end: string }]
  resetCurrentMonth: []
  openPayment: []
  openConsumption: []
  openEditPayment: [payment: PayrollPaymentRow]
  deletePayment: [id: string]
  openRecibo: [row: DebtRow]
}>()

const { formatUSD } = useCurrency()

// ── Datos de cada pestaña ───────────────────────────────────────────────────────────────────────
const servicios = computed<ServicePaymentRow[]>(() => props.summaryCtx.employeePayments.value ?? [])

// ── Nómina: día / semana / mes ──────────────────────────────────────────────────────────────────
const MONTH_ONLY = [{ key: 'month' as PeriodMode, label: 'Mes' }]
const NOMINA_MODES: { key: PeriodMode; label: string }[] = [
  { key: 'day', label: 'Día' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' },
]
const nominaMode = ref<PeriodMode>('month')
const nominaDate = ref(new Date())
// En modo mes el periodo es el mes compartido con la pestaña Servicios.
const nominaAnchor = computed(() => (nominaMode.value === 'month' ? parseMonthInput(props.selectedMonth) ?? new Date() : nominaDate.value))
const nominaLabel = computed(() => periodLabel(nominaMode.value, nominaAnchor.value))
const nominaIsCurrent = computed(() =>
  nominaMode.value === 'month' ? monthKey(nominaAnchor.value) === monthKey(new Date()) : isCurrentPeriod(nominaMode.value, nominaAnchor.value))

function onNominaMode(mode: PeriodMode) {
  nominaMode.value = mode
  if (mode !== 'month') nominaDate.value = new Date()
}
function nominaStep(direction: -1 | 1) {
  if (direction === 1 && nominaIsCurrent.value) return
  nominaDate.value = shiftAnchor(nominaMode.value, nominaDate.value, direction)
}
function onNominaToday() {
  if (nominaMode.value === 'month') emit('resetCurrentMonth')
  else nominaDate.value = new Date()
}
function onMonthPicked(value: string) {
  emit('update:selectedMonth', value)
  emit('update:selectedPeriod', 'month')
}

const filteredNomina = computed<PayrollPaymentRow[]>(() => {
  const range = periodRange(nominaMode.value, nominaAnchor.value)
  return ((props.paymentsCtx.allPayments.value ?? []) as PayrollPaymentRow[]).filter(p => inRange(p.paymentDate, range))
})

// ── Deuda: todo / día / semana / mes / rango ────────────────────────────────────────────────────
const DEBT_MODES: { key: PeriodMode; label: string }[] = [
  { key: 'all', label: 'Todo' }, { key: 'day', label: 'Día' }, { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' }, { key: 'custom', label: 'Rango' },
]
const debtMode = ref<PeriodMode>('month')
const debtDate = ref(new Date())
// Rango personalizado: arranca desde 7 días antes de hoy, como siempre.
const today = new Date()
const debtCustomStart = ref(toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)))
const debtCustomEnd = ref(toYmd(today))
const customRange = computed(() => ({ start: debtCustomStart.value, end: debtCustomEnd.value }))

const debtLabel = computed(() => periodLabel(debtMode.value, debtDate.value, customRange.value))
const debtIsCurrent = computed(() =>
  debtMode.value === 'month' ? monthKey(debtDate.value) === monthKey(new Date()) : isCurrentPeriod(debtMode.value, debtDate.value))

function onDebtMode(mode: PeriodMode) {
  debtMode.value = mode
  if (mode === 'day' || mode === 'week' || mode === 'month') debtDate.value = new Date()
  else if (mode === 'custom' && (!debtCustomStart.value || !debtCustomEnd.value)) onPreset('currentBiweekly')
}
function debtStep(direction: -1 | 1) {
  if (direction === 1 && debtIsCurrent.value) return
  debtDate.value = shiftAnchor(debtMode.value, debtDate.value, direction)
}
function onDebtMonth(value: string) {
  const d = parseMonthInput(value)
  if (d) debtDate.value = d
}
function onPreset(preset: RangePreset) {
  const r = presetRange(preset)
  debtCustomStart.value = r.start
  debtCustomEnd.value = r.end
}

// El servidor calcula la deuda sobre estas fechas.
watch(
  () => periodYmd(debtMode.value, debtDate.value, new Date(), customRange.value),
  (dates) => emit('update:debtDates', dates),
  { immediate: true },
)

// ── Pestañas y resumen ──────────────────────────────────────────────────────────────────────────
type TabKey = 'pagos' | 'nomina' | 'deuda' | 'horarios'
const activeTab = ref<TabKey>('pagos')

const tabs = computed(() => [
  { key: 'pagos' as const, label: 'Servicios Realizados', shortLabel: 'Servicios', icon: DollarIcon, count: servicios.value.length },
  { key: 'nomina' as const, label: 'Pago de Nómina', shortLabel: 'Nómina', icon: CardIcon, count: filteredNomina.value.length },
  { key: 'deuda' as const, label: 'Deuda por Empleado', shortLabel: 'Deuda', icon: ClipboardIcon, count: props.deudaConSaldo.length },
  { key: 'horarios' as const, label: 'Horarios del Equipo', shortLabel: 'Horarios', icon: ClockCircleIcon, count: props.teamSchedule.length },
])

interface SummaryPart { text: string; strong?: boolean; tone?: string }
const plain = (text: string): SummaryPart => ({ text })
const bold = (text: string, tone?: string): SummaryPart => ({ text, strong: true, tone })
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** La línea de resumen de cada pestaña: lo que antes ocupaba un banner entero. */
const summary = computed<SummaryPart[]>(() => {
  switch (activeTab.value) {
    case 'pagos':
      return [plain('Comisiones '), bold(formatUSD(props.totalComisiones), 'text-success'), plain(` · ${count(servicios.value.length, 'servicio', 'servicios')}`)]
    case 'nomina':
      // El total es el del banner de siempre (nómina del mes); los registros, los del periodo que se ve en la lista.
      return [
        plain('Total pagado + consumido '), bold(formatUSD(props.totalNominaPagada + props.totalConsumido), 'text-danger'),
        plain(` · ${count(filteredNomina.value.length, 'registro', 'registros')}`),
      ]
    case 'deuda':
      return [plain('Pendiente '), bold(formatUSD(props.totalDeudaPendiente), 'text-primary'), plain(` · ${props.deudaConSaldo.length} con saldo`)]
    default:
      return [bold(String(props.teamSchedule.length), 'text-primary'), plain(' empleado(s) con horario registrado')]
  }
})
</script>
