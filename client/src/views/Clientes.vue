<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div class="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10"><UserIcon class="h-3.5 w-3.5" /></span>
        Directorio clínico
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-text sm:text-3xl">{{ businessStore.terminology.clientPlural || 'Pacientes' }}</h1>
      <p class="mt-1 max-w-xl text-sm text-text-muted">Consulta perfiles, antecedentes y actividad de atención desde un solo lugar.</p>
    </div>
    <button @click="clienteModalRef?.open()" class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover">
      <AddCircleIcon class="h-4 w-4" />
      <span>Nuevo {{ label }}</span>
    </button>
  </header>

  <ClientStats
    :total-clientes="totalClientes"
    :clientes-recientes="clientesRecientes"
    :clientes-con-historial="clientesConHistorial"
    :clientes-sin-visitar="clientesSinVisitar"
    :days-since-visit-filter="daysSinceVisitFilter"
    :terminology="businessStore.terminology"
  />

  <section class="mb-5 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative min-w-0 flex-1 lg:max-w-xl">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="`Buscar ${label} por nombre, documento o teléfono...`"
        class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-10 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
      />
      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        <MagnifierIcon class="h-4 w-4" />
      </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-text-muted"><span class="font-semibold text-text">{{ filteredClients.length }}</span> registros encontrados</p>
      <button
        @click="openFilterDrawer"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      >
        <FilterIcon class="h-4 w-4" />
        Filtros
      </button>
      </div>
    </div>
  </section>

  <!-- Mobile: Patient Cards -->
  <div class="mb-5 space-y-3 lg:hidden">
    <div
      v-for="client in paginatedData"
      :key="client.id"
      class="group rounded-2xl border border-border bg-surface p-4 shadow-sm transition-theme hover:border-primary/30 hover:shadow-md"
      @click="handleViewAgenda(client)"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/10">
          {{ getInitials(client.name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-semibold text-text">{{ client.name }}</p>
              <p class="mt-0.5 text-[11px] text-text-muted">{{ client.documentId || client.code || 'Sin documento registrado' }}</p>
            </div>
            <span v-if="client.code" class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10">{{ client.code }}</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>{{ client.phone || 'Sin teléfono' }}</span>
            <span>{{ client.totalAppointments || 0 }} {{ (businessStore.terminology.appointmentPlural || 'consultas').toLowerCase() }}</span>
          </div>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
        <span class="text-xs text-text-muted">Última {{ (businessStore.terminology.appointment || 'consulta').toLowerCase() }}: {{ lastVisitLabel(client) }}</span>
        <button
          @click.stop="handleViewAgenda(client)"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/15"
        >
          Abrir expediente
        </button>
      </div>
    </div>
    <div v-if="filteredClients.length === 0" class="py-12 text-center">
       <p class="text-sm text-text-muted">No se encontraron {{ (businessStore.terminology.clientPlural || 'Clientes').toLowerCase() }}.</p>
    </div>
  </div>

  <!-- Desktop: Patient Table -->
  <div class="hidden lg:block">
    <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="border-b border-border bg-bg-secondary/30 px-5 py-3">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Expedientes registrados</p>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-bg-secondary/20">
            <th class="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">{{ businessStore.terminology.client || 'Paciente' }}</th>
            <th class="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Contacto</th>
            <th class="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Actividad clínica</th>
            <th class="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">Identificación</th>
            <th class="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in paginatedData" :key="client.id" class="cursor-pointer border-b border-border-subtle last:border-b-0 transition-theme hover:bg-primary/5" @click="handleViewAgenda(client)">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/10">
                  {{ getInitials(client.name) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-text">{{ client.name }}</p>
                  <p class="mt-0.5 text-xs text-text-muted">Paciente desde {{ client.joinDate ? formatDateHuman(client.joinDate) : '—' }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-4">
              <div class="text-xs font-medium text-text-secondary">{{ client.phone || 'Sin teléfono' }}</div>
              <div v-if="client.email" class="mt-0.5 max-w-48 truncate text-xs text-text-muted">{{ client.email }}</div>
            </td>
            <td class="px-5 py-4">
              <div class="text-xs font-medium text-text-secondary">{{ lastVisitLabel(client) }}</div>
              <div class="mt-0.5 text-xs text-text-muted">{{ client.totalAppointments || 0 }} {{ (businessStore.terminology.appointmentPlural || 'consultas').toLowerCase() }}</div>
            </td>
            <td class="px-5 py-4">
              <div class="text-xs font-medium text-text-secondary">{{ client.documentId || client.code || 'Sin documento' }}</div>
              <div v-if="isDentalNiche && client.medicalInsurance" class="mt-0.5 max-w-40 truncate text-xs text-text-muted">{{ client.medicalInsurance }}</div>
            </td>
            <td class="px-5 py-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button @click.stop="handleViewAgenda(client)" class="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/15">Abrir expediente</button>
                <button
                  @click.stop="clienteModalRef?.open(client)"
                  class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                  :title="`Editar ${label}`"
                >
                  <PenIcon class="h-4 w-4" />
                </button>
                <button
                  @click.stop="handleWhatsApp(client)"
                  class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-success"
                  title="Escribir por WhatsApp"
                >
                  <ChatRoundLineIcon class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
    :entity-label="(businessStore.terminology.clientPlural || 'Clientes').toLowerCase()"
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
import { isDentalNiche as checkDentalNiche } from '../config/niches'
import { clientesKeys, deleteCliente, listClientes, saveCliente } from '../services/clientesService'
import { getInitials, sanitizePhone, formatDateHuman } from '../lib/formatters'
import ClientStats from '../components/clients/ClientStats.vue'
import { ClienteFormModal } from '../components/modals'
import { FilterDrawer } from '../components/filters'
import { UserIcon, AddCircleIcon, MagnifierIcon, FilterIcon, PenIcon, ChatRoundLineIcon, ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/vue/linear'

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
const isDentalNiche = computed(() => checkDentalNiche(businessStore.nicheType))

const handleViewAgenda = (cliente: Cliente) => {
  router.push(`/admin/clientes/${cliente.id}`)
  info(`Mostrando historial de ${cliente.name}`)
}

const openFilterDrawer = () => {
  filterDrawerRef.value?.setFilters(getFilterDrawerDefaults())
  filterDrawerRef.value?.open()
}

const lastVisitLabel = (client: Cliente) =>
  client.lastVisit && client.lastVisit !== 'Sin visitas'
    ? formatDateHuman(client.lastVisit)
    : `Sin ${(businessStore.terminology.appointmentPlural || 'citas').toLowerCase()}`

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
