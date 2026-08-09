<template>
  <div class="h-full max-w-7xl mx-auto space-y-6 flex flex-col">
    <header class="mb-4 lg:mb-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span>Reportes</span>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div class="relative flex-1 sm:w-72">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por fecha, tasa o usuario..."
            class="w-full rounded-xl border border-border bg-surface pl-9 pr-8 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5 rounded-md transition-colors"
            title="Limpiar búsqueda"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          @click="openModal()"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm hover:shadow active:scale-95 shrink-0"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Reporte
        </button>
      </div>
      </div>
    </header>

    <ReportesFinancialDashboard />

    <!-- Data Table -->
    <div class="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
      <div v-if="isLoading" class="flex flex-1 items-center justify-center p-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
      <div v-else-if="!reports || reports.length === 0" class="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted mb-4">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-text">No hay reportes registrados</h3>
        <p class="text-sm text-text-muted mt-1 max-w-sm">Haz clic en "Nuevo Reporte" para ingresar el cuadre diario de tu negocio.</p>
      </div>
      <div v-else-if="filteredReports.length === 0" class="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-secondary text-text-muted mb-4">
          <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-text">Sin resultados de búsqueda</h3>
        <p class="text-sm text-text-muted mt-1 max-w-sm">No se encontraron reportes que coincidan con "{{ searchQuery }}".</p>
        <button
          @click="searchQuery = ''"
          class="mt-4 px-4 py-2 text-xs font-semibold text-primary bg-primary-light hover:bg-primary-hover/20 rounded-xl transition-colors"
        >
          Limpiar búsqueda
        </button>
      </div>
      <div v-else class="flex-1 overflow-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm shadow-sm ring-1 ring-border-subtle">
            <tr>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Fecha</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Tasa del Día</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Reporte Z</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Total Bs</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Total USD</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Créditos</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Gran Total (USD + Bs)</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-[100px] text-right sticky right-0 bg-surface z-20 border-l border-border/50">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="report in filteredReports" :key="report.id" class="transition-colors hover:bg-bg-secondary/50 group">
              <td class="px-4 py-3 font-medium text-text">
                {{ formatDate(report.date) }}
                <span v-if="report.user?.name" class="block text-[11px] text-text-muted font-normal">Por: {{ report.user.name }}</span>
              </td>
              <td class="px-4 py-3 text-text-muted font-medium">
                {{ formatCurrency(report.exchange_rate) }} Bs/$
              </td>
              <td class="px-4 py-3 text-text-muted text-xs">
                <div>
                  Bs: <span class="font-semibold text-text">{{ formatCurrency(report.z_report_bs) }}</span>
                  <span v-if="hasDiscrepancyBs(report)" class="ml-1 text-amber-500 font-bold text-[10px]" :title="'Descuadre en Bs: ' + getDiffBsText(report)">⚠️</span>
                </div>
                <div>
                  USD: <span class="font-semibold text-text">${{ formatCurrency(report.z_report_usd) }}</span>
                  <span v-if="hasDiscrepancyUsd(report)" class="ml-1 text-amber-500 font-bold text-[10px]" :title="'Descuadre en USD: ' + getDiffUsdText(report)">⚠️</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="font-bold text-text">{{ formatCurrency(report.total_bs) }} Bs</div>
                <div class="text-[11px] text-text-muted">≈ ${{ formatCurrency(getBsInUsd(report)) }} USD</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-bold text-text">${{ formatCurrency(report.total_usd) }} USD</div>
                <div class="text-[11px] text-text-muted">≈ {{ formatCurrency(getUsdInBs(report)) }} Bs</div>
              </td>
              <td class="px-4 py-3 text-xs">
                <div v-if="(report.credit_usd || 0) > 0 || (report.credit_bs || 0) > 0">
                  <div v-if="(report.credit_usd || 0) > 0" class="font-semibold text-text">
                    ${{ formatCurrency(report.credit_usd || 0) }} USD
                  </div>
                  <div v-if="(report.credit_bs || 0) > 0" class="font-semibold text-text">
                    {{ formatCurrency(report.credit_bs || 0) }} Bs
                  </div>
                  <div v-if="report.credits_detail && report.credits_detail.length > 0" class="text-[11px] text-text-muted">
                    {{ report.credits_detail.length }} persona(s)
                  </div>
                </div>
                <span v-else class="text-text-muted font-normal">-</span>
              </td>
              <td class="px-4 py-3">
                <div class="font-extrabold text-primary">{{ formatCurrency(getGrandTotalBs(report)) }} Bs</div>
                <div class="text-xs font-semibold text-text-muted">≈ ${{ formatCurrency(getGrandTotalUsd(report)) }} USD</div>
              </td>
              <td class="px-4 py-3 text-right sticky right-0 bg-surface z-10 border-l border-border/50 group-hover:bg-surface">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="openModal(report)"
                    class="inline-flex items-center justify-center p-1.5 text-text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                    title="Editar"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    @click="handleDelete(report)"
                    class="inline-flex items-center justify-center p-1.5 text-text-muted hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <ReporteFormModal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DailyReport } from '../services/dailyReportService'
import ReporteFormModal from '../components/reportes/ReporteFormModal.vue'
import ReportesFinancialDashboard from '../components/reportes/ReportesFinancialDashboard.vue'
import { useDailyReports } from '../composables/reportes/useDailyReports'

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
