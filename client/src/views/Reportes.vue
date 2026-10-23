<template>
  <div class="mx-auto flex h-full max-w-7xl flex-col space-y-4">
    <header class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <svg class="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">Reportes</h1>
      </div>
      <button
        @click="openModal()"
        class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover active:scale-95"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Reporte
      </button>
    </header>

    <ReportesFinancialDashboard />

    <!-- Lista de reportes -->
    <section class="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
        <div class="relative sm:max-w-sm">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por fecha, tasa o usuario..."
            class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-8 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-text-muted transition-colors hover:text-text"
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="flex-1 divide-y divide-border-subtle" aria-busy="true">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-4">
          <div class="h-3 w-24 animate-pulse rounded bg-bg-secondary"></div>
          <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
          <div class="h-3 w-28 animate-pulse rounded bg-bg-secondary"></div>
          <div class="h-3 w-20 animate-pulse rounded bg-bg-secondary"></div>
        </div>
      </div>
      <div v-else-if="!reports || reports.length === 0" class="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-text">No hay reportes registrados</h3>
        <p class="mt-1 max-w-sm text-sm text-text-muted">Haz clic en "Nuevo Reporte" para ingresar el cuadre diario de tu negocio.</p>
      </div>
      <div v-else-if="filteredReports.length === 0" class="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-text">Sin resultados de búsqueda</h3>
        <p class="mt-1 max-w-sm text-sm text-text-muted">No se encontraron reportes que coincidan con "{{ searchQuery }}".</p>
        <button
          @click="searchQuery = ''"
          class="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Limpiar búsqueda
        </button>
      </div>

      <!-- En escritorio las 8 columnas se desplazan de lado (con Acciones fija a la derecha); en móvil cada reporte es un bloque -->
      <div v-else class="flex-1 overflow-auto">
        <div class="lg:min-w-[66rem]">
          <div :class="[gridClass, 'sticky top-0 z-10 hidden border-b border-border-subtle bg-bg-secondary px-4 py-2 lg:grid']">
            <span :class="headClass">Fecha</span>
            <span :class="headClass">Tasa del Día</span>
            <span :class="headClass">Reporte Z</span>
            <span :class="headClass">Total Bs</span>
            <span :class="headClass">Total USD</span>
            <span :class="headClass">Créditos</span>
            <span :class="headClass">Gran Total (USD + Bs)</span>
            <span :class="[headClass, 'sticky right-0 bg-bg-secondary text-right']">Acciones</span>
          </div>

          <ul class="divide-y divide-border-subtle">
            <li
              v-for="report in paginatedReports"
              :key="report.id"
              data-testid="report-row"
              :class="[gridClass, 'group relative grid grid-cols-2 gap-x-3 gap-y-2.5 px-4 py-3 text-sm transition-colors hover:bg-bg-secondary/40']"
            >
              <!-- Fecha (en móvil deja sitio a las acciones) -->
              <div class="col-span-2 pr-16 font-medium text-text lg:col-span-1 lg:pr-0">
                {{ formatDate(report.date) }}
                <span v-if="report.user?.name" class="block text-[11px] font-normal text-text-muted">Por: {{ report.user.name }}</span>
              </div>

              <div>
                <p :class="labelClass">Tasa del Día</p>
                <span class="font-medium text-text-secondary">{{ formatCurrency(report.exchange_rate) }} Bs/$</span>
              </div>

              <div class="text-xs text-text-muted">
                <p :class="labelClass">Reporte Z</p>
                <div>
                  Bs: <span class="font-semibold text-text">{{ formatCurrency(report.z_report_bs) }}</span>
                  <span v-if="hasDiscrepancyBs(report)" class="ml-1 text-[10px] font-bold text-amber-500" :title="'Descuadre en Bs: ' + getDiffBsText(report)">⚠️</span>
                </div>
                <div>
                  USD: <span class="font-semibold text-text">${{ formatCurrency(report.z_report_usd) }}</span>
                  <span v-if="hasDiscrepancyUsd(report)" class="ml-1 text-[10px] font-bold text-amber-500" :title="'Descuadre en USD: ' + getDiffUsdText(report)">⚠️</span>
                </div>
              </div>

              <div>
                <p :class="labelClass">Total Bs</p>
                <div class="font-bold tabular-nums text-text">{{ formatCurrency(report.total_bs) }} Bs</div>
                <div class="text-[11px] tabular-nums text-text-muted">≈ ${{ formatCurrency(getBsInUsd(report)) }} USD</div>
              </div>

              <div>
                <p :class="labelClass">Total USD</p>
                <div class="font-bold tabular-nums text-text">${{ formatCurrency(report.total_usd) }} USD</div>
                <div class="text-[11px] tabular-nums text-text-muted">≈ {{ formatCurrency(getUsdInBs(report)) }} Bs</div>
              </div>

              <div class="text-xs">
                <p :class="labelClass">Créditos</p>
                <div v-if="(report.credit_usd || 0) > 0 || (report.credit_bs || 0) > 0">
                  <div v-if="(report.credit_usd || 0) > 0" class="font-semibold tabular-nums text-text">
                    ${{ formatCurrency(report.credit_usd || 0) }} USD
                  </div>
                  <div v-if="(report.credit_bs || 0) > 0" class="font-semibold tabular-nums text-text">
                    {{ formatCurrency(report.credit_bs || 0) }} Bs
                  </div>
                  <div v-if="report.credits_detail && report.credits_detail.length > 0" class="text-[11px] text-text-muted">
                    {{ report.credits_detail.length }} persona(s)
                  </div>
                </div>
                <span v-else class="font-normal text-text-muted">-</span>
              </div>

              <div class="col-span-2 border-t border-border-subtle pt-2.5 lg:col-span-1 lg:border-t-0 lg:pt-0">
                <p :class="labelClass">Gran Total (USD + Bs)</p>
                <div class="font-extrabold tabular-nums text-primary">{{ formatCurrency(getGrandTotalBs(report)) }} Bs</div>
                <div class="text-xs font-semibold tabular-nums text-text-muted">≈ ${{ formatCurrency(getGrandTotalUsd(report)) }} USD</div>
              </div>

              <!-- Acciones -->
              <div class="absolute right-2 top-2 flex items-center lg:sticky lg:right-0 lg:top-auto lg:justify-end lg:bg-surface lg:py-1 lg:group-hover:bg-bg-secondary">
                <button
                  @click="openModal(report)"
                  class="inline-flex items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  title="Editar"
                  aria-label="Editar"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(report)"
                  class="inline-flex items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <ListPagination
        v-if="filteredReports.length > 0"
        class="shrink-0"
        :current-page="currentPage"
        :total-pages="totalPages"
        :page-numbers="pageNumbers"
        :has-next="hasNextPage"
        :has-previous="hasPreviousPage"
        :start="paginationStart"
        :end="paginationEnd"
        :total="filteredReports.length"
        @goto="goToPage"
        @next="nextPage"
        @previous="previousPage"
      />
    </section>
    <ReporteFormModal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DailyReport } from '../services/dailyReportService'
import ReporteFormModal from '../components/reportes/ReporteFormModal.vue'
import ReportesFinancialDashboard from '../components/reportes/ReportesFinancialDashboard.vue'
import { useDailyReports } from '../composables/reportes/useDailyReports'
import { usePagination } from '../composables/common/usePagination'
import ListPagination from '../components/common/ListPagination.vue'

// Fecha · Tasa · Z · Total Bs · Total USD · Créditos · Gran total · Acciones (última columna de ancho fijo).
const gridClass = 'lg:grid lg:grid-cols-[8.5rem_6.5rem_7.5rem_8.5rem_8.5rem_7rem_minmax(9rem,1fr)_5rem] lg:items-center lg:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const labelClass = 'mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted lg:hidden'

const searchQuery = ref('')
const modalRef = ref<InstanceType<typeof ReporteFormModal> | null>(null)
const { reports, isLoading, deleteMutation } = useDailyReports()

const formatCurrency = (val: number | string) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (dateStr: string) => {
  const cleanDate = dateStr ? String(dateStr).split('T')[0].split(' ')[0] : ''
  const d = new Date(cleanDate + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const filteredReports = computed(() => {
  if (!reports.value) return []
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return reports.value

  return reports.value.filter((report) => {
    const rawDate = report.date ? String(report.date).toLowerCase() : ''
    const formattedDateStr = formatDate(report.date).toLowerCase()
    const rateStr = report.exchange_rate ? String(report.exchange_rate) : ''
    const formattedRate = formatCurrency(report.exchange_rate)
    const userName = report.user?.name ? report.user.name.toLowerCase() : ''
    const creditNames = report.credits_detail && Array.isArray(report.credits_detail)
      ? report.credits_detail.map(c => c.name.toLowerCase()).join(' ')
      : ''

    return (
      rawDate.includes(query) ||
      formattedDateStr.includes(query) ||
      rateStr.includes(query) ||
      formattedRate.includes(query) ||
      userName.includes(query) ||
      creditNames.includes(query)
    )
  })
})

const {
  currentPage,
  totalPages,
  paginatedData: paginatedReports,
  paginationStart,
  paginationEnd,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  nextPage,
  previousPage,
  pageNumbers,
} = usePagination({ data: filteredReports, pageSize: 20 })

watch(searchQuery, () => goToPage(1))

const getBsInUsd = (report: DailyReport) => {
  const rate = Number(report.exchange_rate)
  if (rate <= 0) return 0
  return Number(report.total_bs) / rate
}

const getUsdInBs = (report: DailyReport) => {
  const rate = Number(report.exchange_rate)
  return Number(report.total_usd) * rate
}

const getGrandTotalBs = (report: DailyReport) => {
  return Number(report.total_bs) + getUsdInBs(report)
}

const getGrandTotalUsd = (report: DailyReport) => {
  return Number(report.total_usd) + getBsInUsd(report)
}

const hasDiscrepancyBs = (report: DailyReport) => {
  const z = Number(report.z_report_bs)
  if (z <= 0) return false
  return Math.abs(getGrandTotalBs(report) - z) > 0.01
}

const hasDiscrepancyUsd = (report: DailyReport) => {
  const z = Number(report.z_report_usd)
  if (z <= 0) return false
  return Math.abs(getGrandTotalUsd(report) - z) > 0.01
}

const getDiffBsText = (report: DailyReport) => {
  const diff = getGrandTotalBs(report) - Number(report.z_report_bs)
  return `${diff > 0 ? '+' : ''}${formatCurrency(diff)} Bs`
}

const getDiffUsdText = (report: DailyReport) => {
  const diff = getGrandTotalUsd(report) - Number(report.z_report_usd)
  return `${diff > 0 ? '+' : ''}$${formatCurrency(diff)} USD`
}

const openModal = (report?: DailyReport) => {
  modalRef.value?.open(report)
}

const handleDelete = (report: DailyReport) => {
  if (!confirm(`¿Estás seguro de eliminar el reporte del ${formatDate(report.date)}?`)) return
  deleteMutation.mutate(report.id)
}
</script>
