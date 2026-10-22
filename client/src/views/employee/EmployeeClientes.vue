<template>
  <AppLayout>
    <div>
      <ClientDirectoryHeader :total="totalClientes">
        <button
          v-if="canCreateClients"
          class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
          @click="openNewClientModal"
        >
          <AddCircleIcon class="h-4 w-4" />
          <span>Nuevo<span class="hidden sm:inline"> {{ singular }}</span></span>
        </button>
      </ClientDirectoryHeader>

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
          :hide-phone="hidePhoneFromEmployee"
          :clinical-actions="clinicalActions"
          :has-attachments="businessStore.hasCapability('clinical.attachments')"
          :empty-text="emptyText"
          @open="handleViewClient"
          @whatsapp="handleWhatsApp"
          @clinical="openClinical"
        />
        <ClientPagination
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
    </div>
    <ClienteFormModal
      ref="newClientModalRef"
      @save="handleSaveCliente"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useClientFilters } from '../../composables/common/useClientFilters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { clientesKeys, listClientes, saveCliente } from '../../services/clientesService'
import { sanitizePhone } from '../../lib/formatters'
import { isClinicalNiche } from '../../config/niches'
import { useClinicalAccess } from '../../composables/clinical/useClinicalToolsNavTabs'
import AppLayout from '../../components/layout/AppLayout.vue'
import ClienteFormModal from '../../components/modals/ClienteFormModal.vue'
import ClientDirectoryHeader from '../../components/clients/ClientDirectoryHeader.vue'
import ClientDirectoryToolbar from '../../components/clients/ClientDirectoryToolbar.vue'
import ClientDirectoryList from '../../components/clients/ClientDirectoryList.vue'
import ClientPagination from '../../components/clients/ClientPagination.vue'
import type { Cliente } from '../../types/cliente'
import type { ClienteFormData } from '../../types/cliente'
import { AddCircleIcon } from '@solar-icons/vue/linear'

const router = useRouter()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const t = computed(() => businessStore.terminology)
const singular = computed(() => (t.value.client || 'cliente').toLowerCase())
const plural = computed(() => (t.value.clientPlural || 'clientes').toLowerCase())
const isEmployee = computed(() => authStore.role === 'empleado')
const canCreateClients = computed(() => {
  if (!isEmployee.value) return true
  const profileCanCreate = authStore.profile?.can_create_clients ?? true
  const businessCanCreate = businessStore.hasFeature('employees_create_clients')
  return profileCanCreate && businessCanCreate
})
const hidePhoneFromEmployee = computed(() =>
  isEmployee.value && businessStore.hasFeature('hide_client_phone_from_employees') && !canCreateClients.value
)

const { data: clientesData } = useQuery({
  queryKey: computed(() => clientesKeys.all(businessId.value, branchId.value)),
  queryFn: () => listClientes(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})
const clients = computed<Cliente[]>(() => clientesData.value ?? [])

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

const emptyText = computed(() =>
  filtered.value
    ? `No hay ${plural.value} que coincidan con la búsqueda o el filtro.`
    : `Todavía no hay ${plural.value} registrados.`
)

const handleViewClient = (cliente: Cliente) => {
  router.push(`/dashboard/clientes/${cliente.id}`)
}

// Expediente clínico (nicho psicología): solo para quien tiene el permiso, igual que en el servidor.
const hasClinicalAccess = useClinicalAccess()
const clinicalActions = computed(() => isClinicalNiche(businessStore.nicheType) && hasClinicalAccess.value)
const openClinical = (cliente: Cliente, tab: 'historia' | 'adjuntos') => {
  router.push(`/dashboard/clientes/${cliente.id}/expediente-clinico/${tab}`)
}

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}

const newClientModalRef = ref<InstanceType<typeof ClienteFormModal> | null>(null)

const openNewClientModal = () => {
  newClientModalRef.value?.open(undefined as any)
}

const handleSaveCliente = async (data: ClienteFormData & { id?: string }) => {
  try {
    await saveCliente(businessId.value!, data, branchId.value)
    queryClient.invalidateQueries({ queryKey: clientesKeys.all(businessId.value, branchId.value), exact: false })
    newClientModalRef.value?.close?.()
  } catch (err) {
    console.error('[EmployeeClientes] Error saving:', err)
  }
}
</script>
