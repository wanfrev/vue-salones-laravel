<template>
  <DirectoryHeader :title="businessStore.terminology.clientPlural || 'Clientes'" :total="totalClientes" :singular="singular" :plural="plural">
    <button
      class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
      @click="clienteModalRef?.open()"
    >
      <AddCircleIcon class="h-4 w-4" />
      <span>Nuevo<span class="hidden sm:inline"> {{ singular }}</span></span>
    </button>
  </DirectoryHeader>

  <!-- Una sola tarjeta: filtros arriba, lista en medio, paginación abajo. -->
  <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <ClientDirectoryToolbar
      v-model:search="search"
      v-model:segment="segment"
      v-model:window-days="windowDays"
      v-model:sort="sort"
      :counts="counts"
      :result-count="filteredClients.length"
      :total-count="totalClientes"
      :filtered="filtered"
      :placeholder="`Buscar ${singular}…`"
      @clear="clearFilters"
    />
    <ClientDirectoryList
      :clients="paginatedData"
      :third-column="isPatientNiche ? 'identity' : 'spend'"
      :can-edit="canEditClients"
      :open-label="isPatientNiche ? 'Abrir expediente' : 'Ver historial'"
      :empty-text="emptyText"
      @open="openClient"
      @edit="clienteModalRef?.open($event)"
      @whatsapp="handleWhatsApp"
    />
    <ListPagination
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-numbers="pageNumbers"
      :has-next="hasNextPage"
      :has-previous="hasPreviousPage"
      :start="paginationStart"
      :end="paginationEnd"
      :total="filteredClients.length"
      @goto="goToPage"
      @next="nextPage"
      @previous="previousPage"
    />
  </section>

  <ClienteFormModal
    ref="clienteModalRef"
    :is-saving="isSaving"
    @save="handleSaveCliente"
    @delete="handleDeleteCliente"
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
import { isPatientNiche as checkPatientNiche } from '../config/niches'
import { clientesKeys, deleteCliente, listClientes, saveCliente } from '../services/clientesService'
import { sanitizePhone } from '../lib/formatters'
import DirectoryHeader from '../components/common/DirectoryHeader.vue'
import ClientDirectoryToolbar from '../components/clients/ClientDirectoryToolbar.vue'
import ClientDirectoryList from '../components/clients/ClientDirectoryList.vue'
import ListPagination from '../components/common/ListPagination.vue'
import { ClienteFormModal } from '../components/modals'
import { AddCircleIcon } from '@solar-icons/vue/linear'

import type { Cliente, ClienteFormData } from '../types/cliente'

const router = useRouter()
const { info } = useNotification()
const { authStore } = useAuth()
const businessStore = useBusinessStore()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const clienteModalRef = ref<InstanceType<typeof ClienteFormModal> | null>(null)

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
  search,
  segment,
  windowDays,
  sort,
  filtered,
  filteredClients,
  counts,
  totalClientes,
  clearFilters,
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
} = useClientFilters(clients)

const singular = computed(() => (businessStore.terminology.client || 'cliente').toLowerCase())
const plural = computed(() => (businessStore.terminology.clientPlural || 'clientes').toLowerCase())
const isPatientNiche = computed(() => checkPatientNiche(businessStore.nicheType))
const canEditClients = computed(() =>
  authStore.role !== 'encargado' || businessStore.hasFeature('encargados_edit_clients')
)
const emptyText = computed(() =>
  filtered.value
    ? `No hay ${plural.value} que coincidan con la búsqueda o el filtro.`
    : `Todavía no hay ${plural.value} registrados.`
)

const openClient = (cliente: Cliente) => {
  router.push(`/admin/clientes/${cliente.id}`)
  info(`Mostrando historial de ${cliente.name}`)
}

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
