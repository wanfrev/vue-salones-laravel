<template>
  <div class="border-t border-border bg-bg-secondary/40 px-4 py-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-text">{{ t('rates.title') }}</p>
        <p class="text-xs text-text-muted">
          {{ t('rates.intro') }}
        </p>
      </div>
      <p v-if="rates.length" class="text-right">
        <span class="block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.avgMargin') }}</span>
        <span class="text-sm font-bold tabular-nums text-success">{{ formatUSD(averageHourlyMargin) }}/h</span>
      </p>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-sm text-text-muted">{{ t('rates.loading') }}</div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="pb-2 pr-3">{{ t('rates.colRole') }}</th>
            <th class="pb-2 pr-3">{{ t('rates.colShift') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colEmployees') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colPayReg') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colBillReg') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colMargin') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colRegHours') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colPayOt') }}</th>
            <th class="pb-2 pr-3 text-right">{{ t('rates.colBillOt') }}</th>
            <th class="pb-2 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="rate in rates" :key="rate.id" class="text-sm">
            <td class="py-2 pr-3 font-medium text-text">{{ rate.role }}</td>
            <td class="py-2 pr-3 text-text-secondary">
              <span v-if="rate.shift" class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{{ shiftLabel(rate.shift) }}</span>
              <span v-else class="text-text-muted">—</span>
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">{{ employeeCountByRoleShift[rateKey(rate.role, rate.shift)] ?? 0 }}</td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">{{ formatUSD(rate.payRate) }}</td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">{{ formatUSD(rate.billRate) }}</td>
            <td class="py-2 pr-3 text-right tabular-nums font-semibold"
              :class="rate.hourlyMargin > 0 ? 'text-success' : 'text-danger'">
              {{ formatUSD(rate.hourlyMargin) }}
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">
              {{ rate.overtimeThresholdHours != null ? `${rate.overtimeThresholdHours}h` : '40h' }}
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">
              {{ rate.overtimePayRate != null ? formatUSD(rate.overtimePayRate) : (rate.overtimeMultiplier ? `${rate.overtimeMultiplier}x` : '-') }}
            </td>
            <td class="py-2 pr-3 text-right tabular-nums text-text-secondary">
              {{ rate.overtimeBillRate != null ? formatUSD(rate.overtimeBillRate) : (rate.overtimeMultiplier ? `${rate.overtimeMultiplier}x` : '-') }}
            </td>
            <td class="py-2 text-right whitespace-nowrap">
              <button type="button" :title="t('rates.editRate')"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-primary/10 hover:text-primary"
                @click="startEdit(rate)">
                <PenIcon class="h-4 w-4" />
              </button>
              <button type="button" :title="t('rates.deleteRate')"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                @click="remove(rate.id)">
                <TrashBin2Icon class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <tr v-if="rates.length === 0">
            <td colspan="10" class="py-3 text-center text-xs text-text-muted">
              {{ t('rates.empty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="editingId" class="mt-3 text-xs font-semibold text-primary">
      {{ t('rates.editing', { role: draft.role, shift: draft.shift ? ` · ${shiftLabel(draft.shift)}` : '' }) }}
    </p>
    <form class="mt-3 flex flex-wrap items-end gap-2" @submit.prevent="submit">
      <div class="min-w-[130px] flex-1">
        <label :for="`role-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.colRole') }}</label>
        <input :id="`role-${companyId}`" v-model="draft.role" type="text" list="staffing-job-titles" required
          :placeholder="t('rates.rolePlaceholder')"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
        <!-- Reuses the business's existing job_titles list so roles stay consistent with Equipo. -->
        <datalist id="staffing-job-titles">
          <option v-for="title in jobTitles" :key="title" :value="title" />
        </datalist>
      </div>

      <div class="w-28">
        <label :for="`shift-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" :title="t('rates.shiftHint')">
          {{ t('rates.colShift') }}
        </label>
        <select :id="`shift-${companyId}`" v-model="draft.shift"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
          <option :value="null">{{ t('common.general') }}</option>
          <option v-for="opt in SHIFT_OPTIONS" :key="opt.value" :value="opt.value">{{ shiftLabel(opt.value) }}</option>
        </select>
      </div>

      <div class="w-20">
        <label :for="`ot-threshold-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
          {{ t('rates.colRegHours') }}
        </label>
        <input :id="`ot-threshold-${companyId}`" v-model.number="draft.overtimeThresholdHours" type="number" min="0"
          max="168" step="0.5" placeholder="40"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`pay-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.payReg') }}</label>
        <input :id="`pay-${companyId}`" v-model.number="draft.payRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`bill-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.billReg') }}</label>
        <input :id="`bill-${companyId}`" v-model.number="draft.billRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`ot-pay-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.payOt') }}</label>
        <input :id="`ot-pay-${companyId}`" v-model.number="draft.overtimePayRate" type="number" min="0" step="0.01"
          placeholder="0.00"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`ot-bill-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.billOt') }}</label>
        <input :id="`ot-bill-${companyId}`" v-model.number="draft.overtimeBillRate" type="number" min="0" step="0.01"
          placeholder="0.00"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-20">
        <span class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{{ t('rates.colMargin') }}</span>
        <p class="px-1 py-2 text-sm font-semibold tabular-nums"
          :class="draftMargin > 0 ? 'text-success' : 'text-text-muted'">
          {{ formatUSD(draftMargin) }}
        </p>
      </div>

      <button type="submit" :disabled="saveMutation.isPending.value"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {{ saveMutation.isPending.value ? t('common.saving') : (editingId ? t('rates.saveChanges') : t('rates.add')) }}
      </button>
      <button v-if="editingId" type="button" @click="cancelEdit"
        class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">
        {{ t('common.cancel') }}
      </button>
    </form>

    <p v-if="saveError" class="mt-2 text-xs text-danger">{{ saveError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRateCard } from '../../composables/staffing/useRateCard'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { PenIcon, TrashBin2Icon } from '@solar-icons/vue/linear'
import { useI18n, type MessageKey } from '../../i18n'
import { listCompanyEmployees, staffingTimesheetKeys, SHIFT_OPTIONS, type StaffingRateFormData, type StaffingRateRow } from '../../services/staffing/staffingService'

const props = defineProps<{
  businessId: string | null
  companyId: string
}>()

const businessStore = useBusinessStore()
const { t } = useI18n()
const { formatUSD } = useCurrency()
const jobTitles = computed(() => businessStore.jobTitles)

const { rates, isLoading, save, remove, saveError, saveMutation, averageHourlyMargin } = useRateCard(
  toRef(props, 'businessId'),
  toRef(props, 'companyId'),
)

const { data: companyEmployees } = useQuery({
  queryKey: computed(() => staffingTimesheetKeys.employees(props.businessId, props.companyId)),
  queryFn: () => listCompanyEmployees(props.businessId!, props.companyId),
  enabled: computed(() => !!props.businessId && !!props.companyId),
})

// Keyed by role+shift, not just role — two rate rows can share a role name (día vs noche), and
// counting employees by role alone would double-count them under both.
const rateKey = (role: string, shift?: string | null) => `${role}|${shift ?? ''}`
const shiftLabel = (shift: string) => SHIFT_OPTIONS.some(o => o.value === shift) ? t(`common.shift.${shift}` as MessageKey) : shift

const employeeCountByRoleShift = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const employee of companyEmployees.value ?? []) {
    const key = rateKey(employee.staffing_role || '', employee.staffing_shift)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

const emptyDraft = (): StaffingRateFormData => ({
  companyId: props.companyId,
  role: '',
  shift: null,
  payRate: 0,
  billRate: 0,
  overtimeThresholdHours: 40,
  overtimeMultiplier: null,
  overtimePayRate: null,
  overtimeBillRate: null,
})

const draft = ref<StaffingRateFormData>(emptyDraft())

// Set while correcting an existing row (see startEdit) — submit() then sends this as the id, so
// save() updates that exact row instead of falling through to create(). Free-typing the role
// into the Agregar form to "fix" a rate has no way to guarantee it matches the existing row's
// text exactly (a stray autocomplete character is enough — see GENERAL LABOR vs GENERAL LABOR 1
// in production), silently creating a second, unreachable rate instead of correcting the first.
const editingId = ref<string | null>(null)

const startEdit = (rate: StaffingRateRow) => {
  editingId.value = rate.id
  draft.value = {
    companyId: props.companyId,
    role: rate.role,
    shift: rate.shift,
    payRate: rate.payRate,
    billRate: rate.billRate,
    overtimeThresholdHours: rate.overtimeThresholdHours,
    overtimeMultiplier: rate.overtimeMultiplier,
    overtimePayRate: rate.overtimePayRate,
    overtimeBillRate: rate.overtimeBillRate,
  }
}

const cancelEdit = () => {
  editingId.value = null
  draft.value = emptyDraft()
}

const draftMargin = computed(() => (draft.value.billRate || 0) - (draft.value.payRate || 0))

// v-model.number leaves a cleared field as '' rather than null.
const normalizeOptionalNumber = (v: number | string | null | undefined): number | null =>
  v === '' || v === null || v === undefined ? null : Number(v)

const submit = async () => {
  // No derived multiplier: sending pay_rate * (otPay/pay) here would let the backend re-derive
  // an OT BILL rate from a PAY-side ratio too (see StaffingPayrollCalculator), silently
  // overriding whatever "Cobra OT ($)" was actually typed. Send both $ rates as-is instead —
  // they apply independently. Leaving overtimeMultiplier null falls back to the 1.5x default.
  const ok = await save({
    ...draft.value,
    id: editingId.value ?? undefined,
    companyId: props.companyId,
    overtimeThresholdHours: normalizeOptionalNumber(draft.value.overtimeThresholdHours) ?? 40,
    overtimeMultiplier: null,
    overtimePayRate: normalizeOptionalNumber(draft.value.overtimePayRate),
    overtimeBillRate: normalizeOptionalNumber(draft.value.overtimeBillRate),
  })
  if (ok) cancelEdit()
}
</script>
