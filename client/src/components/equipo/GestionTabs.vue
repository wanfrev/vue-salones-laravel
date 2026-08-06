<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DollarIcon, CardIcon, ClipboardIcon, ClockCircleIcon, ArrowLeftIcon, ArrowRightIcon, AddCircleIcon, MinusCircleIcon, UsersGroupRoundedIcon, PenIcon, TrashBin2Icon, PrinterIcon } from '@solar-icons/vue/linear'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatDate, parseLocalDate } from '../../lib/formatters'
import KpiBanner from '../finanzas/KpiBanner.vue'
import RecordSection from '../finanzas/RecordSection.vue'
import SegmentedTabs from '../common/SegmentedTabs.vue'

const { formatEmployeeVESInline } = useCurrency()

const fmtDate = (d: string) => formatDate(d)

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function dayStart(d: Date): Date { const c = new Date(d); c.setHours(0,0,0,0); return c }
function dayEnd(d: Date): Date { const c = new Date(d); c.setHours(23,59,59,999); return c }
function weekStart(d: Date): Date { const c = dayStart(d); const day = (c.getDay() + 6) % 7; c.setDate(c.getDate() - day); return c }
function monthStart(y: number, m: number): Date { return new Date(y, m, 1) }
function monthEnd(y: number, m: number): Date { return new Date(y, m + 1, 0, 23, 59, 59, 999) }

// â”€â”€ NÃ³mina period state â”€â”€
type Periodo = 'day' | 'week' | 'month'
const nominaPeriod = ref<Periodo>('month')
const nominaDate = ref(new Date())

const nominaPeriodTabs = [
  { key: 'day', label: 'DÃ­a' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
]

function onNominaPeriodChange(v: string) {
  nominaPeriod.value = v as Periodo
  if (v !== 'month') nominaDate.value = new Date()
}

function parseSelectedMonth(fallback: Date): { y: number; m: number } {
  const parts = (props.selectedMonth || '').split('-')
  if (parts.length === 2) {
    const y = Number(parts[0])
    const m = Number(parts[1]) - 1 // HTML month input is 1-indexed, JS months are 0-indexed
    return { y, m }
  }
  return { y: fallback.getFullYear(), m: fallback.getMonth() }
}

const nominaPeriodLabel = computed(() => {
  const d = nominaDate.value
  if (nominaPeriod.value === 'day') return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`
  if (nominaPeriod.value === 'week') {
    const ws = weekStart(d)
    const we = new Date(ws); we.setDate(we.getDate() + 6)
    if (ws.getMonth() === we.getMonth()) return `${ws.getDate()}-${we.getDate()} ${MONTHS_ES[ws.getMonth()]} ${ws.getFullYear()}`
    return `${ws.getDate()} ${MONTHS_ES[ws.getMonth()]} - ${we.getDate()} ${MONTHS_ES[we.getMonth()]} ${we.getFullYear()}`
  }
  const { y, m } = parseSelectedMonth(d)
  return `${MONTHS_ES[m]} ${y}`
})

const isCurrentNominaPeriod = computed(() => {
  const now = new Date()
  if (nominaPeriod.value === 'day') return dayStart(nominaDate.value).getTime() >= dayStart(now).getTime()
  if (nominaPeriod.value === 'week') return weekStart(nominaDate.value).getTime() >= weekStart(now).getTime()
  return true
})

function nominaPrev() {
  const d = new Date(nominaDate.value)
  if (nominaPeriod.value === 'day') d.setDate(d.getDate() - 1)
  else d.setDate(d.getDate() - 7)
  nominaDate.value = d
}
function nominaNext() {
  if (isCurrentNominaPeriod.value) return
  const d = new Date(nominaDate.value)
  if (nominaPeriod.value === 'day') d.setDate(d.getDate() + 1)
  else d.setDate(d.getDate() + 7)
  nominaDate.value = d
}
function nominaGoToday() { nominaDate.value = new Date() }

const nominaStart = computed<Date>(() => {
  const d = nominaDate.value
  if (nominaPeriod.value === 'day') return dayStart(d)
  if (nominaPeriod.value === 'week') return weekStart(d)
  const { y, m } = parseSelectedMonth(d)
  return monthStart(y, m)
})
const nominaEnd = computed<Date>(() => {
  const d = nominaDate.value
  if (nominaPeriod.value === 'day') return dayEnd(d)
  if (nominaPeriod.value === 'week') { const e = new Date(weekStart(d)); e.setDate(e.getDate() + 6); return dayEnd(e) }
  const { y, m } = parseSelectedMonth(d)
  const now = new Date()
  const isCurrent = y === now.getFullYear() && m === now.getMonth()
  return isCurrent ? dayEnd(now) : monthEnd(y, m)
})

const filteredNomina = computed(() => {
  const all = props.paymentsCtx.allPayments.value ?? []
  return all.filter((p: any) => {
    const d = parseLocalDate(p.paymentDate)
    return d >= nominaStart.value && d <= nominaEnd.value
  })
})

const props = defineProps<{
  summaryCtx: any
  paymentsCtx: any
  businessStore: any
  teamSchedule: any[]
  totalComisiones: number
  totalNominaPagada: number
  totalConsumido: number
  totalDeudaPendiente: number
  deudaConSaldo: any[]
  formatUSD: (n: number) => string
  formatVESInline: (n: number, r?: number) => string
  formatVESEs: (n: number) => string
  formatMethod: (m: string) => string
  formatTime24to12: (t: string) => string
  selectedMonth: string
  selectedPeriod: string
}>()

const emit = defineEmits<{
  'update:selectedPeriod': [v: string]
  'update:selectedMonth': [v: string]
  resetCurrentMonth: []
  openPayment: []
  openConsumption: []
  openEditPayment: [payment: any]
  deletePayment: [id: string]
  openRecibo: [employee: any]
}>()

const tabs = [
  { key: 'pagos' as const, label: 'Servicios Realizados', shortLabel: 'Servicios' },
  { key: 'nomina' as const, label: 'Pago de NÃ³mina', shortLabel: 'NÃ³mina' },
  { key: 'deuda' as const, label: 'Deuda por Empleado', shortLabel: 'Deuda' },
  { key: 'horarios' as const, label: 'Horarios del Equipo', shortLabel: 'Horarios' },
]
const activeTab = ref<'pagos' | 'nomina' | 'deuda' | 'horarios'>('pagos')

// Pagination
const pageSize = 10
const tabPage = ref(1)
watch(activeTab, () => { tabPage.value = 1 })
const paginate = <T>(data: T[]): T[] => data.slice((tabPage.value - 1) * pageSize, tabPage.value * pageSize)
const pageProps = <T>(data: T[]) => {
  const t = data.length; const tp = Math.ceil(t / pageSize)
  return { total: t, start: t ? (tabPage.value - 1) * pageSize + 1 : 0, end: Math.min(tabPage.value * pageSize, t), hasPrev: tabPage.value > 1, hasNext: tabPage.value < tp }
}

const paginatedServicios = computed(() => paginate(props.summaryCtx.employeePayments.value))
const paginatedNomina = computed(() => paginate(filteredNomina.value))
const paginatedDeuda = computed(() => paginate(props.deudaConSaldo))
const paginatedHorarios = computed(() => paginate(props.teamSchedule))
const serviciosP = computed(() => pageProps(props.summaryCtx.employeePayments.value))
const nominaP = computed(() => pageProps(filteredNomina.value))
const deudaP = computed(() => pageProps(props.deudaConSaldo))
const horariosP = computed(() => pageProps(props.teamSchedule))
</script>

<template>
  <div class="mb-5 lg:mb-6 rounded-xl border border-border bg-surface shadow-sm">
    <!-- Header -->
    <div class="flex flex-col gap-3 border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div>
        <h3 class="text-sm sm:text-base font-semibold text-text flex items-center gap-2">
          <UsersGroupRoundedIcon :size="18" class="text-text-muted" />
          GestiÃ³n de Pagos y Horarios
        </h3>
        <p class="text-xs text-text-muted mt-0.5">Comisiones, nÃ³mina, deuda y horarios del equipo</p>
      </div>

      <!-- Month Selector -->
      <div
        class="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-sm self-start sm:self-auto"
        v-show="activeTab !== 'horarios' && activeTab !== 'nomina'">
        <label for="equipo-month-picker" class="text-xs font-medium text-text-muted hidden sm:inline">Mes</label>
        <input id="equipo-month-picker" :value="selectedMonth" type="month"
          class="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text outline-none transition-theme focus:border-primary w-full sm:w-auto"
          @change="$emit('update:selectedMonth', ($event.target as HTMLInputElement).value); $emit('update:selectedPeriod', 'month')" />
        <button type="button"
          class="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text whitespace-nowrap"
          @click="$emit('resetCurrentMonth')">Ahora</button>
      </div>

      <!-- Segmented Control -->
      <div
        class="bg-bg-secondary p-1 rounded-xl border border-border-subtle flex items-center gap-0.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          :class="['px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0', activeTab === tab.key ? 'bg-surface text-text shadow-sm shadow-black/5 border border-border font-semibold' : 'text-text-secondary hover:text-text hover:bg-surface/40']">
          <DollarIcon v-if="tab.key === 'pagos'" :size="14" :class="activeTab === 'pagos' ? 'text-success' : ''" />
          <CardIcon v-else-if="tab.key === 'nomina'" :size="14" :class="activeTab === 'nomina' ? 'text-danger' : ''" />
          <ClipboardIcon v-else-if="tab.key === 'deuda'" :size="14" :class="activeTab === 'deuda' ? 'text-warning' : ''" />
          <ClockCircleIcon v-else :size="14" :class="activeTab === 'horarios' ? 'text-primary' : ''" />
          <span class="hidden sm:inline">{{ tab.label }}</span><span class="sm:hidden">{{ tab.shortLabel }}</span>
        </button>
      </div>

      <!-- NÃ³mina period selector -->
      <div v-if="activeTab === 'nomina'" class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <SegmentedTabs :tabs="nominaPeriodTabs" :model-value="nominaPeriod" @update:model-value="onNominaPeriodChange" />
        <div class="flex items-center gap-1.5">
          <template v-if="nominaPeriod === 'month'">
            <input id="equipo-month-picker" :value="selectedMonth" type="month"
              class="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text outline-none transition-theme focus:border-primary"
              @change="$emit('update:selectedMonth', ($event.target as HTMLInputElement).value); $emit('update:selectedPeriod', 'month')" />
          </template>
          <template v-else>
            <button @click="nominaPrev" class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text transition-colors">
              <ArrowLeftIcon :size="16" />
            </button>
            <span class="text-xs font-semibold text-text min-w-[130px] text-center">{{ nominaPeriodLabel }}</span>
            <button @click="nominaNext" :disabled="isCurrentNominaPeriod" class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ArrowRightIcon :size="16" />
            </button>
            <button v-if="!isCurrentNominaPeriod" @click="nominaGoToday" class="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">Hoy</button>
          </template>
        </div>
      </div>
    </div>

    <!-- KPI Banners -->
    <KpiBanner v-if="activeTab === 'pagos'" variant="success"
      :icon="DollarIcon"
      label="Total Comisiones" :value="formatUSD(totalComisiones)"
      :sublabel="`${summaryCtx.employeePayments.value.length} servicio(s)`"     />
    <KpiBanner v-if="activeTab === 'nomina'" variant="danger"
      :icon="CreditCardIcon"
      label="Total Pagado + Consumido" :value="formatUSD(totalNominaPagada + totalConsumido)"
      :sublabel="`${filteredNomina.length} registro(s)`">
      <template #actions>
        <button @click="$emit('openPayment')"
          class="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shrink-0"><AddCircleIcon :size="14" /><span class="hidden sm:inline">Registrar pago</span><span class="sm:hidden">+ Pago</span></button>
        <button @click="$emit('openConsumption')"
          class="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/20 shrink-0 border border-danger/20"><MinusCircleIcon :size="14" /><span class="hidden sm:inline">Debitar consumo</span><span class="sm:hidden">Debitar</span></button>
      </template>
    </KpiBanner>
    <KpiBanner v-if="activeTab === 'deuda'" variant="warning"
      :icon="ClipboardIcon"
      label="Deuda Pendiente Total" :value="formatUSD(totalDeudaPendiente)"
      :sublabel="`${deudaConSaldo.length} empleado(s) con saldo`" />
    <KpiBanner v-if="activeTab === 'horarios'" variant="primary" :icon="ClockIcon"
      label="Horarios del Equipo" :value="teamSchedule.length" :sublabel="`empleado(s) con horario registrado`" />

    <!-- Tab Content -->
    <div class="p-3 sm:p-5">
      <!-- Pagos -->
      <div v-if="activeTab === 'pagos'">
        <RecordSection title="" :items="paginatedServicios" :total-count="summaryCtx.employeePayments.value.length"
          empty-message="No hay comisiones registradas" :pages="serviciosP" :page-size="pageSize" @prev="tabPage--"
          @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Cliente</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.service || 'Servicio' }}</th>
            <th
              class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Costo</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">%
              {{ businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              ComisiÃ³n</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Propina</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="payment in items" :key="payment.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ payment.employee }}</td>
              <td class="px-3 py-3 text-text-secondary">{{ payment.client || 'â€”' }}</td>
              <td class="px-3 py-3 text-text-secondary">{{ payment.service }}</td>
              <td class="px-3 py-3 text-right hidden sm:table-cell">
                <div class="text-text">{{ formatUSD(payment.amount) }}</div>
                <div class="text-[10px] text-text-muted">{{ formatVESInline(payment.amount) }} Bs</div>
              </td>
              <td class="px-3 py-3 text-right text-text-secondary">{{ payment.percentage }}%</td>
              <td class="px-3 py-3 text-right">
                <div class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</div>
                <div class="text-[10px] text-text-muted">{{ formatVESInline(payment.earnings) }} Bs</div>
              </td>
              <td class="px-3 py-3 text-right">
                <span v-if="(payment.tipAmount ?? 0) > 0" class="font-semibold text-primary">{{ formatUSD(payment.tipAmount) }}</span>
                <span v-else class="text-text-muted">â€”</span>
              </td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="payment in items" :key="payment.id"
              class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ payment.employee
                  }}</span><span class="text-xs font-semibold text-text-secondary">{{ payment.percentage }}%
                  Empleado</span></div>
              <div v-if="payment.client" class="text-xs text-text-secondary">{{ payment.client }}</div>
              <div class="text-xs text-text-secondary">{{ payment.service }}</div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span class="text-text-muted">Costo</span><span class="text-right"><span class="text-text">{{
                  formatUSD(payment.amount) }}</span><span class="text-text-muted ml-1">{{
                      formatVESInline(payment.amount) }} Bs</span></span>
                <span class="text-text-muted">ComisiÃ³n</span><span class="text-right"><span
                    class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</span><span
                    class="text-text-muted ml-1">{{ formatVESInline(payment.earnings) }} Bs</span></span>
                <span class="text-text-muted">Propina</span><span class="text-right">
                  <span v-if="(payment.tipAmount ?? 0) > 0" class="font-semibold text-primary">{{ formatUSD(payment.tipAmount) }}</span>
                  <span v-else class="text-text-muted">â€”</span>
                </span>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- NÃ³mina -->
      <div v-if="activeTab === 'nomina'">
        <RecordSection title="" :items="paginatedNomina" :total-count="filteredNomina.length"
          empty-message="No hay pagos de nÃ³mina registrados" :pages="nominaP" :page-size="pageSize" @prev="tabPage--"
          @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Fecha</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.employee || 'Empleado' }}</th>
            <th
              class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              MÃ©todo</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Monto</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              AcciÃ³n</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="ep in items" :key="ep.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 whitespace-nowrap text-text-secondary">{{ fmtDate(ep.paymentDate) }}</td>
              <td class="px-3 py-3 font-medium text-text">{{ ep.employeeName }}</td>
              <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">
                <span v-if="ep.type === 'consumption'"
                  class="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">{{
                    ep.concept || 'Consumo' }}</span>
                <span v-else>{{ formatMethod(ep.paymentMethod) }}</span>
              </td>
              <td class="px-3 py-3 text-right">
                <div :class="['font-medium', ep.type === 'consumption' ? 'text-danger' : 'text-danger']">{{ ep.currency
                  === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</div>
                <div class="text-[10px] text-text-muted">{{ ep.currency === 'VES' ? formatUSD(ep.amount) :
                  formatEmployeeVESInline(ep.amount, ep.employeeVesRate) + ' Bs' }}</div>
              </td>
              <td class="px-3 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="$emit('openEditPayment', ep)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
                    title="Editar pago"><PenIcon :size="14" /></button>
                  <button @click="$emit('deletePayment', ep.id)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                    title="Eliminar pago"><TrashBin2Icon :size="14" /></button>
                </div>
              </td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="ep in items" :key="ep.id"
              class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ ep.employeeName
                  }}</span><span class="text-xs text-text-muted">{{ fmtDate(ep.paymentDate) }}</span></div>
              <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{ ep.type ===
                'consumption' ? (ep.concept || 'Consumo') : formatMethod(ep.paymentMethod) }}</span><span
                  class="text-right"><span class="font-semibold text-danger">{{ ep.currency === 'VES' ? formatVESEs(ep.originalAmount) : formatUSD(ep.amount) }}</span><span class="text-text-muted ml-1">{{ ep.currency === 'VES' ? formatUSD(ep.amount) : formatEmployeeVESInline(ep.amount, ep.employeeVesRate) + ' Bs' }}</span></span></div>
              <div class="flex items-center justify-end gap-1 pt-1 border-t border-border-subtle"><button
                  @click="$emit('openEditPayment', ep)"
                  class="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">Editar</button><button
                  @click="$emit('deletePayment', ep.id)"
                  class="rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Eliminar</button></div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Deuda -->
      <div v-if="activeTab === 'deuda'">
        <RecordSection title="" :items="paginatedDeuda" :total-count="deudaConSaldo.length"
          empty-message="No hay deuda pendiente" :pages="deudaP" :page-size="pageSize" @prev="tabPage--"
          @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.employee || 'Empleado' }}</th>
            <th
              class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Tipo</th>
            <th
              class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              ComisiÃ³n</th>
            <th
              class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Sueldo base</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Total</th>
            <th
              class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Pagado</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Pendiente</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary w-[90px]">
              Recibo</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="row in items" :key="row.employeeId" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ row.employeeName }}</td>
              <td class="px-3 py-3 text-text-secondary text-xs hidden sm:table-cell"><span
                  v-if="row.payType === 'salary'">Sueldo base</span><span v-else-if="row.payType === 'mixed'">Sueldo +
                  {{ row.payPercentage }}%</span><span v-else-if="row.payType === 'percentage'">{{ row.payPercentage
                  }}%</span><span v-else>â€”</span></td>
              <td class="px-3 py-3 text-right text-text hidden sm:table-cell">{{ formatUSD(row.commissionTotal) }}</td>
              <td class="px-3 py-3 text-right text-text hidden sm:table-cell">{{ formatUSD(row.baseSalary) }}</td>
              <td class="px-3 py-3 text-right font-semibold text-text">{{ formatUSD(row.totalEarned) }}</td>
              <td class="px-3 py-3 text-right hidden sm:table-cell">
                <div class="font-medium text-danger">{{ formatUSD(row.totalPaid) }}</div>
                <div class="text-[10px] text-text-muted">{{ formatEmployeeVESInline(row.totalPaid) }} Bs</div>
              </td>
              <td class="px-3 py-3 text-right"><span class="font-bold"
                  :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(row.pendingBalance)
                  }}</span></td>
              <td class="px-3 py-3 text-right">
                <button @click="$emit('openRecibo', row)" class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors" title="Imprimir Recibo de Pago">
                  <PrinterIcon :size="14" />
                  Recibo
                </button>
              </td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="row in items" :key="row.employeeId"
              class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ row.employeeName
                  }}</span><span class="text-xs text-text-muted" v-if="row.payType === 'salary'">Sueldo base</span><span
                  class="text-xs text-text-muted" v-else-if="row.payType === 'mixed'">Sueldo + {{ row.payPercentage
                  }}%</span><span class="text-xs text-text-muted" v-else-if="row.payType === 'percentage'">{{
                    row.payPercentage }}% Empleado</span></div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span class="text-text-muted">Total Ganado</span><span class="text-right"><span class="text-text">{{
                  formatUSD(row.totalEarned) }}</span><span class="text-text-muted ml-1">{{
                      formatEmployeeVESInline(row.totalEarned) }} Bs</span></span>
                <span class="text-text-muted">Pagado</span><span class="text-right"><span class="text-danger">{{
                  formatUSD(row.totalPaid) }}</span><span class="text-text-muted ml-1">{{
                      formatEmployeeVESInline(row.totalPaid) }} Bs</span></span>
                <span class="text-text-muted">Pendiente</span><span class="text-right font-bold"
                  :class="row.pendingBalance > 0 ? 'text-primary' : 'text-text-muted'">{{ formatUSD(row.pendingBalance)
                  }}</span>
              </div>
              <div class="pt-2 border-t border-border-subtle flex justify-end">
                <button @click="$emit('openRecibo', row)" class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  Ver Recibo
                </button>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Horarios -->
      <div v-if="activeTab === 'horarios'">
        <RecordSection title="" :items="paginatedHorarios" :total-count="teamSchedule.length"
          empty-message="No hay horarios registrados" :pages="horariosP" :page-size="pageSize" @prev="tabPage--"
          @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.employee || 'Empleado' }}</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Entrada</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Salida</th>
            <th
              class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Descanso</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Estado</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="schedule in items" :key="schedule.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ schedule.name }}</td>
              <td class="px-3 py-3 tabular-nums text-text-secondary">{{ formatTime24to12(schedule.start) }}</td>
              <td class="px-3 py-3 tabular-nums text-text-secondary">{{ formatTime24to12(schedule.end) }}</td>
              <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">{{ schedule.break }}</td>
              <td class="px-3 py-3 text-center"><span
                  :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', schedule.available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']"><span
                    :class="['h-1.5 w-1.5 rounded-full', schedule.available ? 'bg-success' : 'bg-danger']"></span>{{
                      schedule.available ? 'Disponible' : 'No disponible' }}</span></td>
            </tr>
          </template>
          <template #mobile-cards="{ items }">
            <div v-for="schedule in items" :key="schedule.id"
              class="rounded-lg border border-border-subtle bg-bg-secondary/30 p-3 space-y-2 text-sm">
              <div class="flex items-center justify-between"><span class="font-medium text-text">{{ schedule.name
                  }}</span><span
                  :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', schedule.available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger']"><span
                    :class="['h-1.5 w-1.5 rounded-full', schedule.available ? 'bg-success' : 'bg-danger']"></span>{{
                      schedule.available ? 'Disponible' : 'No disponible' }}</span></div>
              <div class="flex items-center justify-between text-xs"><span class="text-text-muted">{{
                formatTime24to12(schedule.start) }} - {{ formatTime24to12(schedule.end) }}</span><span
                  class="text-text-secondary">{{ schedule.break }}</span></div>
            </div>
          </template>
        </RecordSection>
      </div>
    </div>
  </div>
</template>
