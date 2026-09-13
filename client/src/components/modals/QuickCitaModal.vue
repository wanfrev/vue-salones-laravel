<template>
  <ModalBase
    :is-open="isOpen"
    title="Cita rápida"
    subtitle="Busca al paciente por nombre, teléfono o cédula y agenda en segundos"
    icon="M13 10V3L4 14h7v7l9-11h-7z"
    size="md"
    :is-loading="saveInProgress"
    :is-confirm-disabled="!isFormValid || saveInProgress"
    :confirm-text="confirmButtonLabel"
    @close="close"
    @confirm="formRef?.requestSubmit()"
  >
    <form ref="formRef" @submit.prevent="handleSubmit" class="space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CitaClientSearch
          v-model="formData.clientName"
          v-model:client-phone="formData.clientPhone"
          :business-id="businessId"
          :branch-id="branchId"
          :t="t"
          :can-create-clients="canCreateClients"
          @select-client="onClientSelected"
        />
        <FormInput
          v-if="!hidePhoneFromEmployee"
          v-model="formData.clientPhone"
          label="Teléfono"
          type="tel"
          placeholder="+58 412 1234567"
          required
          prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </div>

      <FormDropdown
        :model-value="formData.service"
        label="Tipo de consulta"
        placeholder="Seleccionar tipo de consulta"
        :options="serviceOptions"
        searchable
        required
        @update:model-value="onServiceSelected(String($event))"
      />

      <FormDropdown
        v-if="!isSingleEmployee"
        :model-value="formData.employee"
        :label="t.employee || 'Odontólogo'"
        :placeholder="`Seleccionar ${(t.employee || 'odontólogo').toLowerCase()}`"
        :options="employeeOptions"
        searchable
        required
        @update:model-value="formData.employee = String($event)"
      />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput v-model="formData.date" label="Fecha" type="date" required
          prefix-icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <FormTime v-model="formData.time" label="Hora" required />
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { toISODate, minutesToHHmm } from '../../lib/formatters'
import type { CitaFormData } from '../../types/cita'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown, FormTime } from '../forms'
import CitaClientSearch from '../forms/CitaClientSearch.vue'

const MODAL_ID = 'quick-cita-modal'

const props = defineProps<{
  servicios?: { id: string; name: string; price: number; duration: number }[]
  empleados?: { id: string; name: string; disableAgenda?: boolean }[]
}>()

const emit = defineEmits<{
  save: [cita: CitaFormData & { clientPhone?: string; clientEmail?: string }]
}>()

const saveInProgress = ref(false)
const formRef = ref<HTMLFormElement | null>(null)
const { isOpen, close } = useModal(MODAL_ID)
const authStore = useAuthStore()
const businessStore = useBusinessStore()

const isEmployee = computed(() => authStore.role === 'empleado')
const canCreateClients = computed(() => {
  if (!isEmployee.value) return true
  const profileCanCreate = authStore.profile?.can_create_clients ?? true
  const businessCanCreate = businessStore.hasFeature('employees_create_clients')
  return profileCanCreate && businessCanCreate
})
const hidePhoneFromEmployee = computed(() => isEmployee.value && businessStore.hasFeature('hide_client_phone_from_employees') && !canCreateClients.value)
const t = computed(() => businessStore.terminology)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const serviceOptions = computed(() => (props.servicios ?? []).map(s => ({ value: s.id, label: s.name, sublabel: `$${s.price} · ${s.duration} min` })))
const employeeOptions = computed(() => {
  const empList = (props.empleados ?? []).filter(e => !e.disableAgenda)
  if (isEmployee.value) {
    const me = empList.find(e => e.id === (authStore.profile?.id ?? ''))
    return me ? [{ value: me.id, label: me.name }] : []
  }
  return empList.map(e => ({ value: e.id, label: e.name }))
})
const isSingleEmployee = computed(() => employeeOptions.value.length <= 1)

function defaultFormData(): CitaFormData {
  const today = toISODate(new Date())
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const nextSlot = Math.ceil(minutes / 30) * 30
  const myId = isEmployee.value ? (authStore.profile?.id ?? '') : (employeeOptions.value.length === 1 ? employeeOptions.value[0].value : '')
  return {
    clientId: undefined, clientName: '', clientPhone: '',
    service: '', employee: myId, assistantEmployee: '', assistantPercentage: 0,
    duration: 30, price: 0, extraServices: [],
    date: today, time: minutesToHHmm(nextSlot), status: 'confirmed', notes: '',
  }
}

const formData = ref<CitaFormData>(defaultFormData())

watch(isOpen, (open) => {
  if (open) formData.value = defaultFormData()
})

function onClientSelected(client: { id: string }) {
  formData.value.clientId = client.id
}

function onServiceSelected(id: string) {
  formData.value.service = id
  const svc = props.servicios?.find(s => s.id === id)
  if (svc) {
    formData.value.price = svc.price
    formData.value.duration = svc.duration
  }
}

const isFormValid = computed(() => {
  const hasClientName = formData.value.clientName.trim().length >= 2
  const hasPhone = hidePhoneFromEmployee.value || formData.value.clientPhone.trim().length >= 7
  const hasClientRef = canCreateClients.value || !!formData.value.clientId
  return hasClientName && hasPhone && hasClientRef && !!formData.value.service && !!formData.value.employee && !!formData.value.date && !!formData.value.time
})

const confirmButtonLabel = computed(() => {
  if (saveInProgress.value) return 'Agendando...'
  if (formData.value.clientName.trim().length < 2) return 'Falta el nombre del paciente'
  if (!hidePhoneFromEmployee.value && formData.value.clientPhone.trim().length < 7) return 'Falta el teléfono'
  if (!formData.value.service) return 'Falta el tipo de consulta'
  if (!formData.value.employee) return `Falta seleccionar ${(t.value.employee || 'odontólogo').toLowerCase()}`
  return 'Agendar cita'
})

function handleSubmit() {
  if (saveInProgress.value || !isFormValid.value) return
  saveInProgress.value = true
  emit('save', {
    ...formData.value,
    clientPhone: formData.value.clientPhone || (hidePhoneFromEmployee.value ? '0000000000' : ''),
  })
}

const onSaveComplete = () => { saveInProgress.value = false }
const open = () => useModal(MODAL_ID).open()

defineExpose({ open, close, isOpen, onSaveComplete })
</script>
