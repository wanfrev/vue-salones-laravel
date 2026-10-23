<template>
  <FeatureGate :gate="{ capability: 'staffing.timesheets' }">
    <header class="mb-4">
      <div class="flex items-center gap-2">
        <WalletMoneyIcon class="h-4 w-4 shrink-0 text-primary" />
        <h1 class="text-xl font-bold tracking-tight text-text sm:text-2xl">Nómina</h1>
      </div>
      <p class="mt-1 max-w-3xl text-sm text-text-muted">
        Elige una empresa y una semana, carga las horas de cada empleado y presiona «Guardar y calcular» para ver
        el pago y la factura. Cuando todo esté correcto, aprueba la semana; después puedes generar la factura y
        marcar la nómina como pagada.
      </p>
    </header>

    <section class="rounded-2xl border border-border bg-surface p-4 shadow-sm lg:p-6">
      <StaffingHoursPanel :business-id="businessId" :initial-company-id="initialCompanyId" :initial-week-start="initialWeekStart" :initial-project-id="initialProjectId" />
    </section>

    <section v-if="businessStore.features.staffing_approval_stamp" class="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm lg:p-6">
      <div class="mb-5">
        <h2 class="text-sm font-semibold text-text">Quién aprueba las nóminas</h2>
        <p class="mt-0.5 max-w-3xl text-xs leading-relaxed text-text-muted">
          Cada nómina aprobada queda con el nombre de quien la aprobó, la fecha y un código. Con el código puedes
          comprobar después quién la aprobó y si los números cambiaron desde entonces.
        </p>
      </div>
      <div class="grid gap-6 lg:grid-cols-2">
        <ApprovalCodeVerifier />
        <ApproversPanel :business-id="businessId" />
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm lg:p-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-text">Lista de depósitos de la semana</p>
          <p class="max-w-2xl text-xs text-text-muted">
            Reúne en una sola lista todo lo que hay que depositar esa semana, con el titular, el banco y el
            monto de cada empleado. Solo aparecen empleados que cobran por depósito directo y cuya nómina ya está aprobada.
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <span class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Empresa (opcional)
            </span>
            <div class="w-48">
              <FilterSelect v-model="depositCompanyId" :options="depositCompanyOptions" aria-label="Empresa (opcional)" default-value="" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted" for="deposit-week">
              Semana desde
            </label>
            <input id="deposit-week" v-model="depositWeekStart" type="date"
              class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </div>
          <button type="button" :disabled="!depositWeekStart || isGeneratingDepositList" @click="handleGenerateDepositList"
            class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {{ isGeneratingDepositList ? 'Buscando...' : 'Buscar depósitos' }}
          </button>
        </div>
      </div>
      <p v-if="depositListError" class="mt-2 text-xs text-danger">{{ depositListError }}</p>

      <div v-if="depositListRows.length > 0" class="mt-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text">Resultados ({{ depositListRows.length }})</h3>
          <button type="button" @click="handlePrintList"
            class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text transition-theme hover:bg-bg-secondary">
            <PrinterIcon class="h-4 w-4" />
            Imprimir
          </button>
        </div>
        <div class="overflow-hidden rounded-xl border border-border-subtle bg-surface">
          <div class="scroll-thin overflow-x-auto overflow-y-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  <th class="px-4 py-2.5">Empleado</th>
                  <th class="px-4 py-2.5">Empresa / Turno</th>
                  <th class="px-4 py-2.5">Titular de la cuenta</th>
                  <th class="px-4 py-2.5">Banco</th>
                  <th class="px-4 py-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                <tr v-for="row in depositListRows" :key="row.employeeId + row.companyName">
                  <td class="px-4 py-2.5 font-medium text-text">{{ row.employeeName }}</td>
                  <td class="px-4 py-2.5">
                    <span class="text-text">{{ row.companyName }}</span>
                    <span v-if="row.shift" class="ml-1 text-xs text-text-muted">({{ row.shift }})</span>
                  </td>
                  <td class="px-4 py-2.5 text-text-secondary">{{ row.titular }}</td>
                  <td class="px-4 py-2.5 text-text-secondary">{{ row.bankName || '—' }}</td>
                  <td class="px-4 py-2.5 text-right font-semibold text-text">{{ formatUSD(row.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { useCurrency } from '../composables/common/useCurrency'
import { useBusinessStore } from '../store/business'
import { FeatureGate } from '../components/common'
import FilterSelect from '../components/common/FilterSelect.vue'
import StaffingHoursPanel from '../components/staffing/StaffingHoursPanel.vue'
import ApprovalCodeVerifier from '../components/staffing/ApprovalCodeVerifier.vue'
import ApproversPanel from '../components/staffing/ApproversPanel.vue'
import { getStaffingDepositList, listStaffingCompanies, staffingCompanyKeys } from '../services/staffing/staffingService'
import type { StaffingDepositListRow } from '../services/staffing/staffingService'
import { printStaffingDepositList } from '../lib/staffingDepositListPrint'
import { WalletMoneyIcon, PrinterIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const { formatUSD } = useCurrency()

const { data: companies } = useQuery({
  queryKey: computed(() => staffingCompanyKeys.all(businessId.value)),
  queryFn: () => listStaffingCompanies(businessId.value!),
  enabled: computed(() => !!businessId.value),
})

// Deep link from Reportes > Mensual — clicking a company's week takes you straight to its nómina.
const route = useRoute()
const initialCompanyId = computed(() => (route.query.companyId as string) || null)
const initialWeekStart = computed(() => (route.query.weekStart as string) || null)
// 'general' is MonthlyPayrollReport's stand-in for a real `null` (vue-router drops null query
// values), so it unpacks back to null here rather than being read as the string 'general'.
const initialProjectId = computed(() => {
  const raw = route.query.projectId as string | undefined
  if (!raw) return undefined
  return raw === 'general' ? null : raw
})

const depositCompanyOptions = computed(() => [
  { value: '', label: 'Todas las empresas' },
  ...(companies.value ?? []).map(c => ({ value: c.id, label: c.name })),
])

const depositWeekStart = ref('')
const depositCompanyId = ref('')
const isGeneratingDepositList = ref(false)
const depositListError = ref('')
const depositListRows = ref<StaffingDepositListRow[]>([])

const handleGenerateDepositList = async () => {
  if (!depositWeekStart.value) return
  depositListError.value = ''
  isGeneratingDepositList.value = true
  depositListRows.value = []
  try {
    const rows = await getStaffingDepositList(depositWeekStart.value, depositCompanyId.value || null)
    if (rows.length === 0) {
      depositListError.value = 'No hay pagos por depósito directo listos para esa semana — revisa que la nómina de esas empresas ya esté aprobada.'
      return
    }
    depositListRows.value = rows
  } catch (err) {
    depositListError.value = err instanceof Error ? err.message : 'No se pudo generar la lista.'
  } finally {
    isGeneratingDepositList.value = false
  }
}

const handlePrintList = () => {
  if (depositListRows.value.length === 0) return
  printStaffingDepositList(depositListRows.value, depositWeekStart.value, businessStore.business?.name || 'Delta Work Force')
}
</script>
