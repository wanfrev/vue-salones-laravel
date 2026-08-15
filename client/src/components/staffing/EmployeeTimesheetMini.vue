<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Horas de la semana</p>
      
      <div v-if="companyId" class="flex items-center gap-2">
        <input
          v-model="weekStartInput"
          type="date"
          class="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none transition-theme focus:border-primary"
        />
        <span class="text-xs text-text-muted">
          {{ weekStartInput ? formatDateUS(weekStartInput) : '—' }} al {{ weekEnd ? formatDateUS(weekEnd) : '—' }}
        </span>
      </div>
    </div>

    <div v-if="!companyId || !employeeId" class="rounded-lg border border-dashed border-border p-4 text-center">
      <p class="text-sm text-text-muted">Asigna una empresa y guarda al empleado para ingresar sus horas.</p>
    </div>
    <div v-else-if="timesheets.employeesLoading.value" class="py-4 text-center text-sm text-text-muted">
      Cargando información...
    </div>
    <div v-else class="space-y-3 rounded-lg border border-border bg-bg-secondary/30 p-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-text-secondary">Total Horas</label>
          <input 
            v-model.number="entry.totalHours" 
            type="number" 
            min="0" 
            max="168" 
            step="0.01"
            :disabled="isReadOnly"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-text-secondary">Ajuste ($)</label>
          <input 
            v-model.number="entry.adjustment" 
            type="number" 
            step="0.01"
            :disabled="isReadOnly"
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>
      </div>

      <div class="mt-2 grid grid-cols-2 gap-4 rounded-lg bg-surface p-3 text-sm">
        <div>
          <p class="text-xs text-text-muted">Horas Regulares</p>
          <p class="font-semibold text-text">{{ result?.regular_hours?.toFixed(2) ?? '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Horas OT</p>
          <p class="font-semibold text-text">{{ result?.overtime_hours?.toFixed(2) ?? '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Total a Pagar</p>
          <p class="font-bold text-primary">{{ result?.payout ? formatUSD(result.payout) : '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-text-muted">Estado</p>
          <p class="font-medium" :class="statusColor">{{ statusLabel }}</p>
        </div>
      </div>
      
      <p v-if="timesheets.saveError.value" class="text-xs text-danger">{{ timesheets.saveError.value }}</p>

      <div class="flex justify-end pt-2">
        <button 
          type="button"
          :disabled="isReadOnly || timesheets.saveMutation.isPending.value"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleSave"
        >
          {{ timesheets.saveMutation.isPending.value ? 'Guardando...' : 'Guardar Horas' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useTimesheets } from '../../composables/staffing/useTimesheets'
import { useCurrency } from '../../composables/common/useCurrency'
import { formatDateUS } from '../../lib/formatters'
import type { TimesheetEntryInput } from '../../services/staffing/staffingService'
import type { StaffingTimesheetEntry } from '../../types/database'

const props = defineProps<{
  employeeId?: string
  companyId?: string
  businessId: string | null
}>()

const { formatUSD } = useCurrency()

const businessId = computed(() => props.businessId)
const companyId = computed(() => props.companyId || null)

const timesheets = useTimesheets(businessId, companyId)

const defaultWeekStart = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

const weekStartInput = ref(defaultWeekStart())

const weekEnd = computed(() => {
  if (!weekStartInput.value) return ''
  const d = new Date(weekStartInput.value + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
})

const currentWeek = computed(() => timesheets.findWeek(weekStartInput.value))
const isReadOnly = computed(() => !!currentWeek.value && currentWeek.value.status !== 'draft')

const statusLabel = computed(() => {
  if (!currentWeek.value) return 'Sin cargar'
  if (currentWeek.value.status === 'draft') return 'Borrador'
  if (currentWeek.value.status === 'approved') return 'Aprobada'
  return 'Pagada'
})

const statusColor = computed(() => {
  if (!currentWeek.value) return 'text-text-muted'
  if (currentWeek.value.status === 'draft') return 'text-warning'
  return 'text-success'
})

const entry = reactive({
  totalHours: 0,
  preTaxDeduction: 0,
  fixedFees: 0,
  adjustment: 0,
})

const rebuildEntry = () => {
  if (!props.employeeId) return
  const saved = currentWeek.value?.entries.find(e => e.employee_id === props.employeeId)
  entry.totalHours = saved?.total_hours || 0
  entry.preTaxDeduction = saved?.pre_tax_deduction || 0
  entry.fixedFees = saved?.fixed_fees || 0
  entry.adjustment = saved?.adjustment || 0
}

watch([() => props.employeeId, currentWeek], rebuildEntry, { immediate: true })

const result = computed<StaffingTimesheetEntry | undefined>(() => {
  if (!props.employeeId || !currentWeek.value) return undefined
  return currentWeek.value.entries.find(e => e.employee_id === props.employeeId)
})

const handleSave = async () => {
  if (!props.employeeId || isReadOnly.value) return
  
  const existingEntries = currentWeek.value?.entries ?? []
  
  const allInputs = new Map<string, TimesheetEntryInput>()
  for (const e of existingEntries) {
    allInputs.set(e.employee_id, {
      employeeId: e.employee_id,
      totalHours: e.total_hours,
      preTaxDeduction: e.pre_tax_deduction,
      fixedFees: e.fixed_fees,
      adjustment: e.adjustment
    })
  }
  
  allInputs.set(props.employeeId, {
    employeeId: props.employeeId,
    totalHours: entry.totalHours || 0,
    preTaxDeduction: entry.preTaxDeduction || 0,
    fixedFees: entry.fixedFees || 0,
    adjustment: entry.adjustment || 0
  })

  await timesheets.save(weekStartInput.value, weekEnd.value, Array.from(allInputs.values()))
}
</script>
