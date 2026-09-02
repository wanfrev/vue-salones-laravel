<template>
  <FeatureGate :gate="{ capability: 'staffing.incidents' }">
    <header class="mb-5 lg:mb-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <DocumentIcon class="h-3.5 w-3.5" />
          <span>Incidentes</span>
        </div>
        <p class="mt-1 text-sm text-text-muted">Registro de incidentes de trabajo por empleado.</p>
      </div>
      <button type="button"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
        @click="openNew">
        + Nuevo incidente
      </button>
    </header>

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-[200px]">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="inc-filter-company">Empresa</label>
        <select id="inc-filter-company" v-model="filterCompanyId" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none">
          <option value="">Todas las empresas</option>
          <option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </div>
      <div class="min-w-[180px]">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted" for="inc-filter-status">Estado</label>
        <select id="inc-filter-status" v-model="filterStatus" class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none">
          <option value="">Todos los estados</option>
          <option v-for="s in INCIDENT_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-sm text-text-muted">Cargando incidentes...</div>
    <p v-else-if="incidents.length === 0" class="py-10 text-center text-sm text-text-muted">No hay incidentes registrados todavía.</p>

    <div v-else class="overflow-hidden rounded-xl border border-border bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-bg-secondary text-left text-[10px] uppercase tracking-wider text-text-muted">
              <th class="px-3 py-2.5">Nombre</th>
              <th class="px-3 py-2.5">Comments</th>
              <th class="px-3 py-2.5">Fecha</th>
              <th class="px-3 py-2.5">Follow up</th>
              <th class="px-3 py-2.5 text-center">Reporte</th>
              <th class="px-3 py-2.5 text-center">Urgent Care</th>
              <th class="px-3 py-2.5">Empresa</th>
              <th class="px-3 py-2.5">Estado</th>
              <th class="px-3 py-2.5 text-center">Relief Form</th>
              <th class="px-3 py-2.5 text-center">Facturas</th>
              <th class="px-3 py-2.5 text-center">Paperwork</th>
              <th class="px-3 py-2.5">Drug Test</th>
              <th class="px-3 py-2.5 text-center">Fotos</th>
              <th class="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="incident in incidents" :key="incident.id">
              <td class="px-3 py-2.5 font-medium text-text whitespace-nowrap">{{ incident.employeeName }}</td>
              <td class="px-3 py-2.5 max-w-52 truncate text-text-secondary" :title="incident.comments ?? ''">{{ incident.comments || '—' }}</td>
              <td class="px-3 py-2.5 whitespace-nowrap text-text-secondary">{{ formatDateUS(incident.incidentDate) }}</td>
              <td class="px-3 py-2.5 whitespace-nowrap text-text-secondary">{{ incident.followUpDate ? formatDateUS(incident.followUpDate) : '—' }}</td>
              <td class="px-3 py-2.5">
                <IncidentSingleFileCell :incident-id="incident.id" field="reporte" :file-name="incident.reporteFileName"
                  @upload="(file) => handleUploadSingle(incident.id, 'reporte', file)" />
              </td>
              <td class="px-3 py-2.5 text-center">
                <span v-if="incident.wantsUrgentCare === true" class="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Sí</span>
                <span v-else-if="incident.wantsUrgentCare === false" class="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">No</span>
                <span v-else class="text-text-muted">—</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap text-text-secondary">{{ incident.companyName || '—' }}</td>
              <td class="px-3 py-2.5">
                <span :class="['rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap', statusClass(incident.status)]">
                  {{ statusLabel(incident.status) }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <IncidentSingleFileCell :incident-id="incident.id" field="relief_form" :file-name="incident.reliefFormFileName"
                  @upload="(file) => handleUploadSingle(incident.id, 'relief_form', file)" />
              </td>
              <td class="px-3 py-2.5">
                <IncidentFilesCell :files="filesByType(incident, 'factura')" file-type="factura"
                  @upload="(file) => handleAddFile(incident.id, 'factura', file)" @remove="handleRemoveFile" />
              </td>
              <td class="px-3 py-2.5">
                <IncidentFilesCell :files="filesByType(incident, 'paperwork')" file-type="paperwork"
                  @upload="(file) => handleAddFile(incident.id, 'paperwork', file)" @remove="handleRemoveFile" />
              </td>
              <td class="px-3 py-2.5">
                <div class="flex flex-row items-center gap-2">
                  <select :value="incident.drugTestResult ?? ''" class="rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-text outline-none"
                    @change="handleDrugTestChange(incident.id, ($event.target as HTMLSelectElement).value)">
                    <option value="">Sin definir</option>
                    <option v-for="d in DRUG_TEST_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
                  </select>
                  <IncidentFilesCell :files="filesByType(incident, 'drug_test')" file-type="drug_test"
                    @upload="(file) => handleAddFile(incident.id, 'drug_test', file)" @remove="handleRemoveFile" />
                </div>
              </td>
              <td class="px-3 py-2.5">
                <IncidentFilesCell :files="filesByType(incident, 'foto')" file-type="foto"
                  @upload="(file) => handleAddFile(incident.id, 'foto', file)" @remove="handleRemoveFile" />
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1">
                  <button type="button" class="rounded p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary" title="Editar" @click="openEdit(incident)">
                    <PenIcon class="h-4 w-4" />
                  </button>
                  <button type="button" class="rounded p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger" title="Eliminar" @click="handleDelete(incident.id)">
                    <TrashBin2Icon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <IncidentFormModal
      v-if="showModal"
      :business-id="businessId"
      :incident="editingIncident"
      :saving="createMutation.isPending.value || updateMutation.isPending.value"
      :error="saveError"
      @close="closeModal"
      @save="handleSave"
    />
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import { formatDateUS } from '../lib/formatters'
import { listStaffingCompanies, staffingCompanyKeys } from '../services/staffing/staffingService'
import {
  INCIDENT_STATUS_OPTIONS, DRUG_TEST_OPTIONS,
  type StaffingIncidentRow, type StaffingIncidentStatus, type IncidentFileType, type StaffingIncidentFormData,
} from '../services/staffing/staffingIncidentService'
import { useStaffingIncidents } from '../composables/staffing/useStaffingIncidents'
import IncidentFormModal from '../components/staffing/IncidentFormModal.vue'
import IncidentSingleFileCell from '../components/staffing/IncidentSingleFileCell.vue'
import IncidentFilesCell from '../components/staffing/IncidentFilesCell.vue'
import { DocumentIcon, PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)

const filterCompanyId = ref('')
const filterStatus = ref('')

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(businessId.value)),
  queryFn: () => listStaffingCompanies(businessId.value!),
  enabled: computed(() => !!businessId.value),
})
const companyOptions = computed(() => (companies.value ?? []).map(c => ({ value: c.id, label: c.name })))

const {
  incidents, isLoading, saveError,
  createMutation, updateMutation, deleteMutation,
  uploadSingleMutation, addFileMutation, deleteFileMutation,
} = useStaffingIncidents(
  businessId,
  computed(() => filterCompanyId.value || null),
  computed(() => filterStatus.value || null),
)

const filesByType = (incident: StaffingIncidentRow, type: IncidentFileType) =>
  incident.files.filter(f => f.fileType === type)

const STATUS_LABELS: Record<StaffingIncidentStatus, string> = {
  activo: 'Activo', light_duty: 'Light Duty', suspendido: 'Suspendido', despedido: 'Despedido',
}
const STATUS_CLASSES: Record<StaffingIncidentStatus, string> = {
  activo: 'bg-success/10 text-success',
  light_duty: 'bg-warning/10 text-warning',
  suspendido: 'bg-danger/10 text-danger',
  despedido: 'bg-bg-secondary text-text-muted',
}
const statusLabel = (status: StaffingIncidentStatus) => STATUS_LABELS[status] ?? status
const statusClass = (status: StaffingIncidentStatus) => STATUS_CLASSES[status] ?? 'bg-bg-secondary text-text-muted'

const showModal = ref(false)
const editingIncident = ref<StaffingIncidentRow | null>(null)

const openNew = () => { editingIncident.value = null; showModal.value = true }
const openEdit = (incident: StaffingIncidentRow) => { editingIncident.value = incident; showModal.value = true }
const closeModal = () => { showModal.value = false; editingIncident.value = null }

const handleSave = async (data: StaffingIncidentFormData) => {
  if (editingIncident.value) {
    await updateMutation.mutateAsync({ id: editingIncident.value.id, data })
    if (!updateMutation.isError.value) closeModal()
  } else {
    await createMutation.mutateAsync(data)
    if (!createMutation.isError.value) closeModal()
  }
}

const handleDelete = (id: string) => {
  if (window.confirm('¿Eliminar este incidente? Esta acción no se puede deshacer.')) {
    deleteMutation.mutate(id)
  }
}

const handleUploadSingle = (incidentId: string, field: 'reporte' | 'relief_form', file: File) => {
  uploadSingleMutation.mutate({ incidentId, field, file })
}

const handleAddFile = (incidentId: string, fileType: IncidentFileType, file: File) => {
  addFileMutation.mutate({ incidentId, fileType, file })
}

const handleRemoveFile = (fileId: string) => {
  deleteFileMutation.mutate(fileId)
}

const handleDrugTestChange = (incidentId: string, value: string) => {
  updateMutation.mutate({ id: incidentId, data: { drugTestResult: (value || null) as StaffingIncidentFormData['drugTestResult'] } })
}
</script>
