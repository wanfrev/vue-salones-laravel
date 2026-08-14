<template>
  <div class="space-y-4">
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
        placeholder="+58 412 1234567"
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
      <p class="text-xs font-semibold uppercase tracking-wider text-primary">Empresa y pago</p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormDropdown
          v-model="companyId"
          label="Empresa"
          placeholder="Selecciona la empresa donde trabaja"
          :options="companyOptions"
          required
        />
        
        <FormDropdown
          v-model="role"
          label="Rol / Puesto"
          placeholder="Seleccionar rol..."
          :options="roleOptions"
          required
        />
      </div>

      <p v-if="companyId && role && !resolvedRate" class="text-xs text-warning">
        Esta empresa no tiene una tarifa configurada para "{{ role }}" todavía — agrégala en Empresas
        antes de cargar horas.
      </p>
      <p v-else-if="resolvedRate" class="rounded-lg bg-bg-secondary/60 px-3 py-2 text-xs text-text-secondary">
        Gana <span class="font-semibold text-text">{{ formatUSD(resolvedRate.payRate) }}/h</span>
        · se cobra a la empresa <span class="font-semibold text-text">{{ formatUSD(resolvedRate.billRate) }}/h</span>
      </p>
    </div>

    <div>
      <FormInput
        v-model="taxRatePercent"
        type="number"
        min="0"
        max="100"
        step="0.1"
        label="% de tax (opcional)"
        :placeholder="companyTaxHint ? `Vacío = ${companyTaxHint}` : 'Vacío = 0%'"
        hint="Solo si este empleado necesita un porcentaje distinto al de la empresa."
      />
    </div>

    <FormInput v-model="address" label="Dirección" placeholder="Calle, ciudad, estado" />

    <FormInput
      v-model="ssn"
      label="SSN"
      placeholder="XXX-XX-XXXX"
      :hint="ssnHint"
    />

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
import { listStaffingCompanies, listStaffingRates, staffingCompanyKeys, staffingRateKeys } from '../../services/staffing/staffingService'
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

const name = field('name')
const phone = field('phone')
const email = field('email')
const companyId = field('staffingCompanyId')
const staffingTaxRate = field('staffingTaxRate')
const role = computed(() => props.formData.role)
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

const { data: rates } = useQuery({
  queryKey: computed(() => staffingRateKeys.byCompany(props.businessId, companyId.value || null)),
  queryFn: () => listStaffingRates(props.businessId!, companyId.value || null),
  enabled: computed(() => !!props.businessId && !!companyId.value),
})

const resolvedRate = computed(() =>
  (rates.value ?? []).find(r => r.role === role.value && r.active) ?? null,
)

const selectedCompany = computed(() => (companies.value ?? []).find(c => c.id === companyId.value) ?? null)

/** What "vacío" resolves to, so the admin isn't guessing which rate actually applies. */
const companyTaxHint = computed(() => {
  const rate = selectedCompany.value?.taxRate
  if (rate == null || rate === 0) return 'sin retención'
  return `${Math.round(rate * 1000) / 10}%`
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
