<template>
  <div class="space-y-4">
    <label v-if="isEditing" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
      <div class="flex-1">
        <p class="text-sm font-medium text-text">Empleado activo</p>
        <p class="text-xs text-text-muted">Un empleado inactivo no aparece en Nómina ni puede recibir horas nuevas.</p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="active"
        @click="active = !active"
        :class="[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-theme border-2',
          active ? 'bg-primary border-primary' : 'bg-border border-border'
        ]"
      >
        <span
          :class="[
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            active ? 'translate-x-4' : 'translate-x-0'
          ]"
        />
      </button>
    </label>

    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Información Personal</p>

    <FormInput
      v-model="name"
      label="Nombre completo"
      placeholder="Ej: Carlos Méndez"
      required
      prefix-icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      :error="errors?.name"
      @blur="emit('blur', 'name')"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormInput
        v-model="phone"
        label="Teléfono"
        type="tel"
        placeholder="+1 305 555 0123"
        prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        :error="errors?.phone"
      />

      <FormInput
        v-model="email"
        label="Email (Opcional)"
        type="email"
        placeholder="carlos@email.com"
        prefix-icon="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
        :error="errors?.email"
        @blur="emit('blur', 'email')"
      />
    </div>

    <FormInput v-model="address" label="Dirección" placeholder="Calle, ciudad, estado" />

    <FormInput
      v-model="ssn"
      label="SSN"
      placeholder="XXX-XX-XXXX"
      :hint="ssnHint"
    />

    <div class="mt-8 border-t border-border pt-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">Empresas y pago</p>
          <p class="text-xs text-text-muted">Puede estar asignado a más de una empresa a la vez, cada una con su propio rol.</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="addAssignment">
          + Agregar empresa
        </button>
      </div>

      <p v-if="assignments.length === 0" class="text-xs text-warning">
        Agrega al menos una empresa para poder asignarle horas.
      </p>

      <div v-for="(assignment, index) in assignments" :key="index"
        class="space-y-2 rounded-xl border border-border/70 bg-bg-secondary/20 p-3">
        <div class="flex items-start gap-2">
          <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <FormDropdown
              :model-value="assignment.companyId"
              @update:model-value="setAssignmentCompany(index, $event as string)"
              label="Empresa"
              placeholder="Selecciona la empresa"
              :options="companyOptions"
              required
            />
            <FormDropdown
              v-if="projectOptionsFor(assignment.companyId).length > 0"
              :model-value="assignment.projectId ?? ''"
              @update:model-value="setAssignmentProject(index, $event as string)"
              label="Proyecto (Opcional)"
              placeholder="General (Sin proyecto)"
              :options="projectOptionsFor(assignment.companyId)"
            />
            <FormDropdown
              :model-value="assignment.role"
              @update:model-value="setAssignmentRole(index, $event as string)"
              label="Rol / Puesto"
              placeholder="Seleccionar rol..."
              :options="roleOptionsFor(assignment.companyId)"
              required
            />
            <FormDropdown
              v-if="shiftOptionsFor(assignment.companyId, assignment.role).length > 0"
              :model-value="assignment.shift ?? ''"
              @update:model-value="setAssignmentShift(index, $event as string)"
              label="Turno"
              placeholder="Seleccionar turno..."
              :options="shiftOptionsFor(assignment.companyId, assignment.role)"
              required
            />
          </div>
          <button type="button"
            class="mt-6 shrink-0 rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
            title="Quitar empresa"
            @click="removeAssignment(index)">
            <TrashBin2Icon class="h-4 w-4" />
          </button>
        </div>

        <p v-if="duplicateAssignmentIndexes.has(index)" class="text-xs text-danger">
          Esta misma combinación de empresa, proyecto, rol{{ assignment.shift ? ' y turno' : '' }} ya está
          asignada en otra fila arriba — quita una de las dos, o cambia el proyecto/turno para diferenciarlas.
          Dos asignaciones idénticas hacen que Nómina no sepa a cuál de las dos cargarle las horas y falla al guardar.
        </p>
        <p v-else-if="assignment.companyId && assignment.role && !resolvedRateFor(assignment)" class="text-xs text-warning">
          Esta empresa no tiene una tarifa configurada para "{{ assignment.role }}" todavía — agrégala en Empresas
          antes de cargar horas.
        </p>
        <div v-else-if="resolvedRateFor(assignment)" class="space-y-1 rounded-lg bg-bg-secondary/60 px-3 py-2 text-xs text-text-secondary">
          <p>
            Regular (hasta {{ resolvedRateFor(assignment)!.overtimeThresholdHours ?? 40 }}h/sem): gana
            <span class="font-semibold text-text">{{ formatUSD(resolvedRateFor(assignment)!.payRate) }}/h</span>
            · se cobra a la empresa <span class="font-semibold text-text">{{ formatUSD(resolvedRateFor(assignment)!.billRate) }}/h</span>
          </p>
          <p>
            Overtime: gana <span class="font-semibold text-text">{{ formatUSD(effectiveOvertimePayRate(assignment)) }}/h</span>
            · se cobra a la empresa <span class="font-semibold text-text">{{ formatUSD(effectiveOvertimeBillRate(assignment)) }}/h</span>
          </p>
        </div>
      </div>
    </div>

    <div>
      <FormInput
        v-model="taxRatePercent"
        type="number"
        min="0"
        max="100"
        step="0.1"
        label="% de tax (opcional)"
        :placeholder="companyTaxHint ? `Vacío = ${companyTaxHint}` : 'Vacío = el % de cada empresa'"
        hint="Solo si este empleado necesita un porcentaje distinto al de sus empresas."
      />
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormInput v-model="bankName" label="Banco" placeholder="Ej: Bank of America" />
      <FormInput v-model="bankAccountHolder" label="Titular de la cuenta" placeholder="Nombre en la cuenta" />
    </div>

    <FormDropdown
      v-model="paymentMethod"
      label="Método de pago"
      placeholder="Selecciona un método"
      :options="PAYMENT_METHOD_OPTIONS"
    />

    <template v-if="paymentMethod === 'direct_deposit'">
      <FormDropdown v-model="bankAccountType" label="Tipo de cuenta" :options="ACCOUNT_TYPE_OPTIONS" />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput
          v-model="bankRoutingNumber"
          label="Routing number"
          placeholder="9 dígitos"
          :hint="isEditing ? 'Dejar vacío para mantener el número actual' : undefined"
        />
        <FormInput
          v-model="bankAccountNumber"
          label="Número de cuenta"
          :hint="accountHint"
        />
      </div>
    </template>

    <FormInput
      v-else-if="paymentMethod === 'payroll_card'"
      v-model="payrollCardNumber"
      label="Número de tarjeta"
      :hint="cardHint"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { FormInput, FormDropdown } from '../forms'
import { useCurrency } from '../../composables/common/useCurrency'
import { listStaffingCompanies, listStaffingRates, getStaffingAllProjects, staffingCompanyKeys, staffingRateKeys, SHIFT_OPTIONS, type StaffingRateRow } from '../../services/staffing/staffingService'
import type { EmpleadoFormData, StaffingAssignment } from '../../types/empleado'
import { TrashBin2Icon } from '@solar-icons/vue/linear'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'direct_deposit', label: 'Depósito directo' },
  { value: 'payroll_card', label: 'Tarjeta de pago' },
]

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
]

const props = defineProps<{
  formData: EmpleadoFormData
  businessId: string | null
  isEditing?: boolean
  bankAccountLast4?: string | null
  payrollCardLast4?: string | null
  ssnLast4?: string | null
  errors?: Record<string, string>
}>()

const emit = defineEmits<{ 
  'update:modelValue': [data: EmpleadoFormData],
  'blur': [field: string]
}>()

const { formatUSD } = useCurrency()

// Same two-way-binding-via-computed pattern SalaryConfig.vue uses for `formData`.
const field = <K extends keyof EmpleadoFormData>(key: K) => computed<EmpleadoFormData[K]>({
  get: () => props.formData[key],
  set: (value) => emit('update:modelValue', { ...props.formData, [key]: value }),
})

const active = field('active')
const name = field('name')
const phone = field('phone')
const email = field('email')
const staffingTaxRate = field('staffingTaxRate')
const assignments = field('staffingAssignments')
const address = field('address')
const ssn = field('ssn')
const bankName = field('bankName')
const bankAccountHolder = field('bankAccountHolder')
const bankAccountType = field('bankAccountType')
const paymentMethod = field('paymentMethod')
const bankRoutingNumber = field('bankRoutingNumber')
const bankAccountNumber = field('bankAccountNumber')
const payrollCardNumber = field('payrollCardNumber')

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(props.businessId)),
  queryFn: () => listStaffingCompanies(props.businessId!),
  enabled: computed(() => !!props.businessId),
})

const companyOptions = computed(() =>
  (companies.value ?? []).map(c => ({ value: c.id, label: c.name })),
)

// Every rate for the whole business, fetched once — cheaper than one query per assignment row,
// and rows filter it client-side by their own company.
const { data: allRates } = useQuery({
  queryKey: computed(() => staffingRateKeys.all(props.businessId)),
  queryFn: () => listStaffingRates(props.businessId!),
  enabled: computed(() => !!props.businessId),
})

const { data: allProjects } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.allProjects(props.businessId)),
  queryFn: () => getStaffingAllProjects(),
  enabled: computed(() => !!props.businessId),
})

const projectOptionsFor = (companyId: string) => {
  if (!companyId || !allProjects.value) return []
  return allProjects.value
    .filter(p => p.companyId === companyId && p.active)
    .map(p => ({ value: p.id, label: p.name }))
}

const roleOptionsFor = (companyId: string) => {
  if (!companyId || !allRates.value) return []
  // A role can have several rate rows (one per shift) — dedupe so it only appears once here.
  const roles = new Set(allRates.value.filter(r => r.companyId === companyId).map(r => r.role))
  return [...roles].map(role => ({ value: role, label: role }))
}

// Only shown when this (company, role) actually has more than one shift-specific rate — most
// roles have a single, shift-less rate and never need this picker at all.
const shiftOptionsFor = (companyId: string, role: string) => {
  if (!companyId || !role || !allRates.value) return []
  const shifts = allRates.value.filter(r => r.companyId === companyId && r.role === role && r.shift)
  return shifts.map(r => ({ value: r.shift as string, label: SHIFT_OPTIONS.find(o => o.value === r.shift)?.label ?? r.shift as string }))
}

// Two assignments for the same (company, project, role, shift) are indistinguishable to the
// backend — StaffingCompanyEmployeeService::assignmentFor() has no way to tell which grid row an
// hours entry belongs to, and saving ends up colliding on StaffingTimesheetEntry's unique index,
// failing the whole week. Flag every row past the first with an identical key so this can't
// silently happen again (see the Lewis Electrical / Edwin Reyes case that motivated this).
// Project is part of the key, not a further disambiguator on top of it — the same company+role
// legitimately repeats across different projects (a worker on two projects for the same client,
// same role, each project billed/tracked separately), so that alone is never a duplicate.
const duplicateAssignmentIndexes = computed<Set<number>>(() => {
  const seen = new Set<string>()
  const duplicates = new Set<number>()
  assignments.value.forEach((a, i) => {
    if (!a.companyId || !a.role) return
    const key = `${a.companyId}::${a.projectId ?? ''}::${a.role.trim()}::${a.shift ?? ''}`
    if (seen.has(key)) duplicates.add(i)
    else seen.add(key)
  })
  return duplicates
})

const resolvedRateFor = (assignment: StaffingAssignment): StaffingRateRow | null =>
  (allRates.value ?? []).find(r =>
    r.companyId === assignment.companyId && r.role === assignment.role && r.active
    && r.shift === (assignment.shift ?? null)
  ) ?? null

// Mirrors StaffingPayrollCalculator::overtimeMultiplierFor — an explicit OT rate on the role
// wins outright, otherwise it's payRate/billRate times the role's own multiplier override or
// the company-wide default of 1.5x (see StaffingTermsFactory).
const effectiveOvertimePayRate = (assignment: StaffingAssignment): number => {
  const rate = resolvedRateFor(assignment)
  if (!rate) return 0
  return rate.overtimePayRate ?? rate.payRate * (rate.overtimeMultiplier ?? 1.5)
}
const effectiveOvertimeBillRate = (assignment: StaffingAssignment): number => {
  const rate = resolvedRateFor(assignment)
  if (!rate) return 0
  return rate.overtimeBillRate ?? rate.billRate * (rate.overtimeMultiplier ?? 1.5)
}

const addAssignment = () => {
  assignments.value = [...assignments.value, { companyId: '', projectId: null, role: '', shift: null }]
}
const removeAssignment = (index: number) => {
  assignments.value = assignments.value.filter((_, i) => i !== index)
}
const setAssignmentCompany = (index: number, companyId: string) => {
  // Changing the company invalidates whatever role was picked — that role belonged to the old
  // company's rate card and almost never exists on the new one too.
  assignments.value = assignments.value.map((a, i) => i === index ? { ...a, companyId, projectId: null, role: '', shift: null } : a)
}
const setAssignmentProject = (index: number, projectId: string) => {
  assignments.value = assignments.value.map((a, i) => i === index ? { ...a, projectId: projectId || null } : a)
}
const setAssignmentRole = (index: number, role: string) => {
  // A new role's shift options are almost never the same set as the old role's — reset it too.
  assignments.value = assignments.value.map((a, i) => i === index ? { ...a, role, shift: null } : a)
}
const setAssignmentShift = (index: number, shift: string) => {
  assignments.value = assignments.value.map((a, i) => i === index ? { ...a, shift: shift || null } : a)
}

/**
 * What "vacío" resolves to. Only meaningful with exactly one company assigned — with two or
 * more, each can have a different tax rate, so there's no single number to preview here.
 */
const companyTaxHint = computed(() => {
  if (assignments.value.length !== 1) return null
  const company = (companies.value ?? []).find(c => c.id === assignments.value[0].companyId)
  if (!company) return null
  return company.taxRate === 0 ? 'sin retención' : `${Math.round(company.taxRate * 1000) / 10}%`
})

// Stored as a fraction (0.07) but edited as a percentage (7) — same convention as the
// company's own tax brackets in Empresas.vue. FormInput emits '' (not null) when cleared.
const taxRatePercent = computed<number | string>({
  get: () => (staffingTaxRate.value == null ? '' : Math.round(staffingTaxRate.value * 10000) / 100),
  set: (value) => {
    staffingTaxRate.value = value === '' || value == null ? null : Number(value) / 100
  },
})

const accountHint = computed(() =>
  props.bankAccountLast4 ? `Terminada en ${props.bankAccountLast4} — deja vacío para mantenerla` : undefined,
)
const cardHint = computed(() =>
  props.payrollCardLast4 ? `Terminada en ${props.payrollCardLast4} — deja vacío para mantenerla` : undefined,
)
const ssnHint = computed(() =>
  props.ssnLast4 ? `Terminado en ${props.ssnLast4} — deja vacío para mantenerlo` : 'Nunca se muestra completo una vez guardado',
)
</script>
