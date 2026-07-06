<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.appointment}` : `Nueva ${t.appointment}`"
    :subtitle="isEditing ? `Modifica los detalles de la ${t.appointment.toLowerCase()}` : `Agenda una nueva ${t.appointment.toLowerCase()} para un ${t.client.toLowerCase()}`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="xl"
    :is-loading="isLoading"
    :is-confirm-disabled="!isFormValid || saveInProgress"
    :confirm-text="isEditing ? `Actualizar ${t.appointment}` : `Agendar ${t.appointment}`"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- ================================================================ -->
      <!-- BLOQUE 1: DATOS GENERALES (grid compacto)                        -->
      <!-- ================================================================ -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <FormInput
            v-model="formData.clientName"
            :label="t.client"
            :placeholder="`Nombre del ${t.client.toLowerCase()}`"
            required
            prefix-icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            :error="errors.clientName"
            @update:model-value="onClientNameInput"
            @blur="onClientNameBlur"
            @focus="onClientNameFocus"
          />
          <div
            v-if="showClientSuggestions && clientSuggestions.length > 0"
            class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden"
          >
            <button
              v-for="client in clientSuggestions"
              :key="client.id"
              type="button"
              @mousedown.prevent="selectClient(client)"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-secondary border-b border-border last:border-b-0"
            >
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-text truncate">{{ client.full_name }}</div>
                <div class="text-xs text-text-muted">{{ client.phone }}</div>
              </div>
            </button>
          </div>
          <div
            v-if="showClientSuggestions && clientSuggestions.length === 0 && formData.clientName.trim().length >= 1"
            class="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg px-4 py-3 text-center text-sm text-text-muted"
          >
            <template v-if="clientSearchLoading">Buscando...</template>
            <template v-else>
              <template v-if="!canCreateClients">
                No puedes crear clientes. Selecciona uno existente o contacta a un administrador.
              </template>
              <template v-else>
                Sin resultados
              </template>
            </template>
          </div>
        </div>

        <FormInput
          v-model="formData.clientPhone"
          :label="`Teléfono`"
          type="tel"
          placeholder="+58 412 1234567"
          required
          prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          :error="errors.clientPhone"
        />

        <FormInput
          v-model="formData.date"
          label="Fecha"
          type="date"
          required
          prefix-icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          :error="errors.date"
        />

        <FormTime
          v-model="formData.time"
          label="Hora"
          required
          :error="errors.time"
        />

        <FormSelect
          v-model="formData.status"
          label="Estado"
          :options="statusOptions"
          required
          :error="errors.status"
        />
      </div>

      <!-- ================================================================ -->
      <!-- BLOQUE 2: TABLA DE SERVICIOS                                     -->
      <!-- ================================================================ -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-semibold text-text">
            {{ t.service }}s
          </label>
          <button
            type="button"
            @click="addServiceRow"
            class="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Agregar {{ t.service.toLowerCase() }}
          </button>
        </div>

        <!-- Column headers -->
        <div class="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_80px_60px_36px_36px] gap-2 px-1">
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">{{ t.service }}</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">{{ t.employee }}</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider">Asistente</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider text-right">Precio</span>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wider text-right">Min</span>
          <span></span>
          <span></span>
        </div>

        <!-- Service rows -->
        <div
          v-for="(row, index) in serviceRows"
          :key="index"
          class="rounded-lg border border-border bg-bg-secondary/30"
        >
          <!-- Main row -->
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_80px_60px_36px_36px] gap-2 p-2.5 items-start">
            <FormSelect
              :model-value="row.serviceId"
              :placeholder="`Seleccionar ${t.service.toLowerCase()}`"
              :options="serviceOptions"
              :error="getRowError(index, 'serviceId')"
              size="sm"
              @update:model-value="updateServiceRow(index, 'serviceId', $event)"
            />
            <FormSelect
              :model-value="row.employeeId"
              :placeholder="t.employee"
              :options="employeeOptions"
              :disabled="isSingleEmployee"
              :error="getRowError(index, 'employeeId')"
              size="sm"
              @update:model-value="updateServiceRow(index, 'employeeId', $event)"
            />
            <FormSelect
              :model-value="row.assistantEmployeeId"
              placeholder="Sin asist."
              :options="assistantOptions"
              :error="getRowError(index, 'assistantEmployeeId')"
              size="sm"
              @update:model-value="updateServiceRow(index, 'assistantEmployeeId', $event)"
            />
            <div>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">$</span>
                <input
                  :value="String(row.price)"
                  @input="setRowPrice(index, ($event.target as HTMLInputElement).value)"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 pl-6 pr-2 text-sm border-border hover:border-border-strong text-right"
                />
              </div>
              <p v-if="getRowError(index, 'price')" class="text-xs text-danger mt-0.5">{{ getRowError(index, 'price') }}</p>
            </div>

            <!-- Duration per row -->
            <div>
              <input
                :value="String(row.duration)"
                @input="setRowDuration(index, ($event.target as HTMLInputElement).value)"
                type="number"
                class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 px-2 text-sm border-border hover:border-border-strong text-right"
              />
            </div>

            <!-- Commission gear toggle -->
            <button
              v-if="getEmployeeDefaultPercentage(row.employeeId) != null"
              type="button"
              @click="toggleCommissionDetail(index)"
              class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              :class="commissionDetailOpen.has(index) ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-secondary hover:text-text'"
              :title="commissionDetailOpen.has(index) ? 'Ocultar comisión' : 'Personalizar comisión'"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <span v-else class="w-8"></span>

            <!-- Delete row -->
            <button
              v-if="serviceRows.length > 1"
              type="button"
              @click="removeServiceRow(index)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
              title="Eliminar servicio"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <span v-else class="w-8"></span>
          </div>

          <!-- Commission detail (collapsible, below row) -->
          <div
            v-if="commissionDetailOpen.has(index) && getEmployeeDefaultPercentage(row.employeeId) != null"
            class="border-t border-border px-3 py-2"
          >
            <div class="flex items-center gap-3 text-xs">
              <span class="text-text-muted">
                Comisión: {{ getEmployeeDefaultPercentage(row.employeeId) }}%
              </span>
              <label class="flex items-center gap-1.5 text-primary cursor-pointer select-none">
                <input
                  type="checkbox"
                  :checked="hasEmployeeOverride(index)"
                  @change="toggleEmployeeOverride(index)"
                  class="rounded border-border h-3.5 w-3.5"
                />
                Personalizar
              </label>
              <input
                v-if="hasEmployeeOverride(index)"
                :value="getEmployeeOverrideValue(index)"
                @input="setEmployeeOverride(index, ($event.target as HTMLInputElement).value)"
                type="number"
                min="0"
                max="100"
                placeholder="%"
                class="w-16 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-text"
              />
            </div>
          </div>

          <!-- Assistant percentage (if assistant selected) -->
          <div
            v-if="row.assistantEmployeeId"
            class="border-t border-border px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-text-muted shrink-0">% asistente:</label>
              <input
                :value="String(row.assistantPercentage)"
                @input="updateServiceRow(index, 'assistantPercentage', ($event.target as HTMLInputElement).value)"
                type="number"
                min="0"
                max="100"
                placeholder="10"
                class="w-20 rounded border border-border bg-bg px-2 py-1 text-xs text-text"
              />
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
            <input
              :value="editableDuration"
              @input="onTotalDurationChange(($event.target as HTMLInputElement).value)"
              @blur="onTotalDurationBlur"
              type="number"
              class="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-sm font-semibold text-text text-center outline-none focus:border-primary"
            />
            <span class="text-sm text-text-muted">min</span>
          </div>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- BLOQUE 3: CIERRE (notas)                                          -->
      <!-- ================================================================ -->
      <FormTextarea
        v-model="formData.notes"
        label="Notas"
        placeholder="Notas adicionales sobre la cita..."
        :rows="2"
        :error="errors.notes"
      />

      <div v-if="isEditing" class="border-t border-border pt-4">
        <button
          type="button"
          class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10"
          @click="confirmDelete"
        >
          Eliminar {{ t.appointment.toLowerCase() }}
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useModal } from '../../composables/useModal'
import { useNotification } from '../../composables/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { toISODate, minutesToHHmm } from '../../lib/formatters'
import { searchClients } from '../../services/clientesService'
import { listCitaGroupMembers } from '../../services/agendaService'
import type { Cita, CitaFormData, CitaFormServiceItem } from '../../types/cita'
import ModalBase from '../common/ModalBase.vue'
import { DualAmount } from '../common'
import { FormInput, FormSelect, FormTextarea, FormTime } from '../forms'

const MODAL_ID = 'cita-form-modal'

const props = defineProps<{
  servicios?: { id: string; name: string; price: number; duration: number }[]
  empleados?: { id: string; name: string; payType?: string; payPercentage?: number }[]
}>()

const emit = defineEmits<{
  save: [cita: CitaFormData & { id?: string }]
  delete: [citaId: string]
}>()

const saveInProgress = ref(false)

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const authStore = useAuthStore()
const businessStore = useBusinessStore()
const isEmployee = computed(() => authStore.role === 'empleado')
const canCreateClients = computed(() =>
  !isEmployee.value || businessStore.hasFeature('employees_create_clients')
)

const t = computed(() => businessStore.terminology)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const clientSuggestions = ref<{ id: string; full_name: string; phone: string }[]>([])
const showClientSuggestions = ref(false)
const clientSearchLoading = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const commissionDetailOpen = reactive(new Set<number>())

const onClientNameInput = () => {
  formData.value.clientId = undefined
  if (searchTimeout) clearTimeout(searchTimeout)
  const query = formData.value.clientName.trim()
  if (query.length < 1) {
    clientSuggestions.value = []
    showClientSuggestions.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    if (!businessId.value) {
      console.warn('[CitaFormModal] businessId no disponible para búsqueda de clientes')
      return
    }
    clientSearchLoading.value = true
    try {
      clientSuggestions.value = await searchClients(businessId.value, query, branchId.value)
      showClientSuggestions.value = true
      if (clientSuggestions.value.length === 0) {
        console.log('[CitaFormModal] Sin resultados para:', query)
      }
    } catch (err) {
      console.error('[CitaFormModal] Error buscando clientes:', err)
      clientSuggestions.value = []
      showClientSuggestions.value = false
    } finally {
      clientSearchLoading.value = false
    }
  }, 300)
}

const selectClient = (client: { id: string; full_name: string; phone: string }) => {
  formData.value.clientId = client.id
  formData.value.clientName = client.full_name
  formData.value.clientPhone = client.phone
  showClientSuggestions.value = false
  if (searchTimeout) clearTimeout(searchTimeout)
}

const onClientNameBlur = () => {
  setTimeout(() => { showClientSuggestions.value = false }, 200)
}

const onClientNameFocus = () => {
  if (clientSuggestions.value.length > 0) {
    showClientSuggestions.value = true
  }
}

const isLoading = computed(() => saveInProgress.value)
const isEditing = computed(() => !!(modalData.value?.cita?.id))

const serviceOptions = computed(() =>
  (props.servicios ?? []).map(s => ({ value: s.id, label: `${s.name} - $${s.price} (${s.duration} min)` }))
)

const employeeOptions = computed(() => {
  const empList = props.empleados ?? []
  if (isEmployee.value) {
    const myId = authStore.profile?.id ?? ''
    const me = empList.find(e => e.id === myId)
    return me ? [{ value: me.id, label: me.name }] : []
  }
  return empList.map(e => ({ value: e.id, label: e.name }))
})

const assistantOptions = computed(() => {
  const empList = props.empleados ?? []
  if (isEmployee.value) {
    return [{ value: '', label: 'Sin asistente' }]
  }
  return [
    { value: '', label: 'Sin asistente' },
    ...empList.map(e => ({ value: e.id, label: e.name })),
  ]
})

const isSingleEmployee = computed(() => employeeOptions.value.length <= 1)

const statusOptions = [
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const emptyServiceRow = (): CitaFormServiceItem => ({
  serviceId: '',
  employeeId: isEmployee.value ? (authStore.profile?.id ?? '') : '',
  assistantEmployeeId: '',
  assistantPercentage: 0,
  duration: 30,
  price: 0,
})

const defaultFormData = (): CitaFormData & { extraServices: CitaFormServiceItem[] } => {
  const today = toISODate(new Date())
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const nextSlot = Math.ceil(minutes / 30) * 30
  const myId = isEmployee.value ? (authStore.profile?.id ?? '') : ''
  return {
    clientId: undefined,
    clientName: '',
    clientPhone: '',
    service: '',
    employee: myId,
    assistantEmployee: '',
    assistantPercentage: 0,
    duration: 30,
    price: 0,
    extraServices: [],
    date: today,
    time: minutesToHHmm(nextSlot),
    status: 'pending',
    notes: '',
  }
}

const formData = ref<CitaFormData & { extraServices: CitaFormServiceItem[] }>(defaultFormData())
const errors = ref<Partial<Record<keyof CitaFormData, string>> & { rowErrors?: Record<number, Partial<Record<string, string>>> }>({})
const activeEmployeeOverrides = reactive(new Set<number>())

const servicesLoaded = computed(() => (props.servicios?.length ?? 0) > 0)
const employeesLoaded = computed(() => (props.empleados?.length ?? 0) > 0)

// Computed service rows: combine primary service + extraServices
const serviceRows = computed<CitaFormServiceItem[]>(() => {
  const rows: CitaFormServiceItem[] = [{
    serviceId: formData.value.service,
    employeeId: formData.value.employee,
    assistantEmployeeId: formData.value.assistantEmployee,
    assistantPercentage: formData.value.assistantPercentage,
    duration: formData.value.duration,
    price: formData.value.price,
  }]
  for (const extra of formData.value.extraServices) {
    rows.push({ ...extra })
  }
  return rows
})

const addServiceRow = () => {
  formData.value.extraServices.push(emptyServiceRow())
}

const removeServiceRow = (index: number) => {
  const extraIndex = index - 1
  if (extraIndex >= 0 && extraIndex < formData.value.extraServices.length) {
    formData.value.extraServices.splice(extraIndex, 1)
    activeEmployeeOverrides.delete(index)
    commissionDetailOpen.delete(index)
  }
}

const updateServiceRow = (index: number, field: keyof CitaFormServiceItem, value: string) => {
  if (index === 0) {
    if (field === 'serviceId') {
      formData.value.service = value
    } else if (field === 'employeeId') {
      formData.value.employee = value
    } else if (field === 'assistantEmployeeId') {
      formData.value.assistantEmployee = value
      if (!value) formData.value.assistantPercentage = 0
    } else if (field === 'assistantPercentage') {
      formData.value.assistantPercentage = Number(value) || 0
    } else if (field === 'price') {
      formData.value.price = Number(value) || 0
    } else if (field === 'duration') {
      formData.value.duration = Math.max(1, Number(value) || 1)
    }
  } else {
    const extraIndex = index - 1
    const extra = formData.value.extraServices[extraIndex]
    if (extra) {
      if (field === 'serviceId') {
        extra.serviceId = value
        const svc = props.servicios?.find(s => s.id === value)
        if (svc) {
          extra.price = svc.price
          extra.duration = svc.duration
        }
      } else if (field === 'employeeId') {
        extra.employeeId = value
      } else if (field === 'assistantEmployeeId') {
        extra.assistantEmployeeId = value
        if (!value) extra.assistantPercentage = 0
      } else if (field === 'assistantPercentage') {
        extra.assistantPercentage = Number(value) || 0
      } else if (field === 'price') {
        extra.price = Number(value) || 0
      } else if (field === 'duration') {
        extra.duration = Math.max(1, Number(value) || 1)
      }
    }
  }
}

// Per-row price helpers for the editable input
const setRowPrice = (index: number, val: string) => {
  const num = val === '' ? 0 : Number(val)
  updateServiceRow(index, 'price', String(num))
}

const getRowError = (index: number, field: string): string | undefined => {
  return (errors.value as any)?.rowErrors?.[index]?.[field]
}

const toggleCommissionDetail = (index: number) => {
  if (commissionDetailOpen.has(index)) {
    commissionDetailOpen.delete(index)
  } else {
    commissionDetailOpen.add(index)
  }
}

const getEmployeeDefaultPercentage = (employeeId: string): number | undefined => {
  if (!employeeId) return undefined
  const emp = props.empleados?.find(e => e.id === employeeId)
  if (!emp || emp.payType === 'salary') return undefined
  return emp.payPercentage ?? 0
}

const hasEmployeeOverride = (index: number): boolean => {
  if (activeEmployeeOverrides.has(index)) return true
  if (index === 0) return formData.value.employeePercentageOverride != null
  const extra = formData.value.extraServices[index - 1]
  return extra?.employeePercentageOverride != null
}

const getEmployeeOverrideValue = (index: number): string => {
  if (index === 0) return formData.value.employeePercentageOverride != null ? String(formData.value.employeePercentageOverride) : ''
  const extra = formData.value.extraServices[index - 1]
  return extra?.employeePercentageOverride != null ? String(extra.employeePercentageOverride) : ''
}

const setEmployeeOverride = (index: number, value: string) => {
  const num = value === '' ? undefined : Math.max(0, Math.min(100, Number(value) || 0))
  if (index === 0) {
    formData.value.employeePercentageOverride = num
  } else {
    const extra = formData.value.extraServices[index - 1]
    if (extra) extra.employeePercentageOverride = num
  }
}

const toggleEmployeeOverride = (index: number) => {
  if (hasEmployeeOverride(index)) {
    activeEmployeeOverrides.delete(index)
    setEmployeeOverride(index, '')
  } else {
    activeEmployeeOverrides.add(index)
    const row = index === 0
      ? { employeeId: formData.value.employee }
      : formData.value.extraServices[index - 1]
    const defaultPct = getEmployeeDefaultPercentage(row?.employeeId ?? '') ?? 0
    setEmployeeOverride(index, String(defaultPct))
  }
}

watch(() => formData.value.service, (serviceId) => {
  if (isEditing.value) return
  if (!serviceId) return
  const svc = props.servicios?.find(s => s.id === serviceId)
  if (svc) {
    formData.value.price = svc.price
    formData.value.duration = svc.duration
  }
})

const totalPrice = computed(() => {
  let total = formData.value.price
  for (const extra of formData.value.extraServices) {
    total += extra.price
  }
  return total
})

const maxDuration = computed(() => {
  let max = formData.value.duration
  for (const extra of formData.value.extraServices) {
    if (extra.duration > max) max = extra.duration
  }
  return max
})

const setRowDuration = (index: number, val: string) => {
  if (val === '') {
    updateServiceRow(index, 'duration', '0')
    return
  }
  const num = Number(val)
  if (!isNaN(num)) {
    updateServiceRow(index, 'duration', String(num))
  }
}

const editableDuration = ref<number | string>(maxDuration.value)
let syncDurationGuard = false

watch(maxDuration, (val) => {
  if (!syncDurationGuard) {
    editableDuration.value = val
  }
}, { immediate: true })

const onTotalDurationChange = (val: string) => {
  if (val === '') {
    editableDuration.value = ''
    return
  }
  const num = Number(val)
  if (isNaN(num)) return
  editableDuration.value = num
  syncDurationGuard = true
  formData.value.duration = num
  for (const extra of formData.value.extraServices) {
    extra.duration = num
  }
  setTimeout(() => { syncDurationGuard = false }, 0)
}

const onTotalDurationBlur = () => {
  if (editableDuration.value === '' || Number(editableDuration.value) <= 0) {
    editableDuration.value = maxDuration.value
  }
}

const isFormValid = computed(() => {
  const hasPrimaryService = formData.value.service !== '' && formData.value.employee !== ''
  const extrasValid = formData.value.extraServices.every(e => e.serviceId !== '' && e.employeeId !== '')
  const hasClientSelection = canCreateClients.value || !!formData.value.clientId
  return formData.value.clientName.trim().length >= 2 &&
    /^[\d\s\-\+\(\)]+$/.test(formData.value.clientPhone.trim()) &&
    formData.value.clientPhone.trim().length >= 7 &&
    hasPrimaryService &&
    extrasValid &&
    hasClientSelection &&
    formData.value.date !== '' &&
    formData.value.time !== '' &&
    servicesLoaded.value &&
    employeesLoaded.value
})

watch(
  [isOpen, () => modalData.value?.cita],
  async ([open, cita]) => {
    if (!open) return
    commissionDetailOpen.clear()
    activeEmployeeOverrides.clear()
    if (cita) {
      let phone = ''
      let groupMembers: CitaFormServiceItem[] = []
      let primaryDuration = cita.duration || 30
      let primaryPrice = cita.price || 0

      if (cita.clientId && businessId.value) {
        try {
          const results = await searchClients(businessId.value, cita.clientName, branchId.value)
          const match = results.find(c => c.id === cita.clientId)
          if (match) phone = match.phone
        } catch { /* ignore */ }
      }

      if (cita.groupId) {
        try {
          const members = await listCitaGroupMembers(cita.groupId)
          const selectedMember = members.find(m => m.id === cita.id)
          if (selectedMember) {
            const selectedDuration = selectedMember.duration_override != null
              ? Number(selectedMember.duration_override)
              : Math.round((new Date(selectedMember.end_time).getTime() - new Date(selectedMember.start_time).getTime()) / 60000) || (selectedMember.services?.duration_minutes ?? 30)
            const selectedPrice = selectedMember.price_override != null
              ? Number(selectedMember.price_override)
              : Number(selectedMember.services?.price ?? 0)
            primaryDuration = selectedDuration
            primaryPrice = selectedPrice
          }
          groupMembers = members
            .filter(m => m.id !== cita.id)
            .map(m => ({
              serviceId: m.service_id,
              employeeId: m.employee_id,
              assistantEmployeeId: m.assistant_employee_id ?? '',
              assistantPercentage: Number(m.assistant_percentage ?? 0),
              employeePercentageOverride: m.employee_percentage_override ?? undefined,
              duration: Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000) || (m.services?.duration_minutes ?? 30),
              price: Number(m.price_override ?? m.services?.price ?? 0),
            }))
        } catch { /* ignore */ }
      }

      formData.value = {
        clientId: cita.clientId || undefined,
        clientName: cita.clientName || '',
        clientPhone: phone,
        service: cita.serviceId || '',
        employee: cita.employeeId || '',
        assistantEmployee: cita.assistantId || '',
        assistantPercentage: cita.assistantPercentage || 0,
        employeePercentageOverride: cita.employeePercentageOverride,
        duration: primaryDuration,
        price: primaryPrice,
        extraServices: groupMembers,
        date: cita.date || toISODate(new Date()),
        time: cita.time || '09:00',
        status: cita.status || 'pending',
        notes: cita.notes || '',
      }
    } else {
      formData.value = defaultFormData()
    }
    if (formData.value.employeePercentageOverride != null) {
      activeEmployeeOverrides.add(0)
      commissionDetailOpen.add(0)
    }
    formData.value.extraServices.forEach((extra, i) => {
      if (extra.employeePercentageOverride != null) {
        activeEmployeeOverrides.add(i + 1)
        commissionDetailOpen.add(i + 1)
      }
    })
    errors.value = {}
  },
  { immediate: true }
)

const normalizePhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!digits.startsWith('58')) digits = '58' + digits
  return '+' + digits
}

const validateForm = (): boolean => {
  errors.value = {}
  const rowErrors: Record<number, Partial<Record<string, string>>> = {}

  if (!formData.value.clientName.trim() || formData.value.clientName.length < 2) {
    errors.value.clientName = 'El nombre del cliente es requerido'
  }

  const phoneRaw = formData.value.clientPhone.trim()
  if (!phoneRaw) {
    errors.value.clientPhone = 'El teléfono del cliente es requerido'
  } else {
    formData.value.clientPhone = normalizePhone(phoneRaw)
    const normalized = formData.value.clientPhone
    if (normalized.length < 10) {
      errors.value.clientPhone = 'El teléfono debe tener al menos 10 dígitos'
    } else if (!/^\+58\d{9,}$/.test(normalized)) {
      errors.value.clientPhone = 'Formato inválido. Debe ser +584121234567'
    }
  }

  if (!formData.value.service) {
    rowErrors[0] = { ...rowErrors[0], serviceId: 'Selecciona un servicio' }
  }
  if (!formData.value.employee) {
    rowErrors[0] = { ...rowErrors[0], employeeId: 'Selecciona un empleado' }
  }
  if (formData.value.assistantEmployee && formData.value.assistantEmployee === formData.value.employee) {
    rowErrors[0] = { ...rowErrors[0], assistantEmployeeId: 'El asistente no puede ser el mismo empleado' }
  }
  if (formData.value.assistantEmployee && !formData.value.assistantPercentage) {
    rowErrors[0] = { ...rowErrors[0], assistantPercentage: 'Define el porcentaje del asistente' }
  }

  for (let i = 0; i < formData.value.extraServices.length; i++) {
    const extra = formData.value.extraServices[i]
    const idx = i + 1
    if (!extra.serviceId) {
      rowErrors[idx] = { ...rowErrors[idx], serviceId: 'Selecciona un servicio' }
    }
    if (!extra.employeeId) {
      rowErrors[idx] = { ...rowErrors[idx], employeeId: 'Selecciona un empleado' }
    }
    if (extra.assistantEmployeeId && extra.assistantEmployeeId === extra.employeeId) {
      rowErrors[idx] = { ...rowErrors[idx], assistantEmployeeId: 'El asistente no puede ser el mismo empleado' }
    }
    if (extra.assistantEmployeeId && !extra.assistantPercentage) {
      rowErrors[idx] = { ...rowErrors[idx], assistantPercentage: 'Define el porcentaje del asistente' }
    }
  }

  if (!formData.value.date) {
    errors.value.date = 'Selecciona una fecha'
  }

  if (!formData.value.time) {
    errors.value.time = 'Selecciona una hora'
  }

  if (Object.keys(rowErrors).length > 0) {
    ;(errors.value as any).rowErrors = rowErrors
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (saveInProgress.value) return

  if (!validateForm()) {
    showError('Por favor corrige los errores en el formulario')
    return
  }

  saveInProgress.value = true

  const citaData: CitaFormData & { id?: string } = {
    ...formData.value,
  }

  if (modalData.value?.cita?.id) {
    citaData.id = modalData.value.cita.id
  }

  emit('save', citaData)
}

const onSaveComplete = () => {
  saveInProgress.value = false
}

const confirmDelete = () => {
  const id = modalData.value?.cita?.id
  if (!id) return
  emit('delete', id)
}

const open = (cita?: Cita) => {
  useModal(MODAL_ID).open({ cita })
}

defineExpose({
  open,
  close,
  isOpen,
  onSaveComplete,
})
</script>
