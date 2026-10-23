<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { hasRetailModule } from '../../config/niches'
import { formatMethod } from '../../lib/formatters'
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
  hideTabs?: string[]
  showOnly?: string
  hideTotal?: boolean
}>()

const { formatUSD, formatSecondary, formatVESEs } = useCurrency()

// Cuadrículas de las filas (la última columna, de ancho fijo, alinea las acciones entre filas).
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const iconBtn = 'rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary disabled:opacity-50'
const gCobros = 'lg:grid lg:grid-cols-[5.5rem_minmax(0,1.1fr)_minmax(0,1.2fr)_6rem_8rem_4.5rem] lg:items-center lg:gap-3'
const gVentasInv = 'lg:grid lg:grid-cols-[5.5rem_minmax(0,1.6fr)_4rem_7rem_7rem_6rem] lg:items-center lg:gap-3'
const gVentasRow = 'lg:grid lg:grid-cols-[5rem_minmax(0,1.6fr)_3rem_4.5rem_6rem_6.5rem_2.5rem] lg:items-center lg:gap-3'
const gServicios = 'md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_6.5rem_5rem_5rem_4.5rem] md:items-center md:gap-3'
const gGastos = 'md:grid md:grid-cols-[5.5rem_minmax(0,1.4fr)_6rem_8rem_4.5rem] md:items-center md:gap-3'
const router = useRouter()
const detailBusinessStore = useBusinessStore()
const isTienda = computed(() => hasRetailModule(detailBusinessStore.nicheType, detailBusinessStore.features))

const allTabs = [
  { key: 'cobros' as const, label: 'Cobros de Citas', shortLabel: 'Cobros' },
  { key: 'ventas' as const, label: 'Ventas de Productos', shortLabel: 'Ventas' },
  { key: 'gastos' as const, label: 'Gastos Operativos', shortLabel: 'Gastos' },
  { key: 'servicios' as const, label: 'Catálogo de Servicios', shortLabel: 'Servicios' },
]

const detailTabs = computed(() => {
  if (props.showOnly) return allTabs.filter(t => t.key === props.showOnly)
  if (props.hideTabs) return allTabs.filter(t => !props.hideTabs!.includes(t.key))
  return allTabs
})

const activeDetailTab = ref<'cobros' | 'ventas' | 'gastos' | 'servicios'>(
  props.showOnly ? (props.showOnly as any) : (detailTabs.value[0]?.key ?? 'ventas'),
)

const allCobrosRows = computed(() => props.summaryCtx.appointmentIncomeDetails.value)
const allVentasRows = computed(() => props.summaryCtx.productSalesDetails.value)
const allVentasInvoices = computed(() => props.summaryCtx.productSalesInvoices.value)
const allGastosRows = computed(() => props.expensesCtx.expenses.value as any[])

const expandedInvoiceIds = ref<Set<string>>(new Set())
const toggleInvoiceExpand = (id: string) => {
  const s = new Set(expandedInvoiceIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedInvoiceIds.value = s
}

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

// Una venta a crédito (rawMethod 'credito') todavía no es dinero cobrado -- solo su abono lo es,
// y ese abono ya aparece como su propia fila (con método real) porque no se agrupan entre sí (ver
// el comentario sobre groupKey en useFinancialSummary.ts). Sumar ambas duplicaría ese ingreso: el
// Resumen ya excluye 'credito' de su total, así que este total debe hacerlo también para cuadrar.
const detailTabTotal = computed(() => {
  if (activeDetailTab.value === 'cobros') return filteredCobrosRows.value.reduce((acc, row) => acc + ((row.rawMethod === 'credito' || row.rawMethod === 'cortesia') ? 0 : Number(row.amount ?? 0)), 0)
  if (activeDetailTab.value === 'ventas') return allVentasRows.value.reduce((acc, row) => acc + Number(row.total ?? 0), 0)
  if (activeDetailTab.value === 'servicios') return servicios.value.filter(s => s.status === 'Activo').length
  return allGastosRows.value.reduce((acc, row) => acc + row.amount, 0)
})

const detailTabVesTotal = computed(() => {
  if (activeDetailTab.value === 'cobros') {
    const ves = filteredCobrosRows.value.reduce((acc, row) => acc + ((row.rawMethod === 'credito' || row.rawMethod === 'cortesia') ? 0 : Number(row.amount ?? 0) * Number(row.exchangeRateUsed ?? 1)), 0)
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
  if (activeDetailTab.value === 'ventas') return isTienda.value ? allVentasInvoices.value.length : allVentasRows.value.length
  if (activeDetailTab.value === 'servicios') return servicios.value.length
  return allGastosRows.value.length
})

const canViewDetailTab = computed(() => {
  if (activeDetailTab.value === 'cobros') return allCobrosRows.value.length > 5
  if (activeDetailTab.value === 'ventas') return isTienda.value ? allVentasInvoices.value.length > 5 : allVentasRows.value.length > 5
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
  <div class="mb-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <!-- Encabezado -->
    <div class="border-b border-border-subtle px-4 py-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-text sm:text-base">
        <svg class="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Detalle de Movimientos
      </h3>
      <p class="mt-0.5 text-xs text-text-muted">Desglose analítico del período</p>
    </div>

    <!-- Pestañas del detalle -->
    <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Detalle de movimientos">
      <button v-for="tab in detailTabs" :key="tab.key" type="button" role="tab" :aria-selected="activeDetailTab === tab.key" @click="activeDetailTab = tab.key"
        class="relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors"
        :class="activeDetailTab === tab.key ? 'text-text' : 'text-text-secondary hover:text-text'">
        <svg v-if="tab.key === 'cobros'" class="h-3.5 w-3.5" :class="activeDetailTab === 'cobros' ? 'text-success' : ''" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else-if="tab.key === 'ventas'" class="h-3.5 w-3.5" :class="activeDetailTab === 'ventas' ? 'text-info' : ''" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <svg v-else-if="tab.key === 'gastos'" class="h-3.5 w-3.5" :class="activeDetailTab === 'gastos' ? 'text-danger' : ''" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <svg v-else class="h-3.5 w-3.5" :class="activeDetailTab === 'servicios' ? 'text-primary' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <span class="hidden sm:inline">{{ tab.label }}</span>
        <span class="sm:hidden">{{ tab.shortLabel }}</span>
        <span v-if="activeDetailTab === tab.key" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
      </button>
    </div>

    <!-- Total del período y acciones -->
    <div class="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="!hideTotal" class="min-w-0">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:text-[11px]">Total {{
          activeDetailTab === 'cobros' ? 'Cobrado' : activeDetailTab === 'ventas' ? 'Vendido' : activeDetailTab ===
            'servicios' ? 'Activos' : 'Gastado' }}</span>
        <div class="mt-0.5 flex flex-wrap items-baseline gap-2">
          <span v-if="activeDetailTab !== 'servicios'" class="text-xl font-bold tabular-nums tracking-tight sm:text-2xl"
            :class="activeDetailTab === 'cobros' ? 'text-success' : activeDetailTab === 'ventas' ? 'text-info' : 'text-danger'">{{ formatUSD(detailTabTotal) }}</span>
          <span v-else class="text-xl font-bold tabular-nums tracking-tight text-primary sm:text-2xl">{{
            servicios.filter(s => s.status === 'Activo').length }}</span>
          <span v-if="activeDetailTab === 'cobros'" class="text-sm font-medium text-text-muted">{{ detailTabVesTotal }}</span>
          <span class="font-mono text-xs text-text-muted">{{ activeDetailTab === 'servicios' ? servicios.length :
            detailTabCount }} {{ activeDetailTab === 'cobros' ? 'cobros' : activeDetailTab === 'ventas' ? 'ventas' :
              activeDetailTab === 'gastos' ? 'gastos' : 'servicios' }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:ml-auto sm:self-auto">
        <button v-if="activeDetailTab === 'gastos'" @click="expensesCtx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Registrar gasto</span><span class="sm:hidden">+ Gasto</span>
        </button>
        <button v-if="activeDetailTab === 'servicios'" @click="servicioModalRef?.open()"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">Nuevo servicio</span><span class="sm:hidden">+ Servicio</span>
        </button>
        <button v-if="canViewDetailTab" type="button"
          class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
          @click="goToDetailTab">
          Ver todos <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Contenido -->
    <div>
      <!-- Pestaña: Cobros de Citas -->
      <div v-if="activeDetailTab === 'cobros'">
        <div class="border-b border-border-subtle px-3 py-3 sm:px-4">
          <div class="relative">
            <input v-model="cobrosSearch" type="text" :placeholder="`Buscar por ${detailBusinessStore.terminology.client.toLowerCase()}, ${detailBusinessStore.terminology.employee.toLowerCase()} o ${detailBusinessStore.terminology.service.toLowerCase()}...`"
              class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15" />
            <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div v-if="filteredCobrosRows.length">
          <div :class="[gCobros, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
            <span :class="headClass">Fecha</span>
            <span :class="headClass">{{ detailBusinessStore.terminology.client }}<template v-if="isTienda"> · Código</template></span>
            <span :class="headClass">{{ detailBusinessStore.terminology.service }} · {{ detailBusinessStore.terminology.employee }}</span>
            <span :class="headClass">Método</span>
            <span :class="[headClass, 'text-right']">Monto</span>
            <span :class="[headClass, 'text-center']">Acción</span>
          </div>
          <ul class="divide-y divide-border-subtle">
            <li v-for="item in filteredCobrosRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="item.id" data-testid="cobro-row"
              :class="[gCobros, 'relative px-4 py-3 text-xs transition-colors hover:bg-bg-secondary/40']">
              <p class="whitespace-nowrap text-text-secondary">{{ item.date }}</p>
              <div class="min-w-0 pr-16 lg:pr-0">
                <p class="truncate text-sm font-medium text-text">{{ item.client }}</p>
                <p v-if="isTienda" class="font-mono text-[11px] text-text-secondary">Cód. {{ item.receiptCode || '—' }}</p>
                <p v-if="item.notes" class="truncate text-text-muted" :title="item.notes">{{ item.notes }}</p>
              </div>
              <div class="min-w-0 text-text-secondary">
                <p class="truncate">{{ item.service }}</p>
                <p class="truncate text-text-muted">{{ item.employee }}</p>
              </div>
              <p class="text-text-secondary">{{ item.breakdownLabel || item.method }}</p>
              <div class="whitespace-nowrap tabular-nums lg:text-right">
                <div class="font-semibold text-success">{{ item.primaryCurrency === 'VES' ?
                  formatVESEs(item.primaryAmount) : formatUSD(item.amount) }}</div>
                <div class="mt-0.5 text-[10px] text-text-muted">{{ item.primaryCurrency === 'VES' ?
                  formatUSD(item.amount) : formatSecondary(item.amount, item.exchangeRateUsed) }}</div>
                <span v-if="(item.tipAmount ?? 0) > 0" class="mt-0.5 inline-block text-[10px] font-semibold text-primary">+${{
                  (item.tipAmount ?? 0).toFixed(2) }} propina</span>
              </div>
              <div class="absolute right-2 top-2 flex items-center lg:static lg:justify-center">
                <button @click="summaryCtx.startEdit(item)"
                  :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value"
                  :class="iconBtn" title="Editar cita y cobro" aria-label="Editar cita y cobro">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="summaryCtx.confirmDeleteTransaction(item.id)"
                  :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value"
                  :class="[iconBtn, 'hover:!bg-danger/10 hover:!text-danger']" title="Eliminar cobro" aria-label="Eliminar cobro">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
            <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-sm text-text-muted">No hay cobros en este período</p>
        </div>
      </div>

      <!-- Pestaña: Ventas de Productos -->
      <div v-else-if="activeDetailTab === 'ventas'">
        <!-- Tienda: agrupadas por factura -->
        <template v-if="isTienda">
          <div v-if="allVentasInvoices.length">
            <div :class="[gVentasInv, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
              <span :class="headClass">Fecha</span>
              <span :class="headClass">Factura / Resumen · {{ detailBusinessStore.terminology.client }}</span>
              <span :class="[headClass, 'text-right']">Cant. Prod.</span>
              <span :class="headClass">Método</span>
              <span :class="[headClass, 'text-right']">Total</span>
              <span />
            </div>
            <ul class="divide-y divide-border-subtle">
              <li v-for="inv in allVentasInvoices.slice(0, canViewDetailTab ? 5 : Infinity)" :key="inv.id" data-testid="invoice-row">
                <div :class="[gVentasInv, 'relative cursor-pointer px-4 py-3 text-xs transition-colors hover:bg-bg-secondary/50']" @click="toggleInvoiceExpand(inv.id)">
                  <p class="whitespace-nowrap text-text-secondary">{{ inv.date }}</p>
                  <div class="min-w-0 pr-24 lg:pr-0">
                    <div class="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text">
                      <span class="font-semibold text-primary">Factura</span>
                      <span class="text-text-muted">({{ inv.items.length }} {{ inv.items.length === 1 ? 'producto' : 'productos' }})</span>
                      <svg :class="['h-3.5 w-3.5 text-text-muted transition-transform duration-200', expandedInvoiceIds.has(inv.id) ? 'rotate-180 text-primary' : '']"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p class="flex flex-wrap items-center gap-x-2 text-text-secondary">
                      <span class="font-medium">{{ inv.clientName || 'Venta directa' }}</span>
                      <span v-if="inv.employeeName" class="inline-flex items-center gap-1 font-medium text-primary">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {{ inv.employeeName }}
                      </span>
                    </p>
                  </div>
                  <p class="tabular-nums font-medium text-text lg:text-right"><span class="text-text-muted lg:hidden">Cant.: </span>{{ inv.totalQuantity }}</p>
                  <div class="text-text-secondary">
                    <span v-if="inv.paymentMethod === 'mixed'">
                      <span class="font-medium text-warning">Mixto</span>
                      <div v-if="inv.breakdown && inv.breakdown.length > 1" class="mt-0.5 text-[10px] text-text-muted">
                        <span v-for="(b, bi) in inv.breakdown" :key="bi">
                          {{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < inv.breakdown.length - 1"> / </span>
                        </span>
                      </div>
                    </span>
                    <span v-else>{{ formatMethod(inv.paymentMethod) }}</span>
                  </div>
                  <div class="whitespace-nowrap font-semibold tabular-nums text-info lg:text-right">
                    <div>{{ inv.currency === 'VES' ? formatVESEs(inv.originalAmount) : formatUSD(inv.total) }}</div>
                    <div class="mt-0.5 text-[10px] font-normal text-text-muted">{{ inv.currency === 'VES' ? formatUSD(inv.total) : formatSecondary(inv.total, inv.exchangeRateUsed) }}</div>
                  </div>
                  <div class="absolute right-2 top-2 flex items-center lg:static lg:justify-center">
                    <button @click.stop="toggleInvoiceExpand(inv.id)" :class="iconBtn" title="Ver detalle de factura" aria-label="Ver detalle de factura">
                      <svg :class="['h-4 w-4 transition-transform duration-200', expandedInvoiceIds.has(inv.id) ? 'rotate-180 text-primary' : '']" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button @click.stop="summaryCtx.startEdit(inv)"
                      :disabled="summaryCtx.editTransactionMutation.isPending.value || summaryCtx.deleteTransactionMutation.isPending.value"
                      :class="iconBtn" title="Opciones de factura" aria-label="Opciones de factura">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button @click.stop="summaryCtx.confirmDeleteTransaction(inv.id)"
                      :disabled="summaryCtx.deleteTransactionMutation.isPending.value"
                      :class="[iconBtn, 'hover:!bg-danger/10 hover:!text-danger']" title="Eliminar factura" aria-label="Eliminar factura">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Productos de la factura -->
                <div v-if="expandedInvoiceIds.has(inv.id)" class="space-y-2 border-t border-border-subtle bg-bg-secondary/40 px-4 py-3">
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2 text-xs font-semibold text-text-secondary">
                    <span class="flex flex-wrap items-center gap-1.5">
                      <svg class="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Factura · {{ detailBusinessStore.terminology.client }}: <strong class="text-text">{{ inv.clientName || 'Venta directa' }}</strong>
                      <span v-if="inv.employeeName" class="ml-2 font-normal text-text-muted">
                        (Vendido por: <strong class="font-medium text-primary">{{ inv.employeeName }}</strong>)
                      </span>
                    </span>
                    <span class="font-normal text-text-muted">{{ inv.items.length }} {{ inv.items.length === 1 ? 'ítem' : 'ítems' }}</span>
                  </div>
                  <div v-if="inv.paymentMethod === 'mixed' && inv.breakdown && inv.breakdown.length > 1" class="border-b border-border-subtle pb-2 text-xs text-text-secondary">
                    <span class="font-medium text-warning">Pago mixto:</span>
                    <span v-for="(b, bi) in inv.breakdown" :key="bi">
                      {{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < inv.breakdown.length - 1">, </span>
                    </span>
                  </div>
                  <div class="divide-y divide-border-subtle/50">
                    <div v-for="item in inv.items" :key="item.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-xs">
                      <div class="min-w-0 flex-1">
                        <span class="block truncate font-medium text-text">{{ item.product }}</span>
                        <span v-if="item.notes" class="text-[10px] text-text-muted">{{ item.notes }}</span>
                      </div>
                      <div class="flex shrink-0 flex-wrap items-center gap-x-4 tabular-nums text-text-secondary">
                        <span>Cant: <strong class="text-text">{{ item.quantity }}</strong></span>
                        <span>Precio unit: <strong class="text-text">{{ formatUSD(item.unitPrice) }}</strong></span>
                        <span>Subtotal: <strong class="font-semibold text-info">{{ formatUSD(item.total) }}</strong></span>
                        <button
                          @click="summaryCtx.handleDeleteProductSale(item.id, item.product)"
                          class="ml-2 flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                          title="Eliminar producto de factura" aria-label="Eliminar producto de factura"
                        >
                          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
              <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p class="text-sm text-text-muted">No hay ventas en este período</p>
          </div>
        </template>

        <!-- No tienda: filas de producto -->
        <template v-else>
          <div v-if="allVentasRows.length">
            <div :class="[gVentasRow, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
              <span :class="headClass">Fecha</span>
              <span :class="headClass">Producto · {{ detailBusinessStore.terminology.client }}</span>
              <span :class="[headClass, 'text-right']">Cant.</span>
              <span :class="[headClass, 'text-right']">Precio</span>
              <span :class="headClass">Método</span>
              <span :class="[headClass, 'text-right']">Total</span>
              <span />
            </div>
            <ul class="divide-y divide-border-subtle">
              <li v-for="row in allVentasRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="row.id" data-testid="venta-row"
                :class="[gVentasRow, 'relative px-4 py-3 text-xs transition-colors hover:bg-bg-secondary/40']">
                <p class="whitespace-nowrap text-text-secondary">{{ row.date }}</p>
                <div class="min-w-0 pr-10 lg:pr-0">
                  <p class="text-sm font-medium text-text">{{ row.product }}</p>
                  <p class="truncate text-text-secondary">{{ row.clientName || '—' }}</p>
                </div>
                <p class="tabular-nums text-text-secondary lg:text-right"><span class="text-text-muted lg:hidden">Cant.: </span>{{ row.quantity }}</p>
                <p class="whitespace-nowrap tabular-nums text-text-secondary lg:text-right"><span class="text-text-muted lg:hidden">Precio: </span>{{ formatUSD(row.unitPrice) }}</p>
                <div class="text-text-secondary">
                  <span v-if="row.paymentMethod === 'cash'">Efectivo ($)</span>
                  <span v-else-if="row.paymentMethod === 'cash_ves'">Efectivo (Bs)</span>
                  <span v-else-if="row.paymentMethod === 'card'">Tarjeta</span>
                  <span v-else-if="row.paymentMethod === 'transfer'">Transferencia</span>
                  <span v-else-if="row.paymentMethod === 'zelle'">Zelle</span>
                  <span v-else-if="row.paymentMethod === 'pago_movil'">Pago Móvil</span>
                  <span v-else-if="row.paymentMethod === 'punto_venta'">Punto de Venta (Bs)</span>
                  <span v-else-if="row.paymentMethod === 'mixed'">
                    <span class="font-medium text-warning">Mixto</span>
                    <div v-if="row.breakdown && row.breakdown.length > 1" class="mt-0.5 text-[10px] text-text-muted">
                      <span v-for="(b, bi) in row.breakdown" :key="bi">
                        {{ formatMethod(b.method) }} {{ b.currency === 'VES' ? b.inputAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + ' Bs' : '$' + b.inputAmount.toFixed(2) }}<span v-if="bi < row.breakdown.length - 1"> / </span>
                      </span>
                    </div>
                  </span>
                  <span v-else>{{ formatMethod(row.paymentMethod) }}</span>
                </div>
                <div class="whitespace-nowrap font-semibold tabular-nums text-info lg:text-right">
                  <div>{{ row.currency === 'VES' ? formatVESEs(row.originalAmount) : formatUSD(row.total) }}</div>
                  <div class="mt-0.5 text-[10px] font-normal text-text-muted">{{ row.currency === 'VES' ? formatUSD(row.total) :
                    formatSecondary(row.total, row.exchangeRateUsed) }}</div>
                </div>
                <div class="absolute right-2 top-2 flex items-center lg:static lg:justify-center">
                  <button @click="summaryCtx.handleDeleteProductSale(row.id, row.product)"
                    :class="[iconBtn, 'hover:!bg-danger/10 hover:!text-danger']" title="Eliminar venta" aria-label="Eliminar venta">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
              <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p class="text-sm text-text-muted">No hay ventas en este período</p>
          </div>
        </template>

        <div v-if="productSalesBreakdown.length" class="border-t border-border-subtle px-4 py-3">
          <p class="mb-1.5 text-xs font-medium text-text-secondary">Productos principales</p>
          <div class="space-y-1">
            <div v-for="(p, idx) in productSalesBreakdown.slice(0, 5)" :key="p.name"
              class="flex items-center justify-between text-xs">
              <span class="truncate text-text-secondary"><span class="font-medium text-text-muted">{{ idx + 1 }}.</span>
                {{ p.name }}</span>
              <span class="ml-2 shrink-0 font-medium tabular-nums text-info">
                <span>{{ formatUSD(p.amount) }}</span>
                <span class="ml-1 text-text-muted">{{ formatSecondary(p.amount) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pestaña: Servicios -->
      <div v-else-if="activeDetailTab === 'servicios'">
        <div class="scroll-thin flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border-subtle px-2 sm:px-3" role="tablist" aria-label="Categorías de servicios">
          <button v-for="cat in svcCategories" :key="cat.id" type="button" role="tab" :aria-selected="activeSvcCategory === cat.id" @click="activeSvcCategory = cat.id"
            class="relative shrink-0 whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-colors"
            :class="activeSvcCategory === cat.id ? 'text-primary' : 'text-text-secondary hover:text-text'">
            {{ cat.name }}
            <span v-if="activeSvcCategory === cat.id" class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
          </button>
        </div>
        <div v-if="filteredServicios.length === 0" class="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary">
            <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <p class="text-sm text-text-muted">No hay servicios en esta categoría</p>
        </div>
        <div v-else>
          <div :class="[gServicios, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
            <span :class="headClass">Nombre</span>
            <span :class="headClass">Categoría</span>
            <span :class="[headClass, 'text-right']">Precio</span>
            <span :class="[headClass, 'text-right']">Duración</span>
            <span :class="[headClass, 'text-center']">Estado</span>
            <span :class="[headClass, 'text-center']">Acción</span>
          </div>
          <ul class="divide-y divide-border-subtle">
            <li v-for="svc in filteredServicios" :key="svc.id" data-testid="svc-row"
              :class="[gServicios, 'group relative px-4 py-3 text-xs transition-colors hover:bg-bg-secondary/40']">
              <p class="pr-16 text-sm font-medium text-text md:pr-0">{{ svc.name }}</p>
              <div class="flex items-center gap-1.5 text-text-secondary">
                <span class="font-medium text-primary">{{ svc.category }}</span>
                <button @click="openRenameCategoryModal(svc.category)"
                  class="rounded p-0.5 text-text-muted transition-all hover:bg-primary/10 hover:text-primary"
                  title="Editar categoría" aria-label="Editar categoría">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button v-if="svcCategories.length > 2" @click="openDeleteCategoryModal(svc.category)"
                  class="rounded p-0.5 text-text-muted transition-all hover:bg-danger/10 hover:text-danger"
                  title="Eliminar categoría" aria-label="Eliminar categoría">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div class="md:text-right">
                <div class="font-semibold tabular-nums text-success">{{ formatUSD(svc.price) }}</div>
                <div class="text-[10px] text-text-muted">{{ formatSecondary(svc.price) }}</div>
              </div>
              <p class="text-text-secondary md:text-right">{{ svc.duration }} min</p>
              <div class="md:text-center">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-medium" :class="svc.status === 'Activo' ? 'text-success' : 'text-text-muted'">
                  <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>{{ svc.status }}
                </span>
              </div>
              <div class="absolute right-2 top-2 flex items-center md:static md:justify-center">
                <button @click="handleEditServicio(svc)" :class="iconBtn" title="Editar servicio" aria-label="Editar servicio">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="handleDeleteServicio(svc)" :class="[iconBtn, 'hover:!bg-danger/10 hover:!text-danger']" title="Eliminar servicio" aria-label="Eliminar servicio">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Pestaña: Gastos Operativos -->
      <div v-else>
        <div v-if="isLoadingExpenses" class="flex items-center justify-center gap-2 px-4 py-12 text-sm text-text-muted" aria-busy="true">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando gastos...
        </div>
        <div v-else-if="expensesError" class="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
            <svg class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p class="text-sm text-danger">{{ expensesError }}</p>
        </div>
        <div v-else-if="allGastosRows.length === 0" class="flex flex-col items-center justify-center px-4 py-12 text-center">
          <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary"><svg
              class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
            </svg></div>
          <p class="text-sm text-text-muted">No hay gastos en este período</p>
        </div>
        <div v-else>
          <div :class="[gGastos, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
            <span :class="headClass">Fecha</span>
            <span :class="headClass">Concepto</span>
            <span :class="headClass">Categoría</span>
            <span :class="[headClass, 'text-right']">Monto</span>
            <span :class="[headClass, 'text-center']">Acción</span>
          </div>
          <ul class="divide-y divide-border-subtle">
            <li v-for="expense in allGastosRows.slice(0, canViewDetailTab ? 5 : Infinity)" :key="expense.id" data-testid="gasto-row"
              :class="[gGastos, 'relative px-4 py-3 text-xs transition-colors hover:bg-bg-secondary/40']">
              <p class="whitespace-nowrap text-text-secondary">{{ expense.date }}</p>
              <p class="pr-16 text-sm font-medium text-text md:pr-0">{{ expense.name }}</p>
              <p class="text-[11px] font-medium" :class="expense.category === 'Fijos' ? 'text-info' : expense.category === 'Insumos' ? 'text-warning' : 'text-primary'">{{ expense.category }}</p>
              <div class="md:text-right">
                <div class="whitespace-nowrap font-medium tabular-nums text-text">{{ expense.currency === 'VES' ?
                  formatVESEs(expense.originalAmount) : formatUSD(expense.amount) }}</div>
                <div class="whitespace-nowrap text-[11px] tabular-nums text-text-muted">{{ expense.currency === 'VES' ?
                  formatUSD(expense.amount) : formatSecondary(expense.amount, expense.exchangeRateUsed) }}
                </div>
              </div>
              <div class="absolute right-2 top-2 flex items-center md:static md:justify-center">
                <button @click="expensesCtx.openEdit(expense)" :class="iconBtn" title="Editar gasto" aria-label="Editar gasto">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button @click="expensesCtx.handleDelete(expense.id)" :class="[iconBtn, 'hover:!bg-danger/10 hover:!text-danger']" title="Eliminar gasto" aria-label="Eliminar gasto">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
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
