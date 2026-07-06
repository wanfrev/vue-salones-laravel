<template>
  <header class="mb-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {{ businessStore.terminology.client || 'Cliente' }}s
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">
          {{ totalClientes }} {{ totalClientes === 1 ? label : label + 's' }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="clienteModalRef?.open()"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
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
        placeholder="Buscar por nombre, teléfono o email..."
        class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
    <div class="flex gap-2">
      <button
        @click="openFilterDrawer"
        class="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:border-border-strong"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
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
          <p class="font-semibold text-text truncate">{{ client.name }}</p>
          <p class="text-xs text-text-muted">{{ client.phone }}</p>
          <p class="text-xs text-text-muted">Última visita: {{ client.lastVisit }}</p>
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
                  <p class="text-sm font-medium text-text truncate">{{ client.name }}</p>
                  <p class="text-xs text-slate-400">Desde {{ client.joinDate }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="text-xs text-slate-500">{{ client.phone }}</div>
              <div v-if="client.email" class="text-xs text-slate-400 truncate max-w-40">{{ client.email }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs text-slate-500">{{ client.lastVisit }}</span>
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
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click.stop="handleWhatsApp(client)"
                  class="rounded-md p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-success"
                  title="Escribir por WhatsApp"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 10l2 2 7-7M12 21a9 9 0 10-9-9c0 1.6.42 3.1 1.16 4.4L3 21l4.7-1.16A8.94 8.94 0 0012 21z" />
                  </svg>
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
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span class="text-xs font-medium text-text px-1">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="nextPage"
          :disabled="!hasNextPage"
          class="rounded-md p-1.5 transition-theme"
          :class="hasNextPage ? 'text-text-secondary hover:bg-bg-secondary' : 'text-text-muted cursor-not-allowed opacity-40'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
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
import { useCrud } from '../composables/useCrud'
import { useClientFilters } from '../composables/useClientFilters'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '../composables/useNotification'
import { useBusinessStore } from '../store/business'
import { clientesKeys, deleteCliente, listClientes, saveCliente } from '../services/clientesService'
import { getInitials, sanitizePhone } from '../lib/formatters'
import ClientStats from '../components/clientes/ClientStats.vue'
import { ClienteFormModal } from '../components/modals'
import { FilterDrawer } from '../components/filters'

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

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
