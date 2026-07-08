<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { useCrud } from '../../composables/empleados/useCrud'
import { useCategoryCRUD } from '../../composables/common/useCategoryCRUD'
import { useNotification } from '../../composables/common/useNotification'
import {
  listServicios,
  saveServicio,
  deleteServicio,
  serviciosKeys,
} from '../../services/serviciosService'
import { ServicioFormModal } from '../../components/modals'
import { ModalBase } from '../../components/common'
import type { Servicio, ServicioFormData } from '../../types/servicio'

const props = defineProps<{
  summaryCtx: ReturnType<typeof import('../../composables/finanzas/useFinancialSummary').useFinancialSummary>
  expensesCtx: ReturnType<typeof import('../../composables/finanzas/useExpenses').useExpenses>
  selectedPeriod: { value: string }
  selectedMonth: { value: string }
  businessId: import('vue').Ref<string | null>
}>()

const { formatUSD, formatVESInline, formatVESEs } = useCurrency()
const router = useRouter()

const detailTabs = [
  { key: 'cobros' as const, label: 'Cobros de Citas', shortLabel: 'Cobros' },
  { key: 'ventas' as const, label: 'Ventas de Productos', shortLabel: 'Ventas' },
  { key: 'gastos' as const, label: 'Gastos Operativos', shortLabel: 'Gastos' },
  { key: 'servicios' as const, label: 'Catálogo de Servicios', shortLabel: 'Servicios' },
]
const activeDetailTab = ref<'cobros' | 'ventas' | 'gastos' | 'servicios'>('cobros')

const allCobrosRows = computed(() => props.summaryCtx.appointmentIncomeDetails.value)
const allVentasRows = computed(() => props.summaryCtx.productSalesDetails.value)
const allGastosRows = computed(() => props.expenses.value)

const cobrosSearch = ref('')
const normalize = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const filteredCobrosRows = computed(() => {
  if (!cobrosSearch.value) return allCobrosRows.value
  const q = normalize(cobrosSearch.value)
  return allCobrosRows.value.filter(row =>
    normalize(row.client).includes(q) ||
    normalize(row.employee).includes(q) ||
    normalize(row.service).includes(q)
  )
})

const detailTabTotal = computed(() => {
  if (activeDetailTab.value === 'cobros') return filteredCobrosRows.value.reduce((acc, row) => acc + Number(row.amount ?? 0), 0)
  if (activeDetailTab.value === 'ventas') return allVentasRows.value.reduce((acc, row) => acc + Number(row.total ?? 0), 0)
  if (activeDetailTab.value === 'servicios') return servicios.value.filter(s => s.status === 'Activo').length
  return allGastosRows.value.reduce((acc, row) => acc + row.amount, 0)
})

const detailTabVesTotal = computed(() => {
  if (activeDetailTab.value === 'cobros') {
    const ves = filteredCobrosRows.value.reduce((acc, row) => acc + Number(row.amount ?? 0) * Number(row.exchangeRateUsed ?? 1), 0)
    return formatVESEs(ves)
  }
  if (activeDetailTab.value === 'ventas') {
    const ves = allVentasRows.value.reduce((acc, row) => acc + Number(row.total ?? 0) * Number(row.exchangeRateUsed ?? 1), 0)
    return formatVESEs(ves)
  }
  return ''
})

const detailTabCount = computed(() => {
  if (activeDetailTab.value === 'cobros') return filteredCobrosRows.value.length
  if (activeDetailTab.value === 'ventas') return allVentasRows.value.length
  if (activeDetailTab.value === 'servicios') return servicios.value.length
  return allGastosRows.value.length
})

const canViewDetailTab = computed(() => {
  if (activeDetailTab.value === 'cobros') return allCobrosRows.value.length > 5
  if (activeDetailTab.value === 'ventas') return allVentasRows.value.length > 5
  if (activeDetailTab.value === 'servicios') return false
  return allGastosRows.value.length > 5
})

const goToAllRecords = (tipo: string) => {
  router.push({
    name: 'admin-finanzas-registros',
    params: { tipo },
    query: { period: props.selectedPeriod.value, month: props.selectedMonth.value },
  })
}

const goToDetailTab = () => {
  if (activeDetailTab.value === 'cobros') goToAllRecords('cobros')
  else if (activeDetailTab.value === 'ventas') goToAllRecords('ventas-productos')
  else goToAllRecords('gastos')
}

const isLoadingExpenses = computed(() => props.expensesCtx.isLoading.value)
const expensesError = computed(() => props.expensesCtx.queryError.value ? (props.expensesCtx.queryError.value as Error).message : null)
const productSalesBreakdown = props.summaryCtx.productSalesBreakdown

// --- Servicios CRUD ---
const svcBusinessStore = useBusinessStore()
const branchId = computed(() => svcBusinessStore.currentBranchId)
const { success: notifySuccess, error: notifyError, warning: notifyWarning } = useNotification()
const servicioModalRef = ref<InstanceType<typeof ServicioFormModal> | null>(null)
const servicioToDelete = ref<Servicio | null>(null)
const isDeleteServicioOpen = ref(false)

const {
  items: servicios,
  saveMutation: saveServicioMutation,
  handleSave: handleSaveServicio,
  deleteMutation: deleteServicioMutation,
} = useCrud<Servicio, ServicioFormData>({
  businessId: props.businessId,
  branchId,
  queryKey: (id, brId) => serviciosKeys.all(id, brId),
  queryFn: (id, brId) => listServicios(id, brId),
  saveFn: (id, data, brId) => saveServicio(id, data, brId),
  deleteFn: (id) => deleteServicio(id),
  entityName: 'Servicio',
  modalRef: servicioModalRef,
  extraInvalidations: [
    () => ['appointments'],
    () => ['pos-pending'],
    () => ['financial-summary'],
  ],
})

const {
  isUpdatingCategory,
  activeCategory: activeSvcCategory,
  newCategoryName,
  isRenameCategoryOpen,
  categoryToDelete: categoryToDeleteName,
  replacementCategory,
  isDeleteCategoryOpen,
  categories: svcCategories,
  deleteCategoryOptions,
  filteredByCategory: filteredServicios,
  openRenameCategoryModal,
  closeRenameCategoryModal,
  confirmRenameCategory,
  openDeleteCategoryModal,
  closeDeleteCategoryModal,
  confirmDeleteCategory,
} = useCategoryCRUD<Servicio>({
  businessId: props.businessId,
  services: servicios,
  businessStore: svcBusinessStore,
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
})

const handleEditServicio = (servicio: Servicio) => { servicioModalRef.value?.open(servicio) }

const handleDeleteServicio = (servicio: Servicio) => {
  servicioToDelete.value = servicio
  isDeleteServicioOpen.value = true
}

const confirmDeleteServicio = async () => {
  if (servicioToDelete.value && deleteServicioMutation) {
    try { await deleteServicioMutation.mutateAsync(servicioToDelete.value.id) }
    catch { /* handled by useCrud */ }
    finally { isDeleteServicioOpen.value = false; servicioToDelete.value = null }
  }
}
</script>

<template>
  <div class="mb-4 rounded-xl border border-border bg-surface shadow-sm">
    <!-- Header -->
    <div class="flex flex-col gap-3 border-b border-border-subtle px-3 sm:px-5 py-3 sm:py-4">
      <div>
        <h3 class="text-sm sm:text-base font-semibold text-text flex items-center gap-2">
          <svg class="h-4 w-4 sm:h-4.5 sm:w-4.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Detalle de Movimientos
        </h3>
        <p class="text-xs text-text-muted mt-0.5">Desglose analítico del período</p>
      </div>

      <!-- Segmented Control -->
      <div
        class="bg-bg-secondary p-1 rounded-xl border border-border-subtle flex items-center gap-0.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
        <button v-for="tab in detailTabs" :key="tab.key" @click="activeDetailTab = tab.key" :class="[
          'px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap shrink-0',
          activeDetailTab === tab.key
            ? 'bg-surface text-text shadow-sm shadow-black/5 border border-border font-semibold'
            : 'text-text-secondary hover:text-text hover:bg-surface/40'
        ]">
          <svg v-if="tab.key === 'cobros'" class="h-3.5 w-3.5"
            :class="activeDetailTab === 'cobros' ? 'text-success' : ''" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="tab.key === 'ventas'" class="h-3.5 w-3.5"
            :class="activeDetailTab === 'ventas' ? 'text-info' : ''" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <svg v-else-if="tab.key === 'gastos'" class="h-3.5 w-3.5"
            :class="activeDetailTab === 'gastos' ? 'text-danger' : ''" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" :class="activeDetailTab === 'servicios' ? 'text-primary' : ''" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span class="sm:hidden">{{ tab.shortLabel }}</span>
        </button>
      </div>
    </div>

    <!-- KPI Summary Banner -->
    <div
      class="mx-3 sm:mx-5 mt-3 sm:mt-4 mb-0 rounded-xl border border-border-subtle p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      :class="[
        activeDetailTab === 'cobros' ? 'bg-gradient-to-r from-success/[0.04] to-transparent' :
          activeDetailTab === 'ventas' ? 'bg-gradient-to-r from-info/[0.04] to-transparent' :
            activeDetailTab === 'servicios' ? 'bg-gradient-to-r from-primary/[0.04] to-transparent' :
              'bg-gradient-to-r from-danger/[0.04] to-transparent'
      ]">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-lg border shrink-0" :class="[
          activeDetailTab === 'cobros' ? 'bg-success/10 border-success/10 text-success' :
            activeDetailTab === 'ventas' ? 'bg-info/10 border-info/10 text-info' :
              activeDetailTab === 'servicios' ? 'bg-primary/10 border-primary/10 text-primary' :
                'bg-danger/10 border-danger/10 text-danger'
        ]">
          <svg v-if="activeDetailTab === 'cobros'" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="activeDetailTab === 'ventas'" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <svg v-else-if="activeDetailTab === 'servicios'" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <span class="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider font-semibold">Total {{
            activeDetailTab === 'cobros' ? 'Cobrado' : activeDetailTab === 'ventas' ? 'Vendido' : activeDetailTab ===
              'servicios' ? 'Activos' : 'Gastado' }}</span>
          <div class="flex items-baseline gap-2 mt-0.5 flex-wrap">
            <span v-if="activeDetailTab !== 'servicios'"
              class="text-xl sm:text-2xl font-bold text-text tracking-tight tabular-nums">{{ formatUSD(detailTabTotal)
              }}</span>
            <span v-else class="text-xl sm:text-2xl font-bold text-text tracking-tight tabular-nums">{{
              servicios.filter(s => s.status === 'Activo').length }}</span>
            <span v-if="activeDetailTab === 'cobros'" class="text-sm text-text-muted font-medium">{{ detailTabVesTotal
              }}</span>
            <span class="text-xs text-text-muted font-mono">{{ activeDetailTab === 'servicios' ? servicios.length :
              detailTabCount }} {{ activeDetailTab === 'cobros' ? 'cobros' : activeDetailTab === 'ventas' ? 'ventas' :
                activeDetailTab === 'gastos' ? 'gastos' : 'servicios' }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button v-if="activeDetailTab === 'gastos'" @click="expensesCtx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Registrar gasto</span><span class="sm:hidden">+ Gasto</span>
        </button>
        <button v-if="activeDetailTab === 'servicios'" @click="servicioModalRef?.open()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Nuevo servicio</span><span class="sm:hidden">+ Servicio</span>
        </button>
        <button v-if="canViewDetailTab" type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text hover:border-border-strong"
          @click="goToDetailTab">
          Ver todos <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Table Content -->
    <div class="p-3 sm:p-5">
      <!-- Tab: Cobros de Citas -->
      <div v-if="activeDetailTab === 'cobros'">
        <div class="relative mb-3">
          <input v-model="cobrosSearch" type="text" placeholder="Buscar por cliente, empleado o servicio..."
            class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div v-if="filteredCobrosRows.length" class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-subtle">
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Cliente</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Empleado</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Servicio</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden md:table-cell">
                  Notas</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Método</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Monto</th>
                <th
                  class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="item in filteredCobrosRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="item.id"
                class="text-xs transition-theme hover:bg-bg-secondary/40">
                <td class="px-3 py-3 whitespace-nowrap text-text-secondary">{{ item.date }}</td>
                <td class="px-3 py-3 font-medium text-text">{{ item.client }}</td>
                <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">{{ item.employee }}</td>
                <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">{{ item.service }}</td>
                <td class="px-3 py-3 text-text-secondary hidden md:table-cell max-w-[160px]">
                  <span v-if="item.notes" class="truncate block" :title="item.notes">{{ item.notes }}</span>
                  <span v-else class="text-text-muted/40">—</span>
                </td>
                <td class="px-3 py-3"><span
                    class="inline-flex items-center rounded-md bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">{{
                      item.breakdownLabel || item.method }}</span></td>
                <td class="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                  <div class="font-semibold text-success">{{ item.primaryCurrency === 'VES' ?
                    formatVESEs(item.primaryAmount) : formatUSD(item.amount) }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">{{ item.primaryCurrency === 'VES' ?
                    formatUSD(item.amount) : formatVESInline(item.amount, item.exchangeRateUsed) + ' Bs' }}</div>
                  <span v-if="(item.tipAmount ?? 0) > 0"
                    class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">+${{
                      (item.tipAmount ?? 0).toFixed(2) }} propina</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button @click="summaryCtx.startEdit(item)"
                      :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                      title="Editar cita y cobro">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button @click="summaryCtx.confirmDeleteTransaction(item.id)"
                      :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                      title="Eliminar cobro">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2">
            <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-sm text-text-muted">No hay cobros en este período</p>
        </div>
      </div>

      <!-- Tab: Ventas de Productos -->
      <div v-else-if="activeDetailTab === 'ventas'">
        <div v-if="allVentasRows.length" class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-subtle">
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Cliente</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Producto</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Cant.</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Precio</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Total</th>
                <th
                  class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary w-10">
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="row in allVentasRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="row.id"
                class="text-xs transition-theme hover:bg-bg-secondary/40">
                <td class="px-3 py-3 whitespace-nowrap text-text-secondary">{{ row.date }}</td>
                <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">{{ row.clientName || '—' }}</td>
                <td class="px-3 py-3 font-medium text-text">{{ row.product }}</td>
                <td class="px-3 py-3 text-right tabular-nums text-text-secondary">{{ row.quantity }}</td>
                <td
                  class="px-3 py-3 text-right tabular-nums text-text-secondary whitespace-nowrap hidden sm:table-cell">
                  {{ formatUSD(row.unitPrice) }}</td>
                <td class="px-3 py-3 text-right font-semibold text-info tabular-nums whitespace-nowrap">
                  <div>{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</div>
                  <div class="text-[10px] text-text-muted mt-0.5">{{ row.currency === 'VES' ? formatUSD(row.total) :
                    formatVESInline(row.total, row.exchangeRateUsed) + ' Bs' }}</div>
                </td>
                <td class="px-3 py-3 text-center">
                  <button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)"
                    class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                    title="Eliminar venta">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2">
            <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p class="text-sm text-text-muted">No hay ventas en este período</p>
        </div>
        <div v-if="productSalesBreakdown.length" class="mt-4 rounded-lg bg-bg-secondary p-3">
          <p class="text-xs font-medium text-text-secondary mb-1.5">Productos principales</p>
          <div class="space-y-1">
            <div v-for="(p, idx) in productSalesBreakdown.slice(0, 5)" :key="p.name"
              class="flex items-center justify-between text-xs">
              <span class="text-text-secondary truncate"><span class="font-medium text-text-muted">{{ idx + 1 }}.</span>
                {{ p.name }}</span>
              <span class="font-medium text-info tabular-nums shrink-0 ml-2">
                <span>{{ formatUSD(p.amount) }}</span>
                <span class="text-text-muted ml-1">{{ formatVESInline(p.amount) + ' Bs' }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Servicios -->
      <div v-else-if="activeDetailTab === 'servicios'">
        <div class="flex flex-wrap items-center gap-1.5 mb-4">
          <button v-for="cat in svcCategories" :key="cat.id" @click="activeSvcCategory = cat.id" :class="[
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            activeSvcCategory === cat.id ? 'bg-primary text-text-inverse shadow-sm' : 'bg-bg-secondary text-text-secondary hover:text-text hover:bg-bg-secondary/80'
          ]">{{ cat.name }}</button>
        </div>
        <div v-if="filteredServicios.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2">
            <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              stroke-width="1.5">
              <path
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <p class="text-sm text-text-muted">No hay servicios en esta categoría</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-subtle">
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Nombre</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Categoría</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Precio</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary hidden sm:table-cell">
                  Duración</th>
                <th
                  class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Estado</th>
                <th
                  class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="svc in filteredServicios" :key="svc.id"
                class="group text-xs transition-theme hover:bg-bg-secondary/40">
                <td class="px-3 py-3 font-medium text-text">{{ svc.name }}</td>
                <td class="px-3 py-3 text-text-secondary hidden sm:table-cell">
                  <div class="flex items-center gap-2">
                    <span class="rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary">{{
                      svc.category }}</span>
                    <button @click="openRenameCategoryModal(svc.category)"
                      class="rounded p-0.5 text-text-muted hover:text-primary hover:bg-primary/10 transition-all"
                      title="Editar categoría">
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button v-if="svcCategories.length > 2" @click="openDeleteCategoryModal(svc.category)"
                      class="rounded p-0.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                      title="Eliminar categoría">
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td class="px-3 py-3 text-right">
                  <div class="font-semibold text-success tabular-nums">{{ formatUSD(svc.price) }}</div>
                  <div class="text-[10px] text-text-muted">{{ formatVESInline(svc.price) }} Bs</div>
                </td>
                <td class="px-3 py-3 text-right text-text-secondary hidden sm:table-cell">{{ svc.duration }} min</td>
                <td class="px-3 py-3 text-center"><span
                    :class="['rounded-full px-2 py-0.5 text-[11px] font-medium', svc.status === 'Activo' ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted']">{{
                    svc.status }}</span></td>
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button @click="handleEditServicio(svc)"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                      title="Editar servicio">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button @click="handleDeleteServicio(svc)"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                      title="Eliminar servicio">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Gastos Operativos -->
      <div v-else>
        <div v-if="isLoadingExpenses" class="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando gastos...
        </div>
        <div v-else-if="expensesError" class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 mb-2">
            <svg class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p class="text-sm text-danger">{{ expensesError }}</p>
        </div>
        <div v-else-if="allGastosRows.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary mb-2"><svg
              class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
            </svg></div>
          <p class="text-sm text-text-muted">No hay gastos en este período</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-subtle">
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Concepto</th>
                <th
                  class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Categoría</th>
                <th
                  class="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Monto</th>
                <th
                  class="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr v-for="expense in allGastosRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="expense.id"
                class="text-xs transition-theme hover:bg-bg-secondary/40">
                <td class="px-3 py-3 whitespace-nowrap text-text-secondary">{{ expense.date }}</td>
                <td class="px-3 py-3 font-medium text-text">{{ expense.name }}</td>
                <td class="px-3 py-3"><span
                    :class="['rounded-full px-2 py-0.5 text-[11px] font-medium', expense.category === 'Fijos' ? 'bg-info/10 text-info' : expense.category === 'Insumos' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary']">{{
                    expense.category }}</span></td>
                <td class="px-3 py-3 text-right">
                  <div class="font-medium text-text whitespace-nowrap">{{ expense.currency === 'VES' ?
                    formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</div>
                  <div class="text-[11px] text-text-muted whitespace-nowrap">{{ expense.currency === 'VES' ?
                    formatUSD(expense.amount) : formatVESInline(expense.amount, expense.exchangeRateUsed) + ' Bs' }}
                  </div>
                </td>
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button @click="expensesCtx.openEdit(expense)"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                      title="Editar gasto">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button @click="expensesCtx.handleDelete(expense.id)"
                      class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                      title="Eliminar gasto">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Servicios Modals -->
  <ServicioFormModal ref="servicioModalRef" :is-saving="saveServicioMutation.isPending.value ?? false"
    @save="handleSaveServicio" />

  <ModalBase :is-open="isDeleteServicioOpen" title="Eliminar servicio" subtitle="Esta acción no se puede deshacer"
    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    variant="danger" size="sm" confirm-text="Eliminar" cancel-text="Cancelar"
    :loading="deleteServicioMutation?.isPending.value ?? false" @close="isDeleteServicioOpen = false"
    @confirm="confirmDeleteServicio" @cancel="isDeleteServicioOpen = false">
    <p class="text-sm text-text-secondary">¿Estás seguro de que deseas eliminar <strong>{{ servicioToDelete?.name
        }}</strong>? Este servicio será eliminado permanentemente del catálogo.</p>
  </ModalBase>

  <ModalBase :is-open="isRenameCategoryOpen" title="Editar categoría" subtitle="Actualiza el nombre de la categoría"
    icon="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" size="sm"
    confirm-text="Guardar" cancel-text="Cancelar" :loading="isUpdatingCategory" @close="closeRenameCategoryModal"
    @confirm="confirmRenameCategory" @cancel="closeRenameCategoryModal">
    <label class="mb-2 block text-sm font-medium text-text" for="new-cat-name">Nombre</label>
    <input id="new-cat-name" v-model="newCategoryName" type="text"
      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary"
      required />
  </ModalBase>

  <ModalBase :is-open="isDeleteCategoryOpen" title="Eliminar categoría"
    subtitle="Reasigna los servicios a otra categoría antes de eliminar"
    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    variant="danger" size="sm" confirm-text="Eliminar categoría" cancel-text="Cancelar" :loading="isUpdatingCategory"
    @close="closeDeleteCategoryModal" @confirm="confirmDeleteCategory" @cancel="closeDeleteCategoryModal">
    <p class="text-sm text-text-secondary mb-3">Los servicios de <strong>{{ categoryToDeleteName }}</strong> se moverán
      a:</p>
    <select v-model="replacementCategory"
      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary">
      <option v-for="opt in deleteCategoryOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
    </select>
  </ModalBase>
</template>
