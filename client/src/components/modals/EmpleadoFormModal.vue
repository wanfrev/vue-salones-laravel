<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.employee}` : `Nuevo ${t.employee}`"
    :subtitle="isEditing ? `Editando a ${formData.name}` : `Agrega un nuevo ${t.employee.toLowerCase()} al equipo`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'"
    size="full"
    :is-loading="isLoading"
    :is-confirm-disabled="!isFormValid"
    :confirm-text="`Guardar ${t.employee}`"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- COLUMNA IZQUIERDA: Perfil y Acceso -->
        <div class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Perfil y acceso</p>

          <FormInput
            v-model="formData.name"
            label="Nombre completo"
            placeholder="Ej: Carlos Méndez"
            required
            prefix-icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            :error="errors.name"
          />

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormSelect
              v-if="!showingCustomRole"
              v-model="formData.role"
              label="Rol / Puesto"
              :options="roleOptions"
              required
              :error="errors.role"
            />
            <div v-else class="flex gap-2">
              <FormInput
                v-model="formData.role"
                label="Rol / Puesto"
                placeholder="Escribe el rol..."
                required
                :error="errors.role"
                class="flex-1"
              />
              <button
                type="button"
                class="mt-6 shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-theme hover:bg-bg-secondary"
                @click="cancelCustomRole"
              >
                Volver
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              v-model="formData.phone"
              label="Teléfono"
              type="tel"
              placeholder="+58 412 1234567"
              prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              :error="errors.phone"
            />

            <FormInput
              v-model="formData.email"
              label="Email"
              type="email"
              placeholder="carlos@email.com"
              required
              prefix-icon="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
              :error="errors.email"
            />
          </div>

          <FormInput
            v-model="formData.password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            :required="!isEditing"
            :hint="isEditing ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres'"
            prefix-icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            :error="errors.password"
            show-password-toggle
            autocomplete="new-password"
          />

          <label class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Desactivar agenda</p>
              <p class="text-xs text-text-muted">Oculta Calendario y Agenda para este empleado</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="formData.disableAgenda"
              @click="formData.disableAgenda = !formData.disableAgenda"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2',
                formData.disableAgenda ? 'bg-primary border-primary' : 'bg-border border-border'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  formData.disableAgenda ? 'translate-x-4' : 'translate-x-0'
                ]"
              />
            </button>
          </label>
        </div>

        <!-- COLUMNA DERECHA: Contratación -->
        <div class="space-y-4 lg:border-l lg:border-border lg:pl-6">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Contratación</p>

          <!-- Tipo de pago -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormSelect
              v-model="formData.payType"
              label="Tipo de pago"
              :options="payTypeOptions"
              required
              :error="errors.payType"
            />
            <FormSelect
              v-model="formData.salaryFrequency"
              label="Frecuencia"
              :options="salaryFrequencyOptions"
              :disabled="formData.payType === 'percentage'"
              :error="errors.salaryFrequency"
            />
          </div>

          <!-- Condiciones económicas -->
          <div class="rounded-lg bg-bg-secondary/50 p-3 space-y-3">
            <p class="text-xs font-medium text-text-muted">Condiciones económicas</p>
            <div class="grid grid-cols-2 gap-3">
              <FormInput
                v-model.number="formData.payPercentage"
                :label="`% ${t.employee}`"
                type="number"
                min="0"
                max="100"
                placeholder="50"
                :disabled="formData.payType === 'salary'"
                :error="errors.payPercentage"
              />
              <FormInput
                v-model.number="formData.baseSalary"
                label="Sueldo base ($)"
                type="number"
                min="0"
                placeholder="0"
                :disabled="formData.payType === 'percentage'"
                :error="errors.baseSalary"
              />
            </div>
          </div>

          <!-- Horario -->
          <div>
            <p class="text-xs font-medium text-text-muted mb-2">Horario laboral</p>
            <div class="grid grid-cols-3 gap-2">
              <FormTime
                v-model="formData.scheduleStart"
                label="Entrada"
                required
                :error="errors.scheduleStart"
              />
              <FormTime
                v-model="formData.scheduleEnd"
                label="Salida"
                required
                :error="errors.scheduleEnd"
              />
              <FormInput
                v-model="formData.scheduleBreak"
                label="Descanso"
                type="text"
                placeholder="13:00-14:00"
                :error="errors.scheduleBreak"
              />
            </div>
          </div>

          <!-- Días laborales -->
          <div>
            <p class="text-xs font-medium text-text-muted mb-2">Días laborales</p>
            <div class="flex gap-1">
              <button
                v-for="day in dayOptions"
                :key="day.value"
                type="button"
                @click="toggleDay(day.value)"
                :class="[
                  'flex-1 rounded-lg border py-2 text-xs font-semibold transition-theme',
                  activeDaysSet.has(day.value)
                    ? 'border-primary bg-primary text-text-inverse'
                    : 'border-border text-text-muted hover:border-border-strong hover:bg-bg-secondary'
                ]"
              >
                {{ day.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isEditing" class="border-t border-border mt-6 pt-4">
        <button
          type="button"
          class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10"
          @click="confirmDelete"
        >
          Eliminar {{ t.employee.toLowerCase() }}
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useModal } from '../../composables/useModal'
import { useNotification } from '../../composables/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { addBusinessJobTitle } from '../../services/equipoService'
import type { Empleado, EmpleadoFormData } from '../../types/empleado'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormSelect, FormTime } from '../forms'

const MODAL_ID = 'empleado-form-modal'

const props = withDefaults(defineProps<{ isSaving?: boolean }>(), {
  isSaving: false,
})

const emit = defineEmits<{
  save: [empleado: EmpleadoFormData & { id?: string }]
  delete: [empleadoId: string]
}>()

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const authStore = useAuthStore()
const businessStore = useBusinessStore()

const t = computed(() => businessStore.terminology)

const isSubmitting = ref(false)
const isLoading = computed(() => isSubmitting.value || props.isSaving)
const isEditing = computed(() => !!modalData.value?.empleado)

const showingCustomRole = ref(false)

const roleOptions = computed(() => {
  const titles = businessStore.jobTitles || []
  const options = titles.map((t: string) => ({ value: t, label: t }))
  options.push({ value: '__new__', label: '+ Agregar nuevo' })
  return options
})

const cancelCustomRole = () => {
  showingCustomRole.value = false
  formData.value.role = ''
}

const payTypeOptions = [
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'salary', label: 'Sueldo base' },
  { value: 'mixed', label: 'Sueldo + %' },
]

const salaryFrequencyOptions = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
]

const dayOptions = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
]

const activeDaysSet = reactive(new Set<number>([1, 2, 3, 4, 5, 6]))

const toggleDay = (day: number) => {
  if (activeDaysSet.has(day)) {
    activeDaysSet.delete(day)
  } else {
    activeDaysSet.add(day)
  }
  formData.value.activeDays = [...activeDaysSet]
}

const defaultFormData: EmpleadoFormData = {
  name: '',
  role: '',
  phone: '',
  email: '',
  password: '',
  specialties: [],
  scheduleStart: '09:00',
  scheduleEnd: '18:00',
  scheduleBreak: '13:00 - 14:00',
  payType: 'percentage',
  payPercentage: 50,
  baseSalary: 0,
  salaryFrequency: 'monthly',
  activeDays: [1, 2, 3, 4, 5, 6],
  disableAgenda: false,
}

const formData = ref<EmpleadoFormData>({ ...defaultFormData })
const errors = ref<Partial<Record<keyof EmpleadoFormData, string>>>({})

const isFormValid = computed(() => {
  const nameValid = formData.value.name.trim().length >= 2
  const roleValid = formData.value.role !== ''
  const emailValid = formData.value.email.trim().length >= 5
  const pwd = formData.value.password
  const passwordValid = pwd.length === 0 ? isEditing.value : pwd.length >= 6
  return nameValid && roleValid && emailValid && passwordValid
})

watch(
  [isOpen, () => modalData.value?.empleado],
  ([open, empleado]) => {
    if (!open) return

    showingCustomRole.value = false

    if (empleado) {
      formData.value = {
        name: empleado.name || '',
        role: empleado.role || '',
        phone: empleado.phone || '',
        email: empleado.email || '',
        password: '',
        specialties: empleado.specialties || [],
        scheduleStart: empleado.schedule?.start || '09:00',
        scheduleEnd: empleado.schedule?.end || '18:00',
        scheduleBreak: empleado.schedule?.break || '13:00 - 14:00',
        payType: empleado.payType || 'percentage',
        payPercentage: empleado.payPercentage || 0,
        baseSalary: empleado.baseSalary || 0,
        salaryFrequency: empleado.salaryFrequency || 'monthly',
        activeDays: [1, 2, 3, 4, 5, 6],
        disableAgenda: empleado.disableAgenda ?? false,
      }
    } else {
      formData.value = { ...defaultFormData }
    }
    activeDaysSet.clear()
    for (const d of formData.value.activeDays) {
      activeDaysSet.add(d)
    }
    errors.value = {}
  },
  { immediate: true }
)

watch(
  () => formData.value.role,
  (role) => {
    if (role === '__new__') {
      showingCustomRole.value = true
      formData.value.role = ''
    }
  }
)

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.name.trim() || formData.value.name.length < 2) {
    errors.value.name = 'El nombre debe tener al menos 2 caracteres'
  }

  if (!formData.value.role.trim()) {
    errors.value.role = 'El rol / puesto es obligatorio'
  }

  if (formData.value.payType !== 'salary' && (formData.value.payPercentage < 0 || formData.value.payPercentage > 100)) {
    errors.value.payPercentage = 'El porcentaje debe estar entre 0 y 100'
  }

  if (formData.value.payType !== 'percentage' && formData.value.baseSalary < 0) {
    errors.value.baseSalary = 'El sueldo base no puede ser negativo'
  }

  if (!formData.value.email.trim()) {
    errors.value.email = 'El email es obligatorio'
  } else if (!isValidEmail(formData.value.email)) {
    errors.value.email = 'El email no es válido'
  }

  const pwdLength = formData.value.password.length

  if (pwdLength === 0) {
    if (!isEditing.value) {
      errors.value.password = 'La contraseña debe tener al menos 6 caracteres'
    }
  } else if (pwdLength < 6) {
    errors.value.password = 'La contraseña debe tener al menos 6 caracteres'
  }

  return Object.keys(errors.value).length === 0
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const confirmDelete = () => {
  const id = modalData.value?.empleado?.id
  if (!id) return
  const name = formData.value.name
  const msg = `¿Eliminar a "${name}"?\n\nEl empleado perderá el acceso al sistema. Esta acción no se puede deshacer.`
  if (window.confirm(msg)) {
    emit('delete', id)
  }
}

const handleSubmit = async () => {
  if (isLoading.value) return

  if (!validateForm()) {
    showError('Por favor corrige los errores en el formulario')
    return
  }

  isSubmitting.value = true

  try {
    const role = formData.value.role.trim()

    const businessId = authStore.businessId
    if (businessId && role && !businessStore.jobTitles.includes(role)) {
      const updated = await addBusinessJobTitle(businessId, role)
      businessStore.updateBusiness({ job_titles: updated })
    }

    const empleadoData: EmpleadoFormData & { id?: string } = {
      ...formData.value,
      role,
      activeDays: [...activeDaysSet],
    }

    if (modalData.value?.empleado?.id) {
      empleadoData.id = modalData.value.empleado.id
    }

    emit('save', empleadoData)
  } catch (err) {
    showError(`Error al guardar el ${t.value.employee.toLowerCase()}`)
    console.error(err)
  } finally {
    isSubmitting.value = false
  }
}

const open = (empleado?: Empleado) => {
  useModal(MODAL_ID).open({ empleado })
}

defineExpose({
  open,
  close,
  isOpen,
})
</script>
