<template>
  <div class="space-y-4">
    <label v-if="isEditing" class="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2.5 cursor-pointer transition-theme hover:border-border-strong">
      <div class="flex-1">
        <p class="text-sm font-medium text-text">{{ t('staffForm.active') }}</p>
        <p class="text-xs text-text-muted">{{ t('staffForm.activeHint') }}</p>
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

    <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ t('staffForm.personal') }}</p>

    <FormInput
      v-model="name"
      :label="t('staffForm.fullName')"
      :placeholder="t('staffForm.namePlaceholder')"
      required
      prefix-icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      :error="errors?.name"
      @blur="emit('blur', 'name')"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormInput
        v-model="phone"
        :label="t('staffForm.phone')"
        type="tel"
        placeholder="+1 305 555 0123"
        prefix-icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        :error="errors?.phone"
      />

      <FormInput
        v-model="email"
        :label="t('staffForm.emailOptional')"
        type="email"
        placeholder="carlos@email.com"
        prefix-icon="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
        :error="errors?.email"
        @blur="emit('blur', 'email')"
      />
    </div>

    <FormInput v-model="address" :label="t('staffForm.address')" :placeholder="t('staffForm.addressPlaceholder')" />

    <FormInput
      v-model="ssn"
      label="SSN"
      placeholder="XXX-XX-XXXX"
    />

    <div class="mt-8 border-t border-border pt-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">{{ t('staffForm.companiesAndPay') }}</p>
          <p class="text-xs text-text-muted">{{ t('staffForm.companiesHint') }}</p>
        </div>
        <button type="button"
          class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          @click="addAssignment">
          {{ t('staffForm.addCompany') }}
        </button>
      </div>

      <p v-if="assignments.length === 0" class="text-xs text-warning">
        {{ t('staffForm.needCompany') }}
      </p>

      <div v-for="(assignment, index) in assignments" :key="index"
        class="space-y-2 rounded-xl border border-border/70 bg-bg-secondary/20 p-3">
        <div class="flex items-start gap-2">
          <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <FormDropdown
              :model-value="assignment.companyId"
              @update:model-value="setAssignmentCompany(index, $event as string)"
              :label="t('staffForm.company')"
              :placeholder="t('staffForm.selectCompany')"
              :options="companyOptions"
              required
            />
            <FormDropdown
              v-if="projectOptionsFor(assignment.companyId).length > 0"
              :model-value="assignment.projectId ?? ''"
              @update:model-value="setAssignmentProject(index, $event as string)"
              :label="t('staffForm.projectOptional')"
              :placeholder="t('staffForm.generalNoProject')"
              :options="projectOptionsFor(assignment.companyId)"
            />
            <FormDropdown
              :model-value="assignment.role"
              @update:model-value="setAssignmentRole(index, $event as string)"
              :label="t('staffForm.role')"
              :placeholder="t('staffForm.selectRole')"
              :options="roleOptionsFor(assignment.companyId)"
              required
            />
            <FormDropdown
              v-if="shiftOptionsFor(assignment.companyId, assignment.role).length > 0"
              :model-value="assignment.shift ?? ''"
              @update:model-value="setAssignmentShift(index, $event as string)"
              :label="t('staffForm.shift')"
              :placeholder="t('staffForm.selectShift')"
              :options="shiftOptionsFor(assignment.companyId, assignment.role)"
              required
            />
          </div>
          <button type="button"
            class="mt-6 shrink-0 rounded-lg p-2 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
            :title="t('staffForm.removeCompany')"
            @click="removeAssignment(index)">
            <TrashBin2Icon class="h-4 w-4" />
          </button>
        </div>

        <p v-if="duplicateAssignmentIndexes.has(index)" class="text-xs text-danger">
          {{ t('staffForm.duplicate', { shift: assignment.shift ? t('staffForm.andShift') : '' }) }}
        </p>
        <p v-else-if="assignment.companyId && assignment.role && !resolvedRateFor(assignment)" class="text-xs text-warning">
          {{ t('staffForm.noRate', { role: assignment.role }) }}
        </p>
        <div v-else-if="resolvedRateFor(assignment)" class="space-y-1 rounded-lg bg-bg-secondary/60 px-3 py-2 text-xs text-text-secondary">
          <p>
            {{ t('staffForm.regularUntil', { hours: resolvedRateFor(assignment)!.overtimeThresholdHours ?? 40 }) }}
            <span class="font-semibold text-text">{{ formatUSD(resolvedRateFor(assignment)!.payRate) }}/h</span>
            · {{ t('staffForm.billedToCompany') }} <span class="font-semibold text-text">{{ formatUSD(resolvedRateFor(assignment)!.billRate) }}/h</span>
          </p>
          <p>
            {{ t('staffForm.overtimeEarns') }} <span class="font-semibold text-text">{{ formatUSD(effectiveOvertimePayRate(assignment)) }}/h</span>
            · {{ t('staffForm.billedToCompany') }} <span class="font-semibold text-text">{{ formatUSD(effectiveOvertimeBillRate(assignment)) }}/h</span>
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
        :label="t('staffForm.taxLabel')"
        :placeholder="companyTaxHint ? t('staffForm.taxEmpty', { hint: companyTaxHint }) : t('staffForm.taxEmptyDefault')"
        :hint="t('staffForm.taxHint')"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormInput v-model="bankName" :label="t('staffForm.bank')" :placeholder="t('staffForm.bankPlaceholder')" />
      <FormInput v-model="bankAccountHolder" :label="t('staffForm.holder')" :placeholder="t('staffForm.holderPlaceholder')" />
    </div>

    <FormDropdown
      v-model="paymentMethod"
      :label="t('staffForm.payMethod')"
      :placeholder="t('staffForm.selectMethod')"
      :options="PAYMENT_METHOD_OPTIONS"
    />

    <template v-if="paymentMethod === 'direct_deposit'">
      <FormDropdown v-model="bankAccountType" :label="t('staffForm.accountType')" :options="ACCOUNT_TYPE_OPTIONS" />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormInput
          v-model="bankRoutingNumber"
          label="Routing number"
          :placeholder="t('staffForm.digits9')"
        />
        <FormInput
          v-model="bankAccountNumber"
          :label="t('staffForm.accountNumber')"
        />
      </div>
    </template>

    <FormInput
      v-else-if="paymentMethod === 'payroll_card'"
      v-model="payrollCardNumber"
      :label="t('staffForm.cardNumber')"
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
import { useI18n, type MessageKey } from '../../i18n'

const { t } = useI18n()

const PAYMENT_METHOD_OPTIONS = computed(() => [
  { value: 'direct_deposit', label: t('staffForm.directDeposit') },
  { value: 'payroll_card', label: t('staffForm.payrollCard') },
])

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
]

const props = defineProps<{
  formData: EmpleadoFormData
  businessId: string | null
  isEditing?: boolean
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
  return shifts.map(r => ({ value: r.shift as string, label: SHIFT_OPTIONS.some(o => o.value === r.shift) ? t(`common.shift.${r.shift}` as MessageKey) : r.shift as string }))
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
  return company.taxRate === 0 ? t('staffForm.noWithholding') : `${Math.round(company.taxRate * 1000) / 10}%`
})

// Stored as a fraction (0.07) but edited as a percentage (7) — same convention as the
// company's own tax brackets in Empresas.vue. FormInput emits '' (not null) when cleared.
const taxRatePercent = computed<number | string>({
  get: () => (staffingTaxRate.value == null ? '' : Math.round(staffingTaxRate.value * 10000) / 100),
  set: (value) => {
    staffingTaxRate.value = value === '' || value == null ? null : Number(value) / 100
  },
})

</script>
