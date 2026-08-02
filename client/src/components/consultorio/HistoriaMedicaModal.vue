<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? 'Editar Historia Médica' : 'Nueva Historia Médica'"
    subtitle="Completa el registro clínico del paciente"
    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 002 2z"
    size="xl"
    :is-loading="saveInProgress"
    :is-confirm-disabled="!isFormValid || saveInProgress"
    :confirm-text="saveInProgress ? 'Guardando...' : (isEditing ? 'Actualizar Historia' : 'Guardar Historia')"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent class="space-y-5">
      <!-- BLOQUE 1: DATOS DEL TUTOR Y MASCOTA -->
      <div class="space-y-3 rounded-xl border border-border bg-bg-secondary/20 p-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-primary">Datos del Tutor y Paciente</h3>
        
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
          <FormInput
            v-model="formData.clientPhone"
            label="Teléfono del Tutor"
            type="tel"
            placeholder="+58 412 1234567"
            required
            prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            :error="errors.clientPhone"
          />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormInput
            v-model="formData.clientEmail"
            label="Correo Electrónico (Opcional)"
            type="email"
            placeholder="tutor@correo.com"
            prefix-icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />

          <FormDropdown
            :model-value="formData.petId ?? ''"
            label="Mascota / Paciente"
            placeholder="Seleccionar mascota"
            :options="petOptions"
            size="sm"
            required
            @update:model-value="formData.petId = String($event)"
          />

          <FormInput
            v-model="formData.date"
            label="Fecha de Atención"
            type="date"
            required
            prefix-icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </div>

        <div class="grid grid-cols-1">
          <FormDropdown
            v-model="formData.employeeId"
            label="Atendido por (Veterinario)"
            placeholder="Seleccionar profesional"
            :options="employeeOptions"
            size="sm"
            required
          />
        </div>
      </div>

      <!-- BLOQUE 2: EVALUACIÓN POR SISTEMAS (DIAGNÓSTICO) -->
      <div class="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div class="flex items-center gap-2 border-b border-primary/10 pb-2">
          <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 class="font-bold text-primary">Diagnóstico por Sistemas</h3>
        </div>
        <p class="text-xs text-text-muted">Si un campo queda en blanco, se registrará automáticamente como "No aplica".</p>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput v-model="formData.clinicalHistory['Oftálmico']" label="Sistema Oftálmico / Ojos" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Otológico']" label="Sistema Otológico / Oídos" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Tegumentario']" label="Sistema Tegumentario / Piel y Anexos" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Músculo-Esquelético']" label="Sistema Músculo-Esquelético" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Respiratorio']" label="Sistema Respiratorio" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Cardiovascular']" label="Sistema Cardiovascular" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Gastrointestinal']" label="Sistema Gastrointestinal / Digestivo" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Genitourinario']" label="Sistema Genitourinario (Urinario y Reproductor)" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Nervioso']" label="Sistema Nervioso / Neurológico" placeholder="Hallazgos..." />
          <FormInput v-model="formData.clinicalHistory['Linfático']" label="Sistema Linfático / Inmunológico" placeholder="Hallazgos..." />
        </div>
        <FormTextarea v-model="formData.clinicalHistory['Otros']" label="Otros diagnósticos por sistemas" placeholder="Otros hallazgos relevantes..." :rows="2" />
      </div>

      <!-- BLOQUE 3: DIAGNÓSTICO GENERAL Y TRATAMIENTO -->
      <div class="space-y-4 rounded-xl border border-border bg-surface p-4">
        <FormTextarea v-model="formData.diagnosis" label="Diagnóstico General" placeholder="Diagnóstico definitivo o presuntivo..." :rows="2" />
        <FormTextarea v-model="formData.treatment" label="Tratamiento Indicado" placeholder="Medicamentos, dosis, procedimiento realizado, indicaciones..." :rows="3" />
        <FormTextarea v-model="formData.notes" label="Notas Adicionales / Observaciones" placeholder="Notas internas..." :rows="2" />
      </div>

      <div v-if="isEditing" class="border-t border-border pt-4">
        <button
          type="button"
          @click="handleDelete"
          class="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/15"
        >
          Eliminar Historia Médica
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { toISODate, getInitials } from '../../lib/formatters'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown, FormTextarea } from '../forms'
import CitaClientSearch from '../forms/CitaClientSearch.vue'
import { listPetsByClient } from '../../services/petService'
import { listServicios } from '../../services/serviciosService'
import { listEquipo } from '../../services/equipoService'
import { saveCita, deleteCita } from '../../services/agendaService'
import { useQueryClient } from '@tanstack/vue-query'
import type { Pet } from '../../types/database'

const MODAL_ID = 'historia-medica-modal'

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { success, error: showError } = useNotification()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const queryClient = useQueryClient()

const saveInProgress = ref(false)
const clientPets = ref<Pet[]>([])
const serviciosList = ref<any[]>([])
const empleadosList = ref<any[]>([])

const isEmployee = computed(() => authStore.role === 'empleado')
const canCreateClients = computed(() => !isEmployee.value || businessStore.hasFeature('employees_create_clients'))
const t = computed(() => businessStore.terminology)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const isEditing = computed(() => !!(modalData.value?.cita?.id))

const SYSTEM_KEYS = [
  'Oftálmico',
  'Otológico',
  'Tegumentario',
  'Músculo-Esquelético',
  'Respiratorio',
  'Cardiovascular',
  'Gastrointestinal',
  'Genitourinario',
  'Nervioso',
  'Linfático',
  'Otros',
]

const defaultFormData = () => ({
  id: undefined as string | undefined,
  clientId: undefined as string | undefined,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  petId: '',
  employeeId: isEmployee.value ? (authStore.profile?.id ?? '') : '',
  serviceName: 'Consulta Médica',
  date: toISODate(new Date()),
  diagnosis: '',
  treatment: '',
  notes: '',
  clinicalHistory: SYSTEM_KEYS.reduce((acc, k) => ({ ...acc, [k]: '' }), {} as Record<string, string>),
})

const formData = ref(defaultFormData())
const errors = reactive<Record<string, string>>({})

const loadDependencies = async () => {
  if (!businessId.value) return
  try {
    const [svcs, emps] = await Promise.all([
      listServicios(businessId.value, branchId.value),
      listEquipo(businessId.value, branchId.value),
    ])
    serviciosList.value = svcs ?? []
    empleadosList.value = emps ?? []
  } catch (err) {
    console.error('Failed to load dependencies', err)
  }
}

const petOptions = computed(() => {
  const opts = [{ value: '', label: `Seleccionar ${(t.value.pet || 'mascota').toLowerCase()}` }]
  return [...opts, ...clientPets.value.map(p => ({ value: p.id, label: p.name }))]
})

const employeeOptions = computed(() => {
  const empList = empleadosList.value.filter(e => !e.disableAgenda)
  return empList.map(e => ({ value: e.id, label: e.name, icon: getInitials(e.name) }))
})

const onClientSelected = (client: { id: string; email?: string }) => {
  formData.value.clientId = client.id
  if (client.email) {
    formData.value.clientEmail = client.email
  }
  loadClientPets(client.id)
}

const loadClientPets = async (clientId: string) => {
  try {
    clientPets.value = await listPetsByClient(clientId)
    if (clientPets.value.length > 0 && !formData.value.petId) {
      formData.value.petId = clientPets.value[0].id
    }
  } catch {
    clientPets.value = []
  }
}

const isFormValid = computed(() => {
  return (
    formData.value.clientName.trim().length >= 2 &&
    formData.value.clientPhone.trim().length >= 7 &&
    !!formData.value.petId &&
    !!formData.value.employeeId &&
    !!formData.value.date
  )
})

watch(isOpen, async (open) => {
  if (!open) return
  await loadDependencies()
  const cita = modalData.value?.cita
  const pet = modalData.value?.pet

  if (cita) {
    formData.value = {
      id: cita.id,
      clientId: cita.clientId || cita.client_id,
      clientName: cita.clientName || cita.client?.full_name || '',
      clientPhone: cita.clientPhone || cita.client?.phone || '',
      clientEmail: cita.clientEmail || cita.client?.email || '',
      petId: cita.petId || cita.pet_id || pet?.id || '',
      employeeId: cita.employeeId || cita.employee_id || '',
      serviceName: cita.services?.name || cita.service?.name || 'Consulta Médica',
      date: cita.date || (cita.start_time ? toISODate(new Date(cita.start_time)) : toISODate(new Date())),
      diagnosis: cita.diagnosis || '',
      treatment: cita.treatment || '',
      notes: cita.notes || cita.internal_notes || '',
      clinicalHistory: {
        ...SYSTEM_KEYS.reduce((acc, k) => ({ ...acc, [k]: '' }), {}),
        ...(cita.clinicalHistory || cita.clinical_history || {}),
      },
    }
    if (formData.value.clientId) {
      loadClientPets(formData.value.clientId)
    }
  } else {
    formData.value = defaultFormData()
    if (pet) {
      formData.value.petId = pet.id
      formData.value.clientId = pet.client_id
      if (pet.client) {
        formData.value.clientName = pet.client.full_name || pet.client.name || ''
        formData.value.clientPhone = pet.client.phone || ''
        formData.value.clientEmail = pet.client.email || ''
      }
      if (pet.client_id) {
        loadClientPets(pet.client_id)
      }
    }
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (saveInProgress.value || !isFormValid.value || !businessId.value) return
  saveInProgress.value = true

  try {
    // Fill empty system fields with "No aplica" as requested
    const processedHistory: Record<string, string> = {}
    for (const key of SYSTEM_KEYS) {
      const val = formData.value.clinicalHistory[key]
      if (!val || !val.trim()) {
        processedHistory[key] = 'No aplica'
      } else {
        processedHistory[key] = val.trim()
      }
    }

    const finalDiagnosis = formData.value.diagnosis.trim() || 'No aplica'
    const finalTreatment = formData.value.treatment.trim() || 'No aplica'

    // Ensure we have a valid service ID from DB
    if (serviciosList.value.length === 0) {
      serviciosList.value = (await listServicios(businessId.value, branchId.value)) ?? []
    }
    const defaultServiceId = serviciosList.value[0]?.id
    if (!defaultServiceId) {
      throw new Error('No se encontró ningún servicio registrado. Por favor crea al menos un servicio en el sistema.')
    }

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const payload: any = {
      id: formData.value.id,
      clientId: formData.value.clientId,
      clientName: formData.value.clientName.trim(),
      clientPhone: formData.value.clientPhone.trim(),
      clientEmail: formData.value.clientEmail.trim(),
      petId: formData.value.petId,
      service: defaultServiceId,
      employee: formData.value.employeeId,
      date: formData.value.date,
      time: currentTime,
      status: 'completed',
      source: 'internal',
      diagnosis: finalDiagnosis,
      treatment: finalTreatment,
      notes: formData.value.notes.trim() || 'No aplica',
      clinicalHistory: processedHistory,
      duration: 1,
      price: 0,
      extraServices: [],
      associatedProducts: [],
    }

    await saveCita(businessId.value, payload, authStore.profile?.id, branchId.value, canCreateClients.value)

    await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    await queryClient.invalidateQueries({ queryKey: ['pets'], exact: false })

    success(isEditing.value ? 'Historia clínica actualizada' : 'Historia clínica guardada con éxito')
    close()
  } catch (err: any) {
    showError(err?.message || 'Error al guardar la historia clínica')
  } finally {
    saveInProgress.value = false
  }
}

const handleDelete = async () => {
  if (!formData.value.id) return
  if (!window.confirm('¿Deseas eliminar esta historia médica? Esta acción no se puede deshacer.')) return
  saveInProgress.value = true
  try {
    await deleteCita(formData.value.id)
    await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    await queryClient.invalidateQueries({ queryKey: ['pets'], exact: false })
    success('Historia médica eliminada correctamente')
    close()
  } catch (err: any) {
    showError(err?.message || 'Error al eliminar la historia médica')
  } finally {
    saveInProgress.value = false
  }
}
</script>
