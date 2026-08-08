<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-text">Requerimientos</h1>
        <p class="text-sm text-text-muted mt-1">
          Gestiona los productos faltantes o fallas en el inventario.
        </p>
      </div>
      <button
        @click="openModal()"
        class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-theme hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Requerimiento
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2 border-b border-border pb-3">
      <button
        v-for="f in ['all', 'pending', 'purchased', 'cancelled']"
        :key="f"
        @click="filter = f"
        class="rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all border"
        :class="filter === f
          ? 'border-primary bg-primary text-white shadow-sm'
          : 'border-border bg-bg-secondary text-text hover:border-border-strong hover:bg-bg-secondary/80'"
      >
        {{ filterLabel(f) }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="requirementsQuery.isLoading.value" class="py-12 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
    </div>
    <div v-else-if="requirementsQuery.isError.value" class="py-12 text-center text-danger">
      <p>Error al cargar los requerimientos.</p>
    </div>
    <div v-else-if="filteredRequirements.length === 0" class="py-12 text-center text-text-muted">
      <svg class="mx-auto h-12 w-12 text-border-strong mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p>No hay requerimientos registrados.</p>
    </div>
    
    <div v-else class="rounded-xl border border-border bg-bg-primary shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-border">
        <thead class="bg-bg-secondary">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Producto</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Cantidad / Marcas</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Precio Guía</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Estado</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Creado por</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border bg-bg-primary">
          <tr v-for="req in filteredRequirements" :key="req.id" class="transition-colors hover:bg-bg-secondary/50">
            <td class="px-4 py-3">
              <p class="font-medium text-text">{{ req.name }}</p>
              <p class="text-xs text-text-muted">{{ formatDate(req.created_at) }}</p>
            </td>
            <td class="px-4 py-3 text-sm">
              <p class="text-text"><span class="font-medium text-text-secondary">Cant:</span> {{ req.recommended_quantity }}</p>
              <p v-if="req.recommended_brands" class="text-xs text-text-muted mt-0.5"><span class="font-medium">Marcas:</span> {{ req.recommended_brands }}</p>
            </td>
            <td class="px-4 py-3 text-sm text-text">
              {{ req.guide_price ? formatCurrency(req.guide_price) : '-' }}
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusColor(req.status)">
                {{ statusLabel(req.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-text-muted">
              {{ req.creator ? req.creator.full_name : '-' }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="req.status === 'pending'"
                  @click="updateStatus(req.id, 'purchased')"
                  class="rounded-lg p-1.5 text-success hover:bg-success/10 transition-theme"
                  title="Marcar como comprado"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  @click="openModal(req)"
                  class="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text transition-theme"
                  title="Editar"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(req.id)"
                  class="rounded-lg p-1.5 text-danger hover:bg-danger/10 transition-theme"
                  title="Eliminar"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <RequirementFormModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModal } from '../composables/common/useModal'
import { useRequirements } from '../composables/inventory/useRequirements'
import { useBusinessStore } from '../store/business'
import type { Requirement } from '../types/database'
import RequirementFormModal from '../components/inventory/RequirementFormModal.vue'

const { requirementsQuery, updateRequirementStatus, deleteRequirement } = useRequirements()
const businessStore = useBusinessStore()

const filter = ref('all')

const filteredRequirements = computed(() => {
  const all = requirementsQuery.data.value || []
  if (filter.value === 'all') return all
  return all.filter((r: Requirement) => r.status === filter.value)
})

const openModal = (requirement?: Requirement) => {
  useModal('requirement-form-modal').open({ requirement })
}

const updateStatus = async (id: string, status: Requirement['status']) => {
  await updateRequirementStatus.mutateAsync({ id, status })
}

const handleDelete = async (id: string) => {
  if (window.confirm('¿Estás seguro de eliminar este requerimiento?')) {
    await deleteRequirement.mutateAsync(id)
  }
}

const filterLabel = (f: string) => {
  const map: Record<string, string> = {
    all: 'Todos',
    pending: 'Pendientes',
    purchased: 'Comprados',
    cancelled: 'Cancelados'
  }
  return map[f] || f
}

const statusLabel = (s: string) => filterLabel(s)

const statusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-warning/20 text-warning border border-warning/30 font-semibold'
    case 'purchased': return 'bg-success/20 text-success border border-success/30 font-semibold'
    case 'cancelled': return 'bg-danger/20 text-danger border border-danger/30 font-semibold'
    default: return 'bg-bg-secondary text-text border border-border font-semibold'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: businessStore.business?.currency || 'USD' }).format(amount)
}
</script>
