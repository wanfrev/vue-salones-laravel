<template>
  <header class="mb-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <UserIcon class="h-3.5 w-3.5" />
        {{ businessStore.terminology.client || 'Cliente' }}s
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="clienteModalRef?.open()"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
        >
          <AddCircleIcon class="h-4 w-4" />
          <span>Nuevo {{ label }}</span>
        </button>
      </div>
    </div>
  </header>

  <ClientStats
    :total-clientes="totalClientes"
    :clientes-recientes="clientesRecientes"
    :clientes-con-historial="clientesConHistorial"
    :clientes-sin-visitar="clientesSinVisitar"
    :days-since-visit-filter="daysSinceVisitFilter"
  />

  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="relative flex-1 max-w-md">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nombre, código, teléfono o email..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <MagnifierIcon class="h-4 w-4" />
      </div>
    </div>
    <div class="flex gap-2">
      <button
        @click="openFilterDrawer"
        class="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong"
      >
        <FilterIcon class="h-4 w-4" />
        Filtros
      </button>
    </div>
  </div>

  <!-- Mobile: Client Cards -->
  <div class="lg:hidden space-y-3 mb-4">
    <div
      v-for="client in paginatedData"
      :key="client.id"
      class="rounded-xl border border-border bg-surface p-4 transition-theme"
      @click="handleViewAgenda(client)"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {{ getInitials(client.name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <p class="font-semibold text-text truncate">{{ client.name }}</p>
            <span v-if="client.code" class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10">{{ client.code }}</span>
          </div>
          <p class="text-xs text-text-muted">{{ client.phone }}</p>
          <p class="text-xs text-text-muted">Última visita: {{ lastVisitLabel(client) }}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-bold tabular-nums text-text">${{ client.totalSpent }}</p>
          <p class="text-xs text-text-muted">{{ client.totalAppointments }} {{ (businessStore.terminology.appointment || 'cita').toLowerCase() }}s</p>
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button
          @click.stop="clienteModalRef?.open(client)"
          class="flex-1 rounded-lg border border-border py-2.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
        >
          Editar
        </button>
        <button
          @click.stop="handleWhatsApp(client)"
          class="flex-1 rounded-lg border border-border py-2.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
        >
          WhatsApp
        </button>
      </div>
    </div>
    <div v-if="filteredClients.length === 0" class="py-12 text-center">
      <p class="text-sm text-text-muted">No se encontraron clientes.</p>
    </div>
  </div>

  <!-- Desktop: Client Table -->
  <div class="hidden lg:block overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">{{ businessStore.terminology.client || 'Cliente' }}</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Contacto</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Última visita</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">{{ businessStore.terminology.appointment || 'Cita' }}s</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Gasto</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in paginatedData" :key="client.id" class="cursor-pointer border-b border-border-subtle last:border-b-0 transition-theme hover:bg-bg-secondary" @click="handleViewAgenda(client)">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {{ getInitials(client.name) }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm font-medium text-text truncate">{{ client.name }}</p>
                    <span v-if="client.code" class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10">{{ client.code }}</span>
                  </div>
                  <p class="text-xs text-text-muted">Desde {{ client.joinDate ? formatDateHuman(client.joinDate) : '—' }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="text-xs text-text-secondary">{{ client.phone }}</div>
              <div v-if="client.email" class="text-xs text-text-muted truncate max-w-40">{{ client.email }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs text-text-secondary">{{ lastVisitLabel(client) }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm font-medium tabular-nums text-text">{{ client.totalAppointments }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm font-medium tabular-nums text-text">${{ client.totalSpent }}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-0.5">
                <button
                  @click.stop="clienteModalRef?.open(client)"
                  class="rounded-md p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                  :title="`Editar ${label}`"
                >
                  <PenIcon class="h-4 w-4" />
                </button>
                <button
                  @click.stop="handleWhatsApp(client)"
                  class="rounded-md p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-success"
                  title="Escribir por WhatsApp"
                >
                  <CheckCircleIcon class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

    <div class="flex items-center justify-between rounded-lg border border-border bg-surface px-3 sm:px-4 py-2.5">
      <div class="text-xs sm:text-sm text-text-muted">
        {{ paginationStart }}-{{ paginationEnd }} de {{ filteredClients.length }}
      </div>
      <!-- Desktop: full pagination -->
      <div class="hidden sm:flex gap-1">
        <button
          @click="previousPage"
          :disabled="!hasPreviousPage"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
          :class="hasPreviousPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
        >
          Anterior
        </button>
        <button
          v-for="page in pageNumbers"
          :key="page"
          @click="page === '...' ? null : goToPage(page as number)"
          :disabled="page === '...'"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
          :class="page === currentPage ? 'bg-primary text-text-inverse' : 'text-text-secondary hover:bg-bg-secondary disabled:cursor-default'"
        >
          {{ page }}
        </button>
        <button
          @click="nextPage"
          :disabled="!hasNextPage"
          class="rounded-md px-2.5 py-1.5 text-sm font-medium transition-theme"
          :class="hasNextPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
        >
          Siguiente
        </button>
      </div>
      <!-- Mobile: compact arrows + page indicator -->
      <div class="flex sm:hidden items-center gap-1">
        <button
          @click="previousPage"
          :disabled="!hasPreviousPage"
          class="rounded-md p-1.5 transition-theme"
          :class="hasPreviousPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
        >
          <ArrowLeftIcon class="h-4 w-4" />
        </button>
        <span class="text-xs font-medium text-text px-1">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="nextPage"
          :disabled="!hasNextPage"
          class="rounded-md p-1.5 transition-theme"
          :class="hasNextPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
        >
          <ArrowRightIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

  <ClienteFormModal
    ref="clienteModalRef"
    :is-saving="isSaving"
    @save="handleSaveCliente"
    @delete="handleDeleteCliente"
  />

  <FilterDrawer
    ref="filterDrawerRef"
    :show-date-filter="false"
    :show-days-since-filter="true"
    @apply="handleApplyFilters"
    @clear="handleClearFilters"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCrud } from '../composables/empleados/useCrud'
import { useClientFilters } from '../composables/common/useClientFilters'
import { useAuth } from '../composables/common/useAuth'
import { useNotification } from '../composables/common/useNotification'
import { useBusinessStore } from '../store/business'
import { clientesKeys, deleteCliente, listClientes, saveCliente } from '../services/clientesService'
import { getInitials, sanitizePhone, formatDateHuman } from '../lib/formatters'
import ClientStats from '../components/clients/ClientStats.vue'
import { ClienteFormModal } from '../components/modals'
import { FilterDrawer } from '../components/filters'
import { UserIcon, AddCircleIcon, MagnifierIcon, FilterIcon, PenIcon, CheckCircleIcon, ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'

import type { Cliente, ClienteFormData } from '../types/cliente'

const router = useRouter()
const { authStore } = useAuth()
const businessStore = useBusinessStore()
const { info } = useNotification()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const clienteModalRef = ref<InstanceType<typeof ClienteFormModal> | null>(null)
const filterDrawerRef = ref<InstanceType<typeof FilterDrawer> | null>(null)

const {
  items: clients,
  handleSave: handleSaveCliente,
  handleDelete: handleDeleteCliente,
  isSaving,
} = useCrud<Cliente, ClienteFormData>({
  businessId,
  branchId,
  queryKey: (id, brId) => clientesKeys.all(id, brId),
  queryFn: (id, brId) => listClientes(id, brId),
  saveFn: (id, data, brId) => saveCliente(id, data, brId),
  deleteFn: (id) => deleteCliente(id),
  entityName: 'Cliente',
  modalRef: clienteModalRef,
  extraInvalidations: [
    () => ['appointments'],
  ],
})

const {
  searchQuery,
  daysSinceVisitFilter,
  filteredClients,
  totalClientes,
  clientesRecientes,
  clientesSinVisitar,
  clientesConHistorial,
  currentPage,
  paginatedData,
  pageNumbers,
  hasNextPage,
  hasPreviousPage,
  goToPage,
  nextPage,
  previousPage,
  paginationStart,
  paginationEnd,
  totalPages,
  handleApplyFilters,
  handleClearFilters,
  getFilterDrawerDefaults,
} = useClientFilters(clients)

const label = computed(() => (businessStore.terminology.client || 'cliente').toLowerCase())

const handleViewAgenda = (cliente: Cliente) => {
  router.push(`/admin/clientes/${cliente.id}`)
  info(`Mostrando historial de ${cliente.name}`)
}

const openFilterDrawer = () => {
  filterDrawerRef.value?.setFilters(getFilterDrawerDefaults())
  filterDrawerRef.value?.open()
}

const lastVisitLabel = (client: Cliente) =>
  client.lastVisit && client.lastVisit !== 'Sin visitas' ? formatDateHuman(client.lastVisit) : 'Sin visitas'

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
