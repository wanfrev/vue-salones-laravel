<template>
  <div class="border-t border-border bg-bg-secondary/40 px-4 py-4">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-text">Tarifas por rol</p>
        <p class="text-xs text-text-muted">
          Lo que gana el empleado por hora y lo que se le cobra a la empresa por esa misma hora.
        </p>
      </div>
      <p v-if="rates.length" class="text-right">
        <span class="block text-[10px] uppercase tracking-wider text-text-muted">Margen promedio</span>
        <span class="text-sm font-bold tabular-nums text-success">{{ formatUSD(averageHourlyMargin) }}/h</span>
      </p>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-sm text-text-muted">Cargando tarifas...</div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-muted">
            <th class="pb-2 pr-3">Rol</th>
            <th class="pb-2 pr-3">Turno</th>
            <th class="pb-2 pr-3 text-right"># Empleados</th>
            <th class="pb-2 pr-3 text-right">Paga Reg</th>
            <th class="pb-2 pr-3 text-right">Cobra Reg</th>
            <th class="pb-2 pr-3 text-right">Margen</th>
            <th class="pb-2 pr-3 text-right">Hrs Reg</th>
            <th class="pb-2 pr-3 text-right">Paga OT</th>
            <th class="pb-2 pr-3 text-right">Cobra OT</th>
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
            <td class="py-2 text-right">
              <button type="button" title="Eliminar tarifa"
                class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-danger/10 hover:text-danger"
                @click="remove(rate.id)">
                <TrashBin2Icon class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <tr v-if="rates.length === 0">
            <td colspan="10" class="py-3 text-center text-xs text-text-muted">
              Sin tarifas todavía. Agrega el primer rol abajo.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form class="mt-3 flex flex-wrap items-end gap-2" @submit.prevent="submit">
      <div class="min-w-[130px] flex-1">
        <label :for="`role-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Rol</label>
        <input :id="`role-${companyId}`" v-model="draft.role" type="text" list="staffing-job-titles" required
          placeholder="Ej: Operario"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
        <!-- Reuses the business's existing job_titles list so roles stay consistent with Equipo. -->
        <datalist id="staffing-job-titles">
          <option v-for="title in jobTitles" :key="title" :value="title" />
        </datalist>
      </div>

      <div class="w-28">
        <label :for="`shift-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted" title="Solo si este rol paga distinto según el turno">
          Turno
        </label>
        <select :id="`shift-${companyId}`" v-model="draft.shift"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
          <option :value="null">General</option>
          <option v-for="opt in SHIFT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <div class="w-20">
        <label :for="`ot-threshold-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
          Hrs Reg
        </label>
        <input :id="`ot-threshold-${companyId}`" v-model.number="draft.overtimeThresholdHours" type="number" min="0"
          max="168" step="0.5" placeholder="40"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`pay-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Paga Reg ($)</label>
        <input :id="`pay-${companyId}`" v-model.number="draft.payRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`bill-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Cobra Reg ($)</label>
        <input :id="`bill-${companyId}`" v-model.number="draft.billRate" type="number" min="0" step="0.01" required
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`ot-pay-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Paga OT ($)</label>
        <input :id="`ot-pay-${companyId}`" v-model.number="draft.overtimePayRate" type="number" min="0" step="0.01"
          placeholder="0.00"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-24">
        <label :for="`ot-bill-${companyId}`" class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Cobra OT ($)</label>
        <input :id="`ot-bill-${companyId}`" v-model.number="draft.overtimeBillRate" type="number" min="0" step="0.01"
          placeholder="0.00"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
      </div>

      <div class="w-20">
        <span class="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Margen</span>
        <p class="px-1 py-2 text-sm font-semibold tabular-nums"
          :class="draftMargin > 0 ? 'text-success' : 'text-text-muted'">
          {{ formatUSD(draftMargin) }}
        </p>
      </div>

      <button type="submit" :disabled="saveMutation.isPending.value"
        class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
        {{ saveMutation.isPending.value ? 'Guardando...' : 'Agregar' }}
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
import { TrashBin2Icon } from '@solar-icons/vue/linear'
import { listCompanyEmployees, staffingTimesheetKeys, SHIFT_OPTIONS, type StaffingRateFormData } from '../../services/staffing/staffingService'

const props = defineProps<{
  businessId: string | null
  companyId: string
}>()

const businessStore = useBusinessStore()
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
const shiftLabel = (shift: string) => SHIFT_OPTIONS.find(o => o.value === shift)?.label ?? shift

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
    companyId: props.companyId,
    overtimeThresholdHours: normalizeOptionalNumber(draft.value.overtimeThresholdHours) ?? 40,
    overtimeMultiplier: null,
    overtimePayRate: normalizeOptionalNumber(draft.value.overtimePayRate),
    overtimeBillRate: normalizeOptionalNumber(draft.value.overtimeBillRate),
  })
  if (ok) draft.value = emptyDraft()
}
</script>
