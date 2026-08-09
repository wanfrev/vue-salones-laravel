<template>
  <div class="space-y-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Empresa y pago</p>

    <FormDropdown
      v-model="companyId"
      label="Empresa"
      placeholder="Selecciona la empresa donde trabaja"
      :options="companyOptions"
      required
    />
    <p v-if="companyId && role && !resolvedRate" class="text-xs text-warning">
      Esta empresa no tiene una tarifa configurada para "{{ role }}" todavía — agrégala en Empresas
      antes de cargar horas.
    </p>
    <p v-else-if="resolvedRate" class="rounded-lg bg-bg-secondary/60 px-3 py-2 text-xs text-text-secondary">
      Gana <span class="font-semibold text-text">{{ formatUSD(resolvedRate.payRate) }}/h</span>
      · se cobra a la empresa <span class="font-semibold text-text">{{ formatUSD(resolvedRate.billRate) }}/h</span>
    </p>

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
import { listStaffingCompanies, listStaffingRates, staffingCompanyKeys, staffingRateKeys } from '../../services/staffingService'
import type { EmpleadoFormData } from '../../types/empleado'

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
  /** Read-only context from the saved record — a blank input never overwrites these. */
  bankAccountLast4?: string | null
  payrollCardLast4?: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [data: EmpleadoFormData] }>()

const { formatUSD } = useCurrency()

// Same two-way-binding-via-computed pattern SalaryConfig.vue uses for `formData`.
const field = <K extends keyof EmpleadoFormData>(key: K) => computed<EmpleadoFormData[K]>({
  get: () => props.formData[key],
  set: (value) => emit('update:modelValue', { ...props.formData, [key]: value }),
})

const companyId = field('staffingCompanyId')
const role = computed(() => props.formData.role)
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

const { data: rates } = useQuery({
  queryKey: computed(() => staffingRateKeys.byCompany(props.businessId, companyId.value || null)),
  queryFn: () => listStaffingRates(props.businessId!, companyId.value || null),
  enabled: computed(() => !!props.businessId && !!companyId.value),
})

const resolvedRate = computed(() =>
  (rates.value ?? []).find(r => r.role === role.value && r.active) ?? null,
)

const accountHint = computed(() =>
  props.bankAccountLast4 ? `Terminada en ${props.bankAccountLast4} — deja vacío para mantenerla` : undefined,
)
const cardHint = computed(() =>
  props.payrollCardLast4 ? `Terminada en ${props.payrollCardLast4} — deja vacío para mantenerla` : undefined,
)
</script>
