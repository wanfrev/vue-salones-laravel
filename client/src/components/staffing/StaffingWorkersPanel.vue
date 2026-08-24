<template>
  <div class="p-4">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xs text-text-muted">Trabajadores asignados a esta empresa.</p>
      <button type="button"
        class="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
        @click="openNew">
        <AddCircleIcon class="h-3.5 w-3.5" />
        Nuevo trabajador
      </button>
    </div>

    <div v-if="workers.length === 0" class="py-8 text-center text-sm text-text-muted">
      Sin trabajadores asignados todavía.
    </div>

    <div v-else class="divide-y divide-border-subtle rounded-xl border border-border-subtle">
      <div v-for="worker in workers" :key="worker.id"
        class="flex items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-text">{{ worker.name }}</p>
          <p class="truncate text-xs text-text-muted">
            {{ worker.role || 'Sin rol' }}
            <span v-if="worker.paymentMethod"> · {{ worker.paymentMethod === 'direct_deposit' ? 'Depósito directo' : 'Tarjeta' }}</span>
          </p>
        </div>
        <button type="button"
          class="shrink-0 rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
          title="Editar" @click="openEdit(worker)">
          <PenIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <EmpleadoFormModal :is-saving="isSaving" @save="handleSaveEmpleado" @delete="handleDeleteEmpleado" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCrud } from '../../composables/empleados/useCrud'
import { useBusinessStore } from '../../store/business'
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado } from '../../services/equipoService'
import { EmpleadoFormModal } from '../modals'
import { useModal } from '../../composables/common/useModal'
import type { Empleado, EmpleadoFormData } from '../../types/empleado'
import { AddCircleIcon, PenIcon } from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
  companyId: string
}>()

const businessId = computed(() => props.businessId)
const businessStore = useBusinessStore()
const branchId = computed(() => businessStore.currentBranchId)

// Same query key as Equipo.vue's own useCrud call — reads/writes share the cache, so saving a
// worker here also updates the (filtered-out, for this list) generic team list and vice versa.
const { items: team, handleSave: handleSaveEmpleado, handleDelete: handleDeleteEmpleado, isSaving } = useCrud<Empleado, EmpleadoFormData>({
  businessId, branchId,
  queryKey: (id, brId) => equipoKeys.all(id, brId),
  queryFn: (id, brId) => listEquipo(id, brId),
  saveFn: (id, data, brId) => saveEmpleado(data, id, brId),
  deleteFn: (id) => deleteEmpleado(id),
  entityName: 'Trabajador',
  // The Nómina roster (useTimesheets) reads assignments from its own query key — without this,
  // adding/editing a worker's company assignment here leaves it showing the stale roster.
  extraInvalidations: [
    (id) => ['staffing-company-employees', id],
  ],
})

const workers = computed(() =>
  team.value.filter(e => e.staffingAssignments?.some(a => a.companyId === props.companyId))
)

const modal = useModal('empleado-form-modal')
const openNew = () => modal.open({ workerMode: true, presetCompanyId: props.companyId })
const openEdit = (worker: Empleado) => modal.open({ empleado: worker })
</script>
