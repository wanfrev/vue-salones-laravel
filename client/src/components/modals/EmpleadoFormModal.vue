<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.employee}` : `Nuevo ${t.employee}`"
    :subtitle="isEditing ? `Editando a ${formData.name}` : `Agrega un nuevo ${t.employee.toLowerCase()} al equipo`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'"
    :size="isStaffing ? '3xl' : 'full'"
    :is-loading="isLoading"
    :is-confirm-disabled="!isFormValid"
    :confirm-text="`Guardar ${t.employee}`"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent>
      <template v-if="isStaffing">
        <div class="mx-auto max-w-2xl space-y-6">
          <StaffingEmployeeFields
            :form-data="formData"
            :business-id="authStore.businessId"
            :is-editing="isEditing"
            :bank-account-last4="editingBankAccountLast4"
            :payroll-card-last4="editingPayrollCardLast4"
            :ssn-last4="editingSsnLast4"
            :errors="errors"
            @blur="handleBlur"
            @update:model-value="formData = $event"
          />

          <EmployeeTimesheetMini
            v-if="isEditing"
            :employee-id="modalData?.empleado?.id"
            :company-id="formData.staffingCompanyId"
            :business-id="authStore.businessId"
          />
        </div>
      </template>

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            @blur="handleBlur('name')"
          />

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Nivel de acceso</label>
            <div class="flex gap-2">
              <button v-for="opt in systemRoleOptions" :key="opt.value" type="button"
                @click="formData.systemRole = opt.value"
                class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                :class="formData.systemRole === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-border-strong'">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div v-if="formData.systemRole !== 'encargado'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormDropdown
              v-if="!showingCustomRole"
              v-model="formData.role"
              label="Rol / Puesto"
              placeholder="Seleccionar rol..."
              :options="roleOptions"
              required
              searchable
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
              @blur="handleBlur('email')"
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
            @blur="handleBlur('password')"
            show-password-toggle
            autocomplete="new-password"
          />

          <label v-if="formData.systemRole !== 'cajero'" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
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

          <label v-if="formData.systemRole !== 'cajero'" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede agendar citas</p>
              <p class="text-xs text-text-muted">Permite crear y gestionar citas desde su perfil</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canCreateAppointments"
              @click="formData.canCreateAppointments = !formData.canCreateAppointments"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canCreateAppointments ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canCreateAppointments ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'cajero'" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede crear clientes</p>
              <p class="text-xs text-text-muted">Permite registrar nuevos clientes desde su perfil</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canCreateClients"
              @click="formData.canCreateClients = !formData.canCreateClients"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canCreateClients ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canCreateClients ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'cajero' && isPetNicheBusiness" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede ver Consultorio</p>
              <p class="text-xs text-text-muted">Permite acceder al módulo de historia clínica veterinaria</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessConsultorio"
              @click="formData.canAccessConsultorio = !formData.canAccessConsultorio"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessConsultorio ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessConsultorio ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <!-- Store Permissions -->
          <label v-if="formData.systemRole !== 'encargado' && businessStore.features.inventario" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede acceder a Inventario</p>
              <p class="text-xs text-text-muted">Permite consultar el inventario (solo lectura)</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessInventory"
              @click="formData.canAccessInventory = !formData.canAccessInventory"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessInventory ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessInventory ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'encargado' && businessStore.features.inventario && formData.canAccessInventory" class="ml-4 flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede editar inventario</p>
              <p class="text-xs text-text-muted">Si está apagado, solo puede consultar — no crear, editar ni ajustar stock</p>
            </div>
            <button type="button" role="switch" :aria-checked="!formData.disableInventoryEdit"
              @click="formData.disableInventoryEdit = !formData.disableInventoryEdit"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', !formData.disableInventoryEdit ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', !formData.disableInventoryEdit ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'encargado' && businessStore.features.pos" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede acceder al POS</p>
              <p class="text-xs text-text-muted">Permite procesar ventas en el Punto de Venta</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessPos"
              @click="formData.canAccessPos = !formData.canAccessPos"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessPos ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessPos ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'encargado' && businessStore.features.proveedores" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede gestionar Proveedores</p>
              <p class="text-xs text-text-muted">Permite ver y editar la lista de proveedores</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessSuppliers"
              @click="formData.canAccessSuppliers = !formData.canAccessSuppliers"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessSuppliers ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessSuppliers ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'encargado' && isTienda" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede acceder a Finanzas</p>
              <p class="text-xs text-text-muted">Permite ver el módulo de finanzas de la tienda</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessFinanzas"
              @click="formData.canAccessFinanzas = !formData.canAccessFinanzas"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessFinanzas ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessFinanzas ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>

          <label v-if="formData.systemRole !== 'encargado' && isTienda" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
            <div class="flex-1">
              <p class="text-sm font-medium text-text">Puede acceder a Requerimientos</p>
              <p class="text-xs text-text-muted">Permite ver y registrar productos faltantes</p>
            </div>
            <button type="button" role="switch" :aria-checked="formData.canAccessRequirements"
              @click="formData.canAccessRequirements = !formData.canAccessRequirements"
              :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2', formData.canAccessRequirements ? 'bg-primary border-primary' : 'bg-border border-border']">
              <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', formData.canAccessRequirements ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </label>
        </div>

        <!-- COLUMNA DERECHA: Contratación -->
        <div class="space-y-4 lg:border-l lg:border-border lg:pl-6">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Contratación</p>

          <!-- Tipo de pago -->
          <SalaryConfig
            :formData="formData"
            :terminology="t"
            :errors="errors as any"
            @update:model-value="formData = $event"
          />

          <!-- Horario -->
          <ScheduleEditor
            :formData="formData"
            :errors="errors as any"
            @update:model-value="formData = $event"
          />
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
import { ref, computed, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { addBusinessJobTitle } from '../../services/equipoService'
import { useFormValidation } from '../../composables/common/useFormValidation'
import { empleadoFormSchema } from '../../lib/validation'
import { isPetNiche } from '../../config/nicheFields'
import { isTiendaNiche } from '../../config/niches'
import type { Empleado, EmpleadoFormData } from '../../types/empleado'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown } from '../forms'
import SalaryConfig from '../equipo/SalaryConfig.vue'
import ScheduleEditor from '../equipo/ScheduleEditor.vue'
import StaffingEmployeeFields from '../equipo/StaffingEmployeeFields.vue'
import EmployeeTimesheetMini from '../staffing/EmployeeTimesheetMini.vue'

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

const isPetNicheBusiness = computed(() => isPetNiche(businessStore.nicheType))
const isTienda = computed(() => isTiendaNiche(businessStore.nicheType))
// A staffing niche has two very different kinds of "team member": the workers placed at
// client companies (no login at all — pay comes from the company + rate card) and the
// The user requested that for the Staffing niche, all employees use the new unified form
// without separate "internal" profiles. So this simply checks the niche capability.
const isStaffing = computed(() => businessStore.hasCapability('staffing.timesheets'))

const isSubmitting = ref(false)
const isLoading = computed(() => isSubmitting.value || props.isSaving)
const isEditing = computed(() => !!modalData.value?.empleado)

const systemRoleOptions = [
  { value: 'empleado' as const, label: 'Empleado' },
  { value: 'encargado' as const, label: 'Encargado' },
]

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

const defaultFormData: EmpleadoFormData = {
  name: '',
  role: '',
  systemRole: 'empleado',
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
  // Read-only by default: a newly granted canAccessInventory shouldn't silently come with
  // write access — edit is a separate, explicit toggle (see the canAccessInventory watcher).
  disableInventoryEdit: true,
  canCreateAppointments: true,
  canCreateClients: true,
  canAccessConsultorio: true,
  canAccessInventory: false,
  canAccessPos: false,
  canAccessSuppliers: false,
  canAccessFinanzas: false,
  canAccessRequirements: false,
  staffingCompanyId: '',
  staffingTaxRate: null,
  address: '',
  ssn: '',
  bankName: '',
  bankAccountHolder: '',
  bankAccountType: '',
  paymentMethod: '',
  bankRoutingNumber: '',
  bankAccountNumber: '',
  payrollCardNumber: '',
}

const formData = ref<EmpleadoFormData>({ ...defaultFormData })
const { errors, isValid, validate, clearErrors, handleBlur } = useFormValidation(empleadoFormSchema as any, formData) as any as ReturnType<typeof useFormValidation>

// Populated from the saved record on edit — masked hints only, the modal never sees the
// full number. See Profile::$hidden / bank_account_last4 / payroll_card_last4 / ssn_last4.
const editingBankAccountLast4 = ref<string | null>(null)
const editingPayrollCardLast4 = ref<string | null>(null)
const editingSsnLast4 = ref<string | null>(null)

const isFormValid = computed(() => {
  const nameValid = formData.value.name.trim().length >= 2
  const roleValid = formData.value.systemRole === 'encargado' ? true : formData.value.role !== ''
  if (isStaffing.value) {
    return nameValid && roleValid && formData.value.staffingCompanyId !== ''
  }
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
        systemRole: (empleado.systemRole === 'encargado' ? 'encargado' : 'empleado'),
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
        disableInventoryEdit: empleado.disableInventoryEdit ?? false,
        canCreateAppointments: empleado.canCreateAppointments ?? true,
        canCreateClients: empleado.canCreateClients ?? true,
        canAccessConsultorio: empleado.canAccessConsultorio ?? true,
        canAccessInventory: empleado.canAccessInventory ?? false,
        canAccessPos: empleado.canAccessPos ?? false,
        canAccessSuppliers: empleado.canAccessSuppliers ?? false,
        canAccessFinanzas: empleado.canAccessFinanzas ?? false,
        canAccessRequirements: empleado.canAccessRequirements ?? false,
        staffingCompanyId: empleado.staffingCompanyId ?? '',
        staffingTaxRate: empleado.staffingTaxRate ?? null,
        address: empleado.address ?? '',
        bankName: empleado.bankName ?? '',
        bankAccountHolder: empleado.bankAccountHolder ?? '',
        bankAccountType: empleado.bankAccountType ?? '',
        paymentMethod: empleado.paymentMethod ?? '',
        // Write-only — never prefilled from the saved record, only the masked hints below are.
        bankRoutingNumber: '',
        bankAccountNumber: '',
        payrollCardNumber: '',
        ssn: '',
      }
      editingBankAccountLast4.value = empleado.bankAccountLast4 ?? null
      editingPayrollCardLast4.value = empleado.payrollCardLast4 ?? null
      editingSsnLast4.value = empleado.ssnLast4 ?? null
    } else {
      formData.value = {
        ...defaultFormData,
        staffingCompanyId: modalData.value?.presetCompanyId ?? '',
      }
      editingBankAccountLast4.value = null
      editingPayrollCardLast4.value = null
      editingSsnLast4.value = null
    }
    clearErrors()
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

watch(
  () => formData.value.systemRole,
  (newRole) => {
    if (newRole === 'encargado') {
      formData.value.role = 'Encargado'
    } else if (newRole === 'cajero') {
      formData.value.role = 'Cajero'
      formData.value.disableAgenda = true
      formData.value.canCreateAppointments = false
      formData.value.canCreateClients = false
      formData.value.canAccessConsultorio = false
      formData.value.canAccessInventory = false
      formData.value.canAccessPos = true
      formData.value.canAccessSuppliers = false
      formData.value.canAccessFinanzas = false
      formData.value.canAccessRequirements = false
    }
  }
)

// Turning inventory access ON must not silently grant write access — edit is a separate,
// explicit admin decision. Also keeps the stored disableInventoryEdit value honest while
// access is off, even though the backend permission check already short-circuits on
// canAccessInventory alone in that case.
watch(
  () => formData.value.canAccessInventory,
  (canAccess) => {
    if (!canAccess) formData.value.disableInventoryEdit = true
  }
)

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

  if (!validate()) return

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
