<template>
  <div class="h-full max-w-7xl mx-auto space-y-6 flex flex-col">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-text">Reportes Diarios</h1>
        <p class="text-sm text-text-muted mt-1">
          Registro manual de ingresos en bolívares y dólares al finalizar el día.
        </p>
      </div>
      <button
        @click="openModal()"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm hover:shadow active:scale-95"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Reporte
      </button>
    </div>

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
        <h3 class="text-lg font-medium text-text">No hay reportes</h3>
        <p class="text-sm text-text-muted mt-1 max-w-sm">Aún no se han registrado reportes manuales. Haz clic en "Nuevo Reporte" para crear el primero.</p>
      </div>
      <div v-else class="flex-1 overflow-auto touch-pan-y" style="-webkit-overflow-scrolling: touch;">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm shadow-sm ring-1 ring-border-subtle">
            <tr>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Fecha</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Tasa del Día</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Z Bs</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Z USD</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Total Bs</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Total USD</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs">Gran Total (Bs)</th>
              <th class="px-4 py-3 font-semibold text-text-secondary uppercase tracking-wider text-xs w-[100px] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="report in reports" :key="report.id" class="transition-colors hover:bg-bg-secondary/50">
              <td class="px-4 py-3 font-medium text-text">{{ formatDate(report.date) }}</td>
              <td class="px-4 py-3 text-text-muted">{{ formatCurrency(report.exchange_rate) }} Bs/$</td>
              <td class="px-4 py-3 text-text-muted">{{ formatCurrency(report.z_report_bs) }} Bs</td>
              <td class="px-4 py-3 text-text-muted">${{ formatCurrency(report.z_report_usd) }}</td>
              <td class="px-4 py-3 text-success font-medium">{{ formatCurrency(report.total_bs) }} Bs</td>
              <td class="px-4 py-3 text-success font-medium">${{ formatCurrency(report.total_usd) }}</td>
              <td class="px-4 py-3 text-text font-bold">
                {{ formatCurrency(Number(report.total_bs) + (Number(report.total_usd) * Number(report.exchange_rate))) }} Bs
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  @click="openModal(report)"
                  class="inline-flex items-center justify-center p-1.5 text-text-muted hover:text-primary hover:bg-primary-light rounded transition-colors"
                  title="Editar"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <ReporteFormModal ref="modalRef" @saved="refetch" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useBusinessStore } from '../store/business'
import { listDailyReports } from '../services/dailyReportService'
import type { DailyReport } from '../services/dailyReportService'
import ReporteFormModal from '../components/reportes/ReporteFormModal.vue'

const businessStore = useBusinessStore()
const modalRef = ref<InstanceType<typeof ReporteFormModal> | null>(null)

const { data: reports, isLoading, refetch } = useQuery({
  queryKey: ['daily-reports', businessStore.business?.id, businessStore.selectedBranchId],
  queryFn: () => listDailyReports(businessStore.business!.id, businessStore.selectedBranchId),
  enabled: () => !!businessStore.business?.id,
})

const formatCurrency = (val: number | string) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00') // Avoid timezone shift
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const openModal = (report?: DailyReport) => {
  modalRef.value?.open(report)
}
</script>
