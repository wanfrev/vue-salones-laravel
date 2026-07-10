<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.appointment}` : `Nueva ${t.appointment}`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="xl"
    :is-loading="isLoading"
    :is-confirm-disabled="saveDisabled"
    :confirm-text="confirmLabel"
    @close="close"
    @confirm="$emit('save')"
  >
    <form @submit.prevent="$emit('save')" class="space-y-5">
      <!-- DATOS GENERALES -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <slot name="client">
          <FormInput :model-value="clientName" @update:model-value="$emit('update:clientName', $event)" label="Cliente" placeholder="Nombre del cliente" required />
        </slot>
        <FormInput :model-value="clientPhone" @update:model-value="$emit('update:clientPhone', $event)" label="Teléfono" type="tel" placeholder="+58 412 1234567" required />
        <FormInput :model-value="date" @update:model-value="$emit('update:date', $event)" label="Fecha" type="date" required />
        <FormTime :model-value="time" @update:model-value="$emit('update:time', $event)" label="Hora" required />
        <FormDropdown :model-value="status" @update:model-value="$emit('update:status', $event)" label="Estado" :options="statusOptions" required />
      </div>

      <!-- SERVICIOS -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-semibold text-text">{{ t.service }}s</label>
          <button type="button" @click="$emit('addService')" class="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Agregar {{ t.service.toLowerCase() }}
          </button>
        </div>

        <div v-for="(row, index) in serviceRows" :key="index" class="rounded-lg border border-border bg-bg-secondary/30">
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_80px_60px_36px_36px] gap-2 p-2.5 items-start">
            <FormDropdown :model-value="row.serviceId" @update:model-value="$emit('updateService', index, 'serviceId', $event)" :placeholder="'Seleccionar ' + t.service.toLowerCase()" :options="serviceOptions" searchable size="sm" />
            <FormDropdown :model-value="row.employeeId" @update:model-value="$emit('updateService', index, 'employeeId', $event)" :placeholder="t.employee" :options="employeeOptions" size="sm" />
            <FormDropdown :model-value="row.assistantEmployeeId" @update:model-value="$emit('updateService', index, 'assistantEmployeeId', $event)" placeholder="Sin asist." :options="assistantOptions" size="sm" />
            <div>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">$</span>
                <input :value="String(row.price)" @input="$emit('updateService', index, 'price', ($event.target as HTMLInputElement).value)" type="number" min="0" step="0.01" class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 pl-6 pr-2 text-sm border-border hover:border-border-strong text-right" />
              </div>
            </div>
            <div><input :value="String(row.duration)" @input="$emit('updateService', index, 'duration', ($event.target as HTMLInputElement).value)" type="number" class="w-full rounded-lg border bg-surface text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20 py-1.5 px-2 text-sm border-border hover:border-border-strong text-right" /></div>
            <span class="w-8"></span>
            <button v-if="serviceRows.length > 1" type="button" @click="$emit('removeService', index)" class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar servicio">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <span v-else class="w-8"></span>
          </div>

          <!-- Assistant percentage -->
          <div v-if="row.assistantEmployeeId" class="border-t border-border px-3 py-2">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-text-muted shrink-0">% asistente:</label>
              <input :value="String(row.assistantPercentage)" @input="$emit('updateService', index, 'assistantPercentage', ($event.target as HTMLInputElement).value)" type="number" min="0" max="100" placeholder="10" class="w-20 rounded border border-border bg-bg px-2 py-1 text-xs text-text" />
            </div>
          </div>
        </div>

        <!-- Totales -->
        <div class="flex items-center gap-4 rounded-lg bg-primary/5 px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-text">Total:</span>
            <span class="text-sm font-bold text-primary">${{ totalPrice }}</span>
          </div>
        </div>
      </div>

      <!-- NOTAS -->
      <FormTextarea :model-value="notes" @update:model-value="$emit('update:notes', $event)" label="Notas" placeholder="Notas adicionales sobre la cita..." :rows="2" />

      <slot name="paymentEditor" />

      <div v-if="isEditing" class="border-t border-border pt-4">
        <button type="button" class="rounded-lg border border-danger/30 px-4 py-2 text-sm font-semibold text-danger transition-theme hover:bg-danger/10" @click="$emit('delete')">
          Eliminar {{ t.appointment.toLowerCase() }}
        </button>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { useModal } from '../../composables/common/useModal'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown, FormTextarea, FormTime } from '../forms'

const MODAL_ID = 'cita-form-modal'

export interface ServiceRow {
  serviceId: string
  employeeId: string
  assistantEmployeeId: string
  assistantPercentage: number
  duration: number
  price: number
}

const props = defineProps<{
  isEditing?: boolean
  isLoading?: boolean
  saveDisabled?: boolean
  confirmLabel?: string
  clientName?: string
  clientPhone?: string
  date?: string
  time?: string
  status?: string
  notes?: string
  serviceRows?: ServiceRow[]
  totalPrice?: number
  serviceOptions?: { value: string; label: string; sublabel?: string }[]
  employeeOptions?: { value: string; label: string }[]
  assistantOptions?: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  save: []
  delete: []
  'update:clientName': [value: string]
  'update:clientPhone': [value: string]
  'update:date': [value: string]
  'update:time': [value: string]
  'update:status': [value: string]
  'update:notes': [value: string]
  addService: []
  removeService: [index: number]
  updateService: [index: number, field: keyof ServiceRow, value: string]
}>()

const { isOpen, modalData, close } = useModal(MODAL_ID)
const businessStore = useBusinessStore()
const authStore = useAuthStore()

const t = businessStore.terminology

const statusOptions = [
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No asistió' },
]

const open = (data?: any) => { useModal(MODAL_ID).open(data) }

defineExpose({ open, close, isOpen })
</script>
