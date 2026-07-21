<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.appointment}` : `Nueva ${t.appointment}`"
    :subtitle="isEditing ? `Modifica los detalles de la ${t.appointment.toLowerCase()}` : `Agenda una nueva ${t.appointment.toLowerCase()} para un ${t.client.toLowerCase()}`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="xl"
    :is-loading="isLoading"
    :is-confirm-disabled="!isFormValid || saveInProgress"
    :confirm-text="confirmButtonLabel"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- BLOQUE 1: DATOS GENERALES -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CitaClientSearch
            v-model="formData.clientName"
            v-model:client-phone="formData.clientPhone"
            :business-id="businessId"
            :branch-id="branchId"
            :t="t"
            :can-create-clients="canCreateClients"
            :error="errors.clientName"
            @select-client="onClientSelected"
          />
          <FormInput v-model="formData.clientPhone" label="Teléfono" type="tel" placeholder="+58 412 1234567" required
            prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            :error="errors.clientPhone" />
        </div>
        <FormDropdown
          v-if="showPetSelector"
          :model-value="formData.petId ?? ''"
          :label="t.pet"
          :placeholder="`Seleccionar ${(t.pet || 'mascota').toLowerCase()}`"
          :options="petOptions"
          size="sm"
          @update:model-value="formData.petId = String($event)"
        />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormInput class="min-w-0" v-model="formData.date" label="Fecha" type="date" required
            prefix-icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" :error="errors.date" />
          <FormTime class="min-w-0" v-model="formData.time" label="Hora" required :error="errors.time" />
          <FormDropdown class="min-w-0" v-model="formData.status" label="Estado" :options="statusOptions" required :error="errors.status" />
        </div>
      </div>

      <!-- BLOQUE 2: TABLA DE SERVICIOS -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-semibold text-text">{{ t.service }}s</label>
          <button type="button" @click="addServiceRow" class="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Agregar {{ t.service.toLowerCase() }}
          </button>
        </div>
        <div class="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_80px_60px_36px_36px] gap-2 px-1">
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">{{ t.service }}</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">{{ t.employee }}</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">Asistente</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider text-right">Precio</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider text-right">Min</span>
          <span></span><span></span>
        </div>

        <div v-for="(row, index) in serviceRows" :key="index" class="rounded-lg border border-border bg-bg-secondary/30">
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_80px_60px_36px_36px] gap-2 p-2.5 items-start">
            <FormDropdown :model-value="row.serviceId" :placeholder="`Seleccionar ${t.service.toLowerCase()}`" :options="serviceOptions" :error="getRowError(index, 'serviceId')" size="sm" searchable @update:model-value="updateServiceRow(index, 'serviceId', $event)" />
            <FormDropdown :model-value="row.employeeId" :placeholder="t.employee" :options="employeeOptions" :disabled="isSingleEmployee" :error="getRowError(index, 'employeeId')" size="sm" searchable @update:model-value="updateServiceRow(index, 'employeeId', $event)" />
            <FormDropdown :model-value="row.assistantEmployeeId" placeholder="Sin asist." :options="assistantOptions" :error="getRowError(index, 'assistantEmployeeId')" size="sm" @update:model-value="updateServiceRow(index, 'assistantEmployeeId', $event)" />
            <div>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">$</span>
                <input :value="String(row.price)" @input="setRowPrice(index, ($event.target as HTMLInputElement).value)" type="number" min="0" step="0.01" class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 pl-6 pr-2 text-sm border-border hover:border-border-strong text-right" />
              </div>
              <p v-if="getRowError(index, 'price')" class="text-xs text-danger mt-0.5">{{ getRowError(index, 'price') }}</p>
            </div>
            <div><input :value="String(row.duration)" @input="setRowDuration(index, ($event.target as HTMLInputElement).value)" type="number" class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 px-2 text-sm border-border hover:border-border-strong text-right" /></div>
            <button v-if="getEmployeeDefaultPercentage(row.employeeId) != null" type="button" @click="toggleCommissionDetail(index)" class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" :class="commissionDetailOpen.has(index) ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-secondary hover:text-text'" :title="commissionDetailOpen.has(index) ? 'Ocultar comisión' : 'Personalizar comisión'">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <span v-else class="w-8"></span>
            <button v-if="serviceRows.length > 1" type="button" @click="removeServiceRow(index)" class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar servicio">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <span v-else class="w-8"></span>
          </div>

          <!-- Commission panel -->
          <div v-if="commissionDetailOpen.has(index) && getEmployeeDefaultPercentage(row.employeeId) != null" class="border-t border-border px-3 py-2">
            <div class="flex items-center gap-3 text-xs">
              <span class="text-text-muted">Comisión: {{ getEmployeeDefaultPercentage(row.employeeId) }}%</span>
              <label class="flex items-center gap-1.5 text-primary cursor-pointer select-none">
                <input type="checkbox" :checked="hasEmployeeOverride(index)" @change="toggleEmployeeOverride(index)" class="rounded border-border h-3.5 w-3.5" /> Personalizar
              </label>
              <input v-if="hasEmployeeOverride(index)" :value="getEmployeeOverrideValue(index)" @input="setEmployeeOverride(index, ($event.target as HTMLInputElement).value)" type="number" min="0" max="100" placeholder="%" class="w-16 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-text" />
            </div>
          </div>

          <!-- Assistant percentage -->
          <div v-if="row.assistantEmployeeId" class="border-t border-border px-3 py-2">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-text-muted shrink-0">% asistente:</label>
              <input :value="String(row.assistantPercentage)" @input="updateServiceRow(index, 'assistantPercentage', ($event.target as HTMLInputElement).value)" type="number" min="0" max="100" placeholder="10" class="w-20 rounded border border-border bg-bg px-2 py-1 text-xs text-text" />
              <span v-if="getRowError(index, 'assistantPercentage')" class="text-xs text-danger">{{ getRowError(index, 'assistantPercentage') }}</span>
            </div>
          </div>
        </div>

        <!-- Totales -->
        <div class="flex items-center gap-4 rounded-lg bg-primary/5 px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-text">Total:</span>
            <DualAmount :amount="totalPrice" orientation="inline" size="sm" primary-class="text-primary font-semibold" />
          </div>
          <span class="text-text-muted">·</span>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-medium text-text-muted">Duración:</span>
            <input :value="editableDuration" @input="onTotalDurationChange(($event.target as HTMLInputElement).value)" @blur="onTotalDurationBlur" type="number" class="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-sm font-semibold text-text text-center outline-none focus:border-primary" />
            <span class="text-sm text-text-muted">min</span>
          </div>
        </div>
      </div>

      <!-- BLOQUE 3: NOTAS -->
      <FormTextarea v-model="formData.notes" label="Notas" placeholder="Notas adicionales sobre la cita..." :rows="2" :error="errors.notes" />

      <div v-if="showPetSelector && formData.petId" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormTextarea v-model="formData.diagnosis" label="Diagnóstico" placeholder="Observaciones, síntomas, hallazgos..." :rows="2" />
        <FormTextarea v-model="formData.treatment" label="Tratamiento" placeholder="Procedimiento, medicamentos, indicaciones..." :rows="2" />
      </div>

      <PaymentEditor ref="paymentEditorRef" />

      <div v-if="isEditing" class="border-t border-border pt-4">
        <button type="button" class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10" @click="confirmDelete">
          Eliminar {{ t.appointment.toLowerCase() }}
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { toISODate, minutesToHHmm, getInitials } from '../../lib/formatters'
import { listCitaGroupMembers } from '../../services/agendaService'
import type { Cita, CitaFormData, CitaFormServiceItem, PaymentEditContext } from '../../types/cita'
import type { Pet } from '../../types/database'
import ModalBase from '../common/ModalBase.vue'
import { DualAmount } from '../common'
import { FormInput, FormSelect, FormDropdown, FormTextarea, FormTime } from '../forms'
import CitaClientSearch from '../forms/CitaClientSearch.vue'
import PaymentEditor from './PaymentEditor.vue'
import { isPetNiche as checkPetNiche } from '../../config/nicheFields'
import { listPetsByClient } from '../../services/petService'

const MODAL_ID = 'cita-form-modal'

const props = defineProps<{
  servicios?: { id: string; name: string; price: number; duration: number }[]
  empleados?: { id: string; name: string; payType?: string; payPercentage?: number; disableAgenda?: boolean }[]
}>()

const emit = defineEmits<{
  save: [cita: CitaFormData & { id?: string; clientPhone?: string; paymentData?: PaymentEditContext }]
  delete: [citaId: string]
}>()

const saveInProgress = ref(false)
const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()
const isEmployee = computed(() => authStore.role === 'empleado')
const canCreateClients = computed(() => !isEmployee.value || businessStore.hasFeature('employees_create_clients'))
const t = computed(() => businessStore.terminology)
const nicheType = computed(() => businessStore.nicheType)
const showPetSelector = computed(() => checkPetNiche(nicheType.value))
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const commissionDetailOpen = reactive(new Set<number>())
const clientPets = ref<Pet[]>([])

const petOptions = computed(() => {
  const opts = [{ value: '', label: `Sin ${(t.value.pet || 'mascota').toLowerCase()}` }]
  return [...opts, ...clientPets.value.map(p => ({ value: p.id, label: p.name }))]
})

const onClientSelected = (client: { id: string }) => {
  formData.value.clientId = client.id
  if (showPetSelector.value) {
    loadClientPets(client.id)
  }
}

const loadClientPets = async (clientId: string) => {
  try {
    clientPets.value = await listPetsByClient(clientId)
    formData.value.petId = undefined
  } catch {
    clientPets.value = []
  }
}

const isLoading = computed(() => saveInProgress.value)
const isEditing = computed(() => !!(modalData.value?.cita?.id))

const serviceOptions = computed(() => (props.servicios ?? []).map(s => ({ value: s.id, label: s.name, sublabel: `$${s.price} · ${s.duration} min`, icon: '✂' })))
const employeeOptions = computed(() => {
  const empList = (props.empleados ?? []).filter(e => !e.disableAgenda)
  if (isEmployee.value) { const me = empList.find(e => e.id === (authStore.profile?.id ?? '')); return me ? [{ value: me.id, label: me.name, icon: getInitials(me.name) }] : [] }
  return empList.map(e => ({ value: e.id, label: e.name, icon: getInitials(e.name) }))
})
const assistantOptions = computed(() => {
  const empList = (props.empleados ?? []).filter(e => !e.disableAgenda)
  if (isEmployee.value) return [{ value: '', label: 'Sin asistente' }]
  return [{ value: '', label: 'Sin asistente' }, ...empList.map(e => ({ value: e.id, label: e.name, icon: getInitials(e.name) }))]
})
const isSingleEmployee = computed(() => employeeOptions.value.length <= 1)
const statusOptions = [
  { value: 'confirmed', label: 'Confirmada', icon: '✓' },
  { value: 'pending', label: 'Pendiente', icon: '◉' },
  { value: 'paid', label: 'Pagada', icon: '$' },
  { value: 'cancelled', label: 'Cancelada', icon: '✕' },
]

const emptyServiceRow = (): CitaFormServiceItem => ({
  serviceId: '', employeeId: isEmployee.value ? (authStore.profile?.id ?? '') : '', assistantEmployeeId: '', assistantPercentage: 0, duration: 30, price: 0,
})

const defaultFormData = (): CitaFormData & { extraServices: CitaFormServiceItem[] } => {
  const today = toISODate(new Date())
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const nextSlot = Math.ceil(minutes / 30) * 30
  const myId = isEmployee.value ? (authStore.profile?.id ?? '') : ''
  return { clientId: undefined, clientName: '', clientPhone: '', petId: '', service: '', employee: myId, assistantEmployee: '', assistantPercentage: 0, duration: 30, price: 0, extraServices: [], date: today, time: minutesToHHmm(nextSlot), status: 'pending', notes: '', diagnosis: '', treatment: '' }
}

const formData = ref<CitaFormData & { extraServices: CitaFormServiceItem[] }>(defaultFormData())
const errors = ref<Partial<Record<keyof CitaFormData, string>> & { rowErrors?: Record<number, Partial<Record<string, string>>> }>({})
const activeEmployeeOverrides = reactive(new Set<number>())

const paymentEditorRef = ref<InstanceType<typeof PaymentEditor> | null>(null)

const isInitialSetup = ref(false)

const servicesLoaded = computed(() => (props.servicios?.length ?? 0) > 0)
const employeesLoaded = computed(() => (props.empleados?.length ?? 0) > 0)

const serviceRows = computed<CitaFormServiceItem[]>(() => {
  return [{ serviceId: formData.value.service, employeeId: formData.value.employee, assistantEmployeeId: formData.value.assistantEmployee, assistantPercentage: formData.value.assistantPercentage, duration: formData.value.duration, price: formData.value.price }, ...formData.value.extraServices]
})

const addServiceRow = () => formData.value.extraServices.push(emptyServiceRow())
const removeServiceRow = (index: number) => {
  if (index === 0) {
    if (formData.value.extraServices.length === 0) return
    const next = formData.value.extraServices.shift()!
    formData.value.service = next.serviceId
    formData.value.employee = next.employeeId
    formData.value.assistantEmployee = next.assistantEmployeeId
    formData.value.assistantPercentage = next.assistantPercentage
    formData.value.employeePercentageOverride = next.employeePercentageOverride
    formData.value.duration = next.duration
    formData.value.price = next.price
    activeEmployeeOverrides.clear()
    commissionDetailOpen.clear()
  } else {
    const ei = index - 1
    if (ei >= 0 && ei < formData.value.extraServices.length) {
      formData.value.extraServices.splice(ei, 1)
      activeEmployeeOverrides.delete(index)
      commissionDetailOpen.delete(index)
    }
  }
}

const updateServiceRow = (index: number, field: keyof CitaFormServiceItem, value: string) => {
  const set = (target: any, f: string, v: any) => {
    if (f === 'serviceId') { target[f] = v; const svc = props.servicios?.find(s => s.id === v); if (svc) { target.price = svc.price; target.duration = svc.duration } }
    else if (f === 'assistantPercentage') target[f] = Number(v) || 0
    else if (f === 'price') target[f] = Number(v) || 0
    else if (f === 'duration') target[f] = Math.max(1, Number(v) || 1)
    else target[f] = v
  }
  if (index === 0) {
    const fd = formData.value; const map: Record<string, keyof typeof fd> = { serviceId: 'service', employeeId: 'employee', assistantEmployeeId: 'assistantEmployee', assistantPercentage: 'assistantPercentage', price: 'price', duration: 'duration' }
    const k = map[field]; if (k) set(fd, k, value)
    if (field === 'assistantEmployeeId' && !value) fd.assistantPercentage = 0
  } else {
    const extra = formData.value.extraServices[index - 1]
    if (extra) { set(extra, field, value); if (field === 'assistantEmployeeId' && !value) extra.assistantPercentage = 0 }
  }
}

const setRowPrice = (index: number, val: string) => updateServiceRow(index, 'price', String(val === '' ? 0 : Number(val)))
const setRowDuration = (index: number, val: string) => { if (val !== '' && !isNaN(Number(val))) updateServiceRow(index, 'duration', String(Number(val))); else if (val === '') updateServiceRow(index, 'duration', '0') }
const getRowError = (index: number, field: string): string | undefined => (errors.value as any)?.rowErrors?.[index]?.[field]

const toggleCommissionDetail = (index: number) => { commissionDetailOpen.has(index) ? commissionDetailOpen.delete(index) : commissionDetailOpen.add(index) }
const getEmployeeDefaultPercentage = (eid: string): number | undefined => { if (!eid) return undefined; const emp = props.empleados?.find(e => e.id === eid); if (!emp || emp.payType === 'salary') return undefined; return emp.payPercentage ?? 0 }

const hasEmployeeOverride = (index: number): boolean => {
  if (activeEmployeeOverrides.has(index)) return true
  if (index === 0) return formData.value.employeePercentageOverride != null
  return formData.value.extraServices[index - 1]?.employeePercentageOverride != null
}
const getEmployeeOverrideValue = (index: number): string => {
  if (index === 0) return formData.value.employeePercentageOverride != null ? String(formData.value.employeePercentageOverride) : ''
  return formData.value.extraServices[index - 1]?.employeePercentageOverride != null ? String(formData.value.extraServices[index - 1].employeePercentageOverride) : ''
}
const setEmployeeOverride = (index: number, value: string) => {
  const num = value === '' ? undefined : Math.max(0, Math.min(100, Number(value) || 0))
  if (index === 0) formData.value.employeePercentageOverride = num
  else { const extra = formData.value.extraServices[index - 1]; if (extra) extra.employeePercentageOverride = num }
}
const toggleEmployeeOverride = (index: number) => {
  if (hasEmployeeOverride(index)) { activeEmployeeOverrides.delete(index); setEmployeeOverride(index, '') }
  else { activeEmployeeOverrides.add(index); const row = index === 0 ? { employeeId: formData.value.employee } : formData.value.extraServices[index - 1]; setEmployeeOverride(index, String(getEmployeeDefaultPercentage(row?.employeeId ?? '') ?? 0)) }
}

watch(() => formData.value.service, (serviceId) => {
  if (isInitialSetup.value || !serviceId) return
  const svc = props.servicios?.find(s => s.id === serviceId)
  if (svc) { formData.value.price = svc.price; formData.value.duration = svc.duration }
})

const totalPrice = computed(() => formData.value.price + formData.value.extraServices.reduce((s, e) => s + e.price, 0))
const maxDuration = computed(() => Math.max(formData.value.duration, ...formData.value.extraServices.map(e => e.duration)))
const editableDuration = ref<number | string>(maxDuration.value)
let syncDurationGuard = false

watch(maxDuration, (val) => { if (!syncDurationGuard) editableDuration.value = val }, { immediate: true })

const onTotalDurationChange = (val: string) => {
  if (val === '') { editableDuration.value = ''; return }
  const num = Number(val); if (isNaN(num)) return
  editableDuration.value = num; syncDurationGuard = true
  formData.value.duration = num; formData.value.extraServices.forEach(e => e.duration = num)
  setTimeout(() => { syncDurationGuard = false }, 0)
}
const onTotalDurationBlur = () => { if (editableDuration.value === '' || Number(editableDuration.value) <= 0) editableDuration.value = maxDuration.value }

const isFormValid = computed(() => {
  const hp = formData.value.service !== '' && formData.value.employee !== ''
  const ev = formData.value.extraServices.every(e => e.serviceId !== '' && e.employeeId !== '')
  const hc = canCreateClients.value || !!formData.value.clientId
  return formData.value.clientName.trim().length >= 2 && formData.value.clientPhone.trim().length >= 7 && hp && ev && hc && formData.value.date !== '' && formData.value.time !== ''
})

const confirmButtonLabel = computed(() => {
  if (saveInProgress.value) return 'Guardando...'
  if (!formData.value.date) return 'Falta la fecha'
  if (!formData.value.time) return 'Falta la hora'
  if (formData.value.clientName.trim().length < 2) return 'Falta nombre del cliente'
  if (formData.value.clientPhone.trim().length < 7) return 'Falta teléfono'
  if (!formData.value.service) return 'Falta seleccionar servicio'
  if (!formData.value.employee) return 'Falta seleccionar empleado'
  if (formData.value.extraServices.some(e => !e.serviceId || !e.employeeId)) return 'Falta completar servicios extras'
  if (!canCreateClients.value && !formData.value.clientId) return 'Cliente no válido'
  return isEditing.value ? `Actualizar ${t.value.appointment}` : `Agendar ${t.value.appointment}`
})

watch([isOpen, () => modalData.value?.cita, () => modalData.value?.paymentData], async ([open, cita, paymentData]) => {
  if (!open) return; commissionDetailOpen.clear(); activeEmployeeOverrides.clear()
  if (cita) {
    let phone = ''
    let groupMembers: CitaFormServiceItem[] = []
    let primaryDuration = cita.duration || 30
    let primaryPrice = cita.price || 0

    isInitialSetup.value = true

    if (primaryPrice === 0 && cita.serviceId) {
      const svc = props.servicios?.find(s => s.id === cita.serviceId)
      if (svc) primaryPrice = svc.price
    }

    formData.value = { clientId: cita.clientId || undefined, clientName: cita.clientName || '', clientPhone: cita.clientPhone || '', petId: (cita as any).petId || (cita as any).pet_id || undefined, service: cita.serviceId || '', employee: cita.employeeId || '', assistantEmployee: cita.assistantId || '', assistantPercentage: Number(cita.assistantPercentage ?? 0), employeePercentageOverride: cita.employeePercentageOverride != null ? Number(cita.employeePercentageOverride) : undefined, duration: primaryDuration, price: primaryPrice, extraServices: groupMembers, date: cita.date || toISODate(new Date()), time: cita.time || '09:00', status: cita.status || 'pending', notes: cita.notes || '', diagnosis: (cita as any).diagnosis || '', treatment: (cita as any).treatment || '' }

    if (cita.clientId && businessId.value) { try { const { searchClients } = await import('../../services/clientesService'); const r = await searchClients(businessId.value, cita.clientName, branchId.value); const m = r.find(c => c.id === cita.clientId); if (m) formData.value.clientPhone = m.phone } catch {} }
    if (cita.groupId) {
      try {
        const members = await listCitaGroupMembers(cita.groupId)
        const selectedMember =
          members.find(m => m.id === cita.id) ??
          members.find(m =>
            m.service_id === cita.serviceId &&
            m.employee_id === cita.employeeId &&
            toISODate(new Date(m.start_time)) === cita.date &&
            minutesToHHmm(new Date(m.start_time).getHours() * 60 + new Date(m.start_time).getMinutes()) === cita.time
          )
        if (selectedMember) {
          primaryDuration = selectedMember.duration_override != null
            ? Number(selectedMember.duration_override)
            : Math.round((new Date(selectedMember.end_time).getTime() - new Date(selectedMember.start_time).getTime()) / 60000) || (selectedMember.services?.duration_minutes ?? 30)
          primaryPrice = selectedMember.price_override != null
            ? Number(selectedMember.price_override)
            : (cita.price || Number(selectedMember.services?.price ?? props.servicios?.find(s => s.id === cita.serviceId)?.price ?? 0))
        }
        const selectedMemberId = selectedMember?.id
        const serviciosMap = props.servicios ?? []
        groupMembers = members
          .filter(m => m.id !== selectedMemberId)
          .map(m => {
            const svcFromProps = serviciosMap.find(s => s.id === m.service_id)
            return {
              serviceId: m.service_id,
              employeeId: m.employee_id,
              assistantEmployeeId: m.assistant_employee_id ?? '',
              assistantPercentage: Number(m.assistant_percentage ?? 0),
              employeePercentageOverride: m.employee_percentage_override != null ? Number(m.employee_percentage_override) : undefined,
              duration: Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000) || (m.services?.duration_minutes ?? svcFromProps?.duration ?? 30),
              price: Number(m.price_override ?? m.services?.price ?? svcFromProps?.price ?? 0),
            }
          })
        formData.value.extraServices = groupMembers
        formData.value.duration = primaryDuration
        formData.value.price = primaryPrice
      } catch {}
    }
    if (formData.value.clientId && showPetSelector.value) {
      loadClientPets(formData.value.clientId)
    }
  } else {
    isInitialSetup.value = true
    formData.value = defaultFormData()
  }
  await nextTick()
  paymentEditorRef.value?.setPaymentContext(paymentData as PaymentEditContext | null)
  activeEmployeeOverrides.clear()
  commissionDetailOpen.clear()
  if (formData.value.employeePercentageOverride != null) { activeEmployeeOverrides.add(0); commissionDetailOpen.add(0) }
  formData.value.extraServices.forEach((_, i) => { if (formData.value.extraServices[i]?.employeePercentageOverride != null) { activeEmployeeOverrides.add(i + 1); commissionDetailOpen.add(i + 1) } })
  errors.value = {}
  nextTick(() => { isInitialSetup.value = false })
}, { immediate: true })

const normalizePhone = (phone: string): string => { let d = phone.replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('0')) d = d.slice(1); if (!d.startsWith('58')) d = '58' + d; return '+' + d }

const validateForm = (): boolean => {
  errors.value = {}; const rowErrors: Record<number, Partial<Record<string, string>>> = {}
  if (!formData.value.clientName.trim() || formData.value.clientName.length < 2) errors.value.clientName = 'El nombre del cliente es requerido'
  const phone = formData.value.clientPhone.trim()
  if (!phone) { errors.value.clientPhone = 'El teléfono es requerido' }
  else { formData.value.clientPhone = normalizePhone(phone); if (formData.value.clientPhone.length < 10) errors.value.clientPhone = 'Al menos 10 dígitos'; else if (!/^\+58\d{9,}$/.test(formData.value.clientPhone)) errors.value.clientPhone = 'Formato inválido' }
  if (!formData.value.service) rowErrors[0] = { ...rowErrors[0], serviceId: 'Selecciona un servicio' }
  if (!formData.value.employee) rowErrors[0] = { ...rowErrors[0], employeeId: 'Selecciona un empleado' }
  if (formData.value.assistantEmployee && formData.value.assistantEmployee === formData.value.employee) rowErrors[0] = { ...rowErrors[0], assistantEmployeeId: 'El asistente no puede ser el mismo empleado' }
  if (formData.value.assistantEmployee && !formData.value.assistantPercentage) rowErrors[0] = { ...rowErrors[0], assistantPercentage: 'Define el porcentaje del asistente' }
  for (let i = 0; i < formData.value.extraServices.length; i++) { const e = formData.value.extraServices[i]; const idx = i + 1; if (!e.serviceId) rowErrors[idx] = { ...rowErrors[idx], serviceId: 'Selecciona un servicio' }; if (!e.employeeId) rowErrors[idx] = { ...rowErrors[idx], employeeId: 'Selecciona un empleado' }; if (e.assistantEmployeeId && e.assistantEmployeeId === e.employeeId) rowErrors[idx] = { ...rowErrors[idx], assistantEmployeeId: 'El asistente no puede ser el mismo empleado' }; if (e.assistantEmployeeId && !e.assistantPercentage) rowErrors[idx] = { ...rowErrors[idx], assistantPercentage: 'Define el porcentaje del asistente' } }
  if (!formData.value.date) errors.value.date = 'Selecciona una fecha'
  if (!formData.value.time) errors.value.time = 'Selecciona una hora'

  // ── Overlap check ──
  if (formData.value.date && formData.value.time && formData.value.employee && !errors.value.time) {
    const durationMin = formData.value.duration || 30
    const startTime = new Date(`${formData.value.date}T${formData.value.time}:00`)
    const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000)
    const editingId = modalData.value?.cita?.id
    const allQueries = queryClient.getQueriesData<any[]>({ queryKey: ['appointments'], exact: false })
    const cachedAppts = allQueries.flatMap(([, data]) => (Array.isArray(data) ? data : []))
    const isConflictFor = (empId: string) => cachedAppts.some((a: any) => {
      if (a.id === editingId) return false
      const aStatus = a.status ?? a.paymentStatus
      if (aStatus === 'cancelled') return false
      const aEmpId = a.employeeId ?? a.employee_id
      const aAsstId = a.assistantId ?? a.assistant_employee_id
      if (aEmpId !== empId && aAsstId !== empId) return false
      const aStart = a.start_time
        ? new Date(a.start_time)
        : new Date(`${a.date}T${a.time}:00`)
      const aDuration = (a.duration ?? 30) * 60 * 1000
      const aEnd = new Date(aStart.getTime() + aDuration)
      return aStart < endTime && aEnd > startTime
    })
    if (isConflictFor(formData.value.employee)) {
      errors.value.time = 'El empleado ya tiene una cita en ese horario'
    } else if (formData.value.assistantEmployee && isConflictFor(formData.value.assistantEmployee)) {
      rowErrors[0] = { ...rowErrors[0], assistantEmployeeId: 'El asistente ya tiene una cita en ese horario' }
    }
    for (let i = 0; i < formData.value.extraServices.length; i++) {
      const e = formData.value.extraServices[i]
      const idx = i + 1
      if (e.employeeId && isConflictFor(e.employeeId)) {
        rowErrors[idx] = { ...rowErrors[idx], employeeId: 'El empleado ya tiene una cita en ese horario' }
      }
      if (e.assistantEmployeeId && isConflictFor(e.assistantEmployeeId)) {
        rowErrors[idx] = { ...rowErrors[idx], assistantEmployeeId: 'El asistente ya tiene una cita en ese horario' }
      }
    }
  }

  if (Object.keys(rowErrors).length > 0) (errors.value as any).rowErrors = rowErrors
  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (saveInProgress.value) return
  if (!validateForm()) { showError('Por favor corrige los errores en el formulario'); return }
  saveInProgress.value = true

  const citaData: CitaFormData & { id?: string; clientPhone?: string; paymentData?: PaymentEditContext } = {
    ...formData.value,
  }

  if (modalData.value?.cita?.id) {
    citaData.id = modalData.value.cita.id
  }

  const paymentData = paymentEditorRef.value?.getPaymentData()
  if (paymentData) {
    citaData.paymentData = paymentData
  }

  emit('save', citaData)
}

const onSaveComplete = () => { saveInProgress.value = false }
const confirmDelete = () => { const id = modalData.value?.cita?.id; if (id) emit('delete', id) }
const open = (cita?: Cita, paymentData?: PaymentEditContext) => { useModal(MODAL_ID).open({ cita, paymentData }) }

defineExpose({ open, close, isOpen, onSaveComplete })
</script>
