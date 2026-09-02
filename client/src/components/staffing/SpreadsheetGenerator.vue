<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-[220px] max-w-sm flex-1">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="spreadsheet-company">
          Empresa
        </label>
        <FormSearchSelect
          id="spreadsheet-company"
          v-model="selectedCompanyId"
          :options="companyOptions"
          placeholder="Selecciona una empresa"
          search-placeholder="Buscar empresa..."
        />
      </div>
      <button v-if="isAdmin && selectedCompanyId" type="button"
        class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
        @click="openNewEmployee">
        + Agregar empleado
      </button>
    </div>

    <div v-if="!selectedCompanyId" class="py-8 text-center text-sm text-text-muted">
      Selecciona una empresa para ver sus empleados.
    </div>

    <div v-else-if="ratesQuery.isLoading.value" class="py-8 text-center text-sm text-text-muted">
      Cargando empleados...
    </div>

    <p v-else-if="rates.length === 0" class="py-8 text-center text-sm text-text-muted">
      Esta empresa no tiene empleados asignados todavía.
    </p>

    <div v-else class="space-y-3">
      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
                <th class="px-3 py-2.5 w-10"></th>
                <th class="px-3 py-2.5">Empleado</th>
                <th class="px-3 py-2.5">Rol / Turno</th>
                <th class="px-3 py-2.5 text-right">Pay rate</th>
                <th class="px-3 py-2.5 text-right">Pay rate OT</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="row in rates" :key="row.employeeId">
                <td class="px-3 py-2.5">
                  <label class="inline-flex h-5 w-5 cursor-pointer items-center justify-center">
                    <input type="checkbox" :value="row.employeeId" v-model="selectedEmployeeIds" class="peer sr-only" />
                    <span
                      :class="[
                        'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-theme peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-1',
                        selectedEmployeeIds.includes(row.employeeId)
                          ? 'border-primary bg-primary'
                          : 'border-border bg-surface hover:border-primary/50'
                      ]"
                    >
                      <svg v-if="selectedEmployeeIds.includes(row.employeeId)" viewBox="0 0 16 16" class="h-3 w-3 text-text-inverse" fill="none">
                        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                  </label>
                </td>
                <td class="px-3 py-2.5 font-medium text-text">{{ row.name }}</td>
                <td class="px-3 py-2.5 text-text-secondary">{{ [row.role, shiftLabel(row.shift)].filter(Boolean).join(' · ') }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-text">{{ row.payRate !== null ? formatUSD(row.payRate) : '—' }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-text-secondary">{{ row.overtimePayRate !== null ? formatUSD(row.overtimePayRate) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="selectedEmployeeIds.length === 0"
          @click="handleGeneratePdf"
        >
          Generar PDF ({{ selectedEmployeeIds.length }})
        </button>
      </div>
    </div>

    <EmpleadoFormModal ref="empleadoModalRef" :is-saving="isSavingEmployee" @save="handleSaveEmpleado" @delete="handleDeleteEmpleado" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { FormSearchSelect } from '../forms'
import { useCurrency } from '../../composables/common/useCurrency'
import { useAuth } from '../../composables/common/useAuth'
import { useBusinessStore } from '../../store/business'
import { isAdminPanelRole } from '../../constants/roles'
import {
  getSpreadsheetCompanyRates, listSpreadsheetCompanies, staffingSpreadsheetKeys,
} from '../../services/staffing/staffingSpreadsheetService'
import { printStaffingSpreadsheet } from '../../lib/staffingSpreadsheetPrint'
import { SHIFT_OPTIONS } from '../../services/staffing/staffingService'
import { EmpleadoFormModal } from '../modals'
import { useModal } from '../../composables/common/useModal'
import { useCrud } from '../../composables/empleados/useCrud'
import { deleteEmpleado, equipoKeys, listEquipo, saveEmpleado } from '../../services/equipoService'
import type { Empleado, EmpleadoFormData } from '../../types/empleado'

const props = defineProps<{ businessId: string | null }>()

const businessStore = useBusinessStore()
const { authStore } = useAuth()
const { formatUSD } = useCurrency()

const isAdmin = computed(() => isAdminPanelRole(authStore.role ?? undefined))

const selectedCompanyId = ref<string | null>(null)
const selectedEmployeeIds = ref<string[]>([])

const shiftLabel = (shift: string | null): string =>
  shift ? (SHIFT_OPTIONS.find(o => o.value === shift)?.label ?? shift) : ''

const { data: companies } = useQuery({
  queryKey: computed(() => staffingSpreadsheetKeys.companies(props.businessId)),
  queryFn: () => listSpreadsheetCompanies(),
  enabled: computed(() => !!props.businessId),
})

const companyOptions = computed(() => (companies.value ?? []).map(c => ({ value: c.id, label: c.name })))

const ratesQuery = useQuery({
  queryKey: computed(() => staffingSpreadsheetKeys.rates(props.businessId, selectedCompanyId.value)),
  queryFn: () => getSpreadsheetCompanyRates(selectedCompanyId.value!),
  enabled: computed(() => !!props.businessId && !!selectedCompanyId.value),
})

const rates = computed(() => ratesQuery.data.value ?? [])

// "Agregar empleado" — the exact same modal, composable, and save/delete path as Equipo.vue's
// "Nuevo empleado" (and StaffingWorkersPanel.vue's "Nuevo trabajador"): same query key, so
// creating a worker here also shows up in the generic team list and vice versa. The only
// difference from Equipo.vue is the extra invalidation below, needed because this screen reads
// company rosters from a separate, narrower endpoint (getSpreadsheetCompanyRates) that useCrud's
// own queryKey doesn't cover.
const branchId = computed(() => businessStore.currentBranchId)
const empleadoModalRef = ref<InstanceType<typeof EmpleadoFormModal> | null>(null)
const { handleSave: handleSaveEmpleado, handleDelete: handleDeleteEmpleado, isSaving: isSavingEmployee } = useCrud<Empleado, EmpleadoFormData>({
  businessId: computed(() => props.businessId),
  branchId,
  queryKey: (id, brId) => equipoKeys.all(id, brId),
  queryFn: (id, brId) => listEquipo(id, brId),
  saveFn: (id, data, brId) => saveEmpleado(data, id, brId),
  deleteFn: (id) => deleteEmpleado(id),
  entityName: 'Empleado',
  modalRef: empleadoModalRef,
  extraInvalidations: [
    (id) => ['staffing-company-employees', id],
    (id) => staffingSpreadsheetKeys.rates(id, selectedCompanyId.value),
  ],
})

const modal = useModal('empleado-form-modal')
const openNewEmployee = () => modal.open({ presetCompanyId: selectedCompanyId.value })

// A fresh company means a fresh selection — otherwise a previously checked employeeId from
// company A would silently carry over (and print) against company B's rate sheet.
watch(selectedCompanyId, () => {
  selectedEmployeeIds.value = []
})

const handleGeneratePdf = () => {
  const company = (companies.value ?? []).find(c => c.id === selectedCompanyId.value)
  if (!company) return
  const selectedRows = rates.value.filter(r => selectedEmployeeIds.value.includes(r.employeeId))
  if (selectedRows.length === 0) return
  printStaffingSpreadsheet(businessStore.business?.name || 'Delta Work Force', company.name, selectedRows)
}
</script>
