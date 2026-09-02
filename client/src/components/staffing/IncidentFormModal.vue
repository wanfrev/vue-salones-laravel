<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
      <div class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-text">{{ isEditing ? 'Editar incidente' : 'Nuevo incidente' }}</h2>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="inc-company">Empresa</label>
            <select id="inc-company" v-model="form.companyId" :class="inputClass" @change="form.employeeId = ''">
              <option value="">Sin empresa</option>
              <option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="inc-employee">Empleado</label>
            <select id="inc-employee" v-model="form.employeeId" required :class="inputClass" :disabled="!form.companyId">
              <option value="" disabled>{{ form.companyId ? 'Selecciona un empleado' : 'Selecciona primero una empresa' }}</option>
              <option v-for="e in employeeOptions" :key="e.value" :value="e.value">{{ e.label }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="inc-date">Fecha</label>
              <input id="inc-date" v-model="form.incidentDate" type="date" required :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="inc-followup">Follow up</label>
              <input id="inc-followup" v-model="form.followUpDate" type="date" :class="inputClass" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="inc-comments">Comments</label>
            <textarea id="inc-comments" v-model="form.comments" rows="3" :class="inputClass" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="inc-status">Estado</label>
              <select id="inc-status" v-model="form.status" :class="inputClass">
                <option v-for="s in INCIDENT_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="inc-drugtest">Drug Test</label>
              <select id="inc-drugtest" v-model="form.drugTestResult" :class="inputClass">
                <option :value="null">Sin definir</option>
                <option v-for="d in DRUG_TEST_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
              </select>
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-text">
            <input v-model="wantsUrgentCareModel" type="checkbox" class="h-3.5 w-3.5 rounded border-border" />
            ¿Quiere ir al Urgent Care?
          </label>

          <p v-if="error" class="text-sm text-danger">{{ error }}</p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
              @click="emit('close')">
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { translateError } from '../../lib/errors'
import { listStaffingCompanies, staffingCompanyKeys, listCompanyEmployees } from '../../services/staffing/staffingService'
import {
  INCIDENT_STATUS_OPTIONS, DRUG_TEST_OPTIONS,
  type StaffingIncidentRow, type StaffingIncidentFormData, type StaffingIncidentStatus, type DrugTestResult,
} from '../../services/staffing/staffingIncidentService'

const props = defineProps<{
  businessId: string | null
  incident?: StaffingIncidentRow | null
  saving: boolean
  error: string
}>()

const emit = defineEmits<{ close: []; save: [data: StaffingIncidentFormData] }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30'

const isEditing = computed(() => !!props.incident)

const form = reactive<{
  companyId: string
  employeeId: string
  incidentDate: string
  followUpDate: string
  comments: string
  status: StaffingIncidentStatus
  drugTestResult: DrugTestResult | null
  wantsUrgentCare: boolean | null
}>({
  companyId: props.incident?.companyId ?? '',
  employeeId: props.incident?.employeeId ?? '',
  incidentDate: props.incident?.incidentDate ?? '',
  followUpDate: props.incident?.followUpDate ?? '',
  comments: props.incident?.comments ?? '',
  status: props.incident?.status ?? 'activo',
  drugTestResult: props.incident?.drugTestResult ?? null,
  wantsUrgentCare: props.incident?.wantsUrgentCare ?? null,
})

const wantsUrgentCareModel = computed<boolean>({
  get: () => form.wantsUrgentCare === true,
  set: (value) => { form.wantsUrgentCare = value },
})

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(props.businessId)),
  queryFn: () => listStaffingCompanies(props.businessId!),
  enabled: computed(() => !!props.businessId),
})
const companyOptions = computed(() => (companies.value ?? []).map(c => ({ value: c.id, label: c.name })))

const { data: employees } = useQuery({
  queryKey: computed(() => ['staffing-company-employees', props.businessId, form.companyId] as const),
  queryFn: () => listCompanyEmployees(props.businessId!, form.companyId),
  enabled: computed(() => !!props.businessId && !!form.companyId),
})
const baseEmployeeOptions = computed(() => (employees.value ?? []).map(e => ({ value: e.id, label: e.full_name })))

// Editing an existing incident whose employee isn't in the currently-active roster (they may have
// been unassigned since) still needs to show up as a selectable option — otherwise the dropdown
// would silently blank out a real value.
const employeeOptions = computed(() => {
  const base = baseEmployeeOptions.value
  if (props.incident && form.employeeId && !base.some(o => o.value === form.employeeId)) {
    return [...base, { value: form.employeeId, label: props.incident.employeeName }]
  }
  return base
})

const submit = () => {
  emit('save', {
    employeeId: form.employeeId,
    companyId: form.companyId || null,
    comments: form.comments || null,
    incidentDate: form.incidentDate,
    followUpDate: form.followUpDate || null,
    wantsUrgentCare: form.wantsUrgentCare,
    status: form.status,
    drugTestResult: form.drugTestResult,
  })
}
</script>
