<template>
  <AppLayout>
    <div class="space-y-4">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {{ t.client || 'Cliente' }}s
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">
            {{ totalClientes }} {{ totalClientes === 1 ? label : label + 's' }}
          </h1>
        </div>
        <button
          v-if="canCreateClients"
          @click="openNewClientModal"
          class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo {{ t.client || 'Cliente' }}
        </button>
      </header>

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

      <div class="overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t.client || 'Cliente' }}</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Contacto</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Última visita</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t.appointment || 'Cita' }}s</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Gasto</th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in paginatedData" :key="client.id" class="cursor-pointer border-b border-border-subtle last:border-b-0 transition-theme hover:bg-bg-secondary" @click="handleViewClient(client)">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {{ getInitials(client.name) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-text truncate">{{ client.name }}</p>
                      <p class="text-xs text-text-muted">Desde {{ client.joinDate }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-xs text-text-secondary">{{ client.phone }}</div>
                  <div v-if="client.email" class="text-xs text-text-muted truncate max-w-40">{{ client.email }}</div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-text-secondary">{{ client.lastVisit }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium tabular-nums text-text">{{ client.totalAppointments }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium tabular-nums text-text">${{ client.totalSpent }}</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    @click.stop="handleWhatsApp(client)"
                    class="rounded-md p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-success"
                    title="Escribir por WhatsApp"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7 10l2 2 7-7M12 21a9 9 0 10-9-9c0 1.6.42 3.1 1.16 4.4L3 21l4.7-1.16A8.94 8.94 0 0012 21z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between border-t border-border px-3 sm:px-4 py-2.5">
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
      </div>
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
import { getInitials, sanitizePhone } from '../../lib/formatters'
import AppLayout from '../../components/layout/AppLayout.vue'
import ClienteFormModal from '../../components/modals/ClienteFormModal.vue'
import type { Cliente } from '../../types/cliente'
import type { ClienteFormData } from '../../types/cliente'

const router = useRouter()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)
const t = computed(() => businessStore.terminology)
const label = computed(() => (t.value.client || 'cliente').toLowerCase())

const { data: clientesData } = useQuery({
  queryKey: computed(() => clientesKeys.all(businessId.value, branchId.value)),
  queryFn: () => listClientes(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})
const clients = computed<Cliente[]>(() => clientesData.value ?? [])

const {
  searchQuery,
  filteredClients,
  totalClientes,
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

const handleViewClient = (cliente: Cliente) => {
  router.push(`/dashboard/clientes/${cliente.id}`)
}

const handleWhatsApp = (cliente: Cliente) => {
  const phone = sanitizePhone(cliente.phone)
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}

const canCreateClients = computed(() =>
  businessStore.hasFeature('employees_create_clients')
)

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
