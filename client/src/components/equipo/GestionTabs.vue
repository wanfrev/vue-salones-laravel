<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import KpiBanner from '../finanzas/KpiBanner.vue'
import RecordSection from '../finanzas/RecordSection.vue'

const { formatEmployeeVESInline } = useCurrency()

const fmtDate = (d: string) => {
  try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` } catch { return d }
}

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
}>()

const tabs = [
  { key: 'pagos' as const, label: 'Servicios Realizados', shortLabel: 'Servicios' },
  { key: 'nomina' as const, label: 'Pago de Nómina', shortLabel: 'Nómina' },
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
const paginatedNomina = computed(() => paginate(props.paymentsCtx.allPayments.value))
const paginatedDeuda = computed(() => paginate(props.deudaConSaldo))
const paginatedHorarios = computed(() => paginate(props.teamSchedule))
const serviciosP = computed(() => pageProps(props.summaryCtx.employeePayments.value))
const nominaP = computed(() => pageProps(props.paymentsCtx.allPayments.value))
const deudaP = computed(() => pageProps(props.deudaConSaldo))
const horariosP = computed(() => pageProps(props.teamSchedule))
</script>

<template>
  <div class="mb-5 lg:mb-6 rounded-xl border border-border bg-surface shadow-sm">
    <!-- Header -->
    <div class="flex flex-col gap-3 border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div>
        <h3 class="text-sm sm:text-base font-semibold text-text flex items-center gap-2">
          <svg class="h-4 w-4 sm:h-4.5 sm:w-4.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Gestión de Pagos y Horarios
        </h3>
        <p class="text-xs text-text-muted mt-0.5">Comisiones, nómina, deuda y horarios del equipo</p>
      </div>

      <!-- Month Selector -->
      <div
        class="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-sm self-start sm:self-auto"
        v-show="activeTab !== 'horarios'">
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
          <svg v-if="tab.key === 'pagos'" class="h-3.5 w-3.5" :class="activeTab === 'pagos' ? 'text-success' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="tab.key === 'nomina'" class="h-3.5 w-3.5" :class="activeTab === 'nomina' ? 'text-danger' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <svg v-else-if="tab.key === 'deuda'" class="h-3.5 w-3.5" :class="activeTab === 'deuda' ? 'text-warning' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" :class="activeTab === 'horarios' ? 'text-primary' : ''" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="hidden sm:inline">{{ tab.label }}</span><span class="sm:hidden">{{ tab.shortLabel }}</span>
        </button>
      </div>
    </div>

    <!-- KPI Banners -->
    <KpiBanner v-if="activeTab === 'pagos'" variant="success"
      icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      label="Total Comisiones" :value="formatUSD(totalComisiones)"
      :sublabel="`${summaryCtx.employeePayments.value.length} servicio(s)`"     />
    <KpiBanner v-if="activeTab === 'nomina'" variant="danger"
      icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      label="Total Pagado + Consumido" :value="formatUSD(totalNominaPagada + totalConsumido)"
      :sublabel="`${paymentsCtx.payments.value.length} registro(s)`">
      <template #actions>
        <button @click="$emit('openPayment')"
          class="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shrink-0"><svg
            class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg><span class="hidden sm:inline">Registrar pago</span><span class="sm:hidden">+ Pago</span></button>
        <button @click="$emit('openConsumption')"
          class="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition-theme hover:bg-danger/20 shrink-0 border border-danger/20"><svg
            class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg><span class="hidden sm:inline">Debitar consumo</span><span class="sm:hidden">Debitar</span></button>
      </template>
    </KpiBanner>
    <KpiBanner v-if="activeTab === 'deuda'" variant="warning"
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      label="Deuda Pendiente Total" :value="formatUSD(totalDeudaPendiente)"
      :sublabel="`${deudaConSaldo.length} empleado(s) con saldo`" />
    <KpiBanner v-if="activeTab === 'horarios'" variant="primary" icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
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
              Comisión</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Propina</th>
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="payment in items" :key="payment.id" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ payment.employee }}</td>
              <td class="px-3 py-3 text-text-secondary">{{ payment.client || '—' }}</td>
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
                <span v-else class="text-text-muted">—</span>
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
                <span class="text-text-muted">Comisión</span><span class="text-right"><span
                    class="font-semibold text-success">{{ formatUSD(payment.earnings) }}</span><span
                    class="text-text-muted ml-1">{{ formatVESInline(payment.earnings) }} Bs</span></span>
                <span class="text-text-muted">Propina</span><span class="text-right">
                  <span v-if="(payment.tipAmount ?? 0) > 0" class="font-semibold text-primary">{{ formatUSD(payment.tipAmount) }}</span>
                  <span v-else class="text-text-muted">—</span>
                </span>
              </div>
            </div>
          </template>
        </RecordSection>
      </div>

      <!-- Nómina -->
      <div v-if="activeTab === 'nomina'">
        <RecordSection title="" :items="paginatedNomina" :total-count="paymentsCtx.allPayments.value.length"
          empty-message="No hay pagos de nómina registrados" :pages="nominaP" :page-size="pageSize" @prev="tabPage--"
          @next="tabPage++">
          <template #desktop-thead>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Fecha</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{{
              businessStore.terminology.employee || 'Empleado' }}</th>
            <th
              class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
              Método</th>
            <th class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Monto</th>
            <th class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Acción</th>
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
                    title="Editar pago"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg></button>
                  <button @click="$emit('deletePayment', ep.id)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                    title="Eliminar pago"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg></button>
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
              Comisión</th>
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
          </template>
          <template #desktop-tbody="{ items }">
            <tr v-for="row in items" :key="row.employeeId" class="text-xs transition-theme hover:bg-bg-secondary/40">
              <td class="px-3 py-3 font-medium text-text">{{ row.employeeName }}</td>
              <td class="px-3 py-3 text-text-secondary text-xs hidden sm:table-cell"><span
                  v-if="row.payType === 'salary'">Sueldo base</span><span v-else-if="row.payType === 'mixed'">Sueldo +
                  {{ row.payPercentage }}%</span><span v-else-if="row.payType === 'percentage'">{{ row.payPercentage
                  }}%</span><span v-else>—</span></td>
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
