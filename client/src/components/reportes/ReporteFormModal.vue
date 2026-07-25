<template>
  <ModalBase :is-open="isOpen" :title="isEditing ? 'Editar Reporte Diario' : 'Nuevo Reporte Diario'" @close="close">
    <div class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput v-model="formData.date" label="Fecha" type="date" required :error="errors.date" />
        <FormInput v-model="formData.exchange_rate" label="Tasa del Día (Bs/$)" type="number" step="0.01" min="0" required :error="errors.exchange_rate" />
        <FormInput v-model="formData.z_report_bs" label="Reporte Z (Bs)" type="number" step="0.01" min="0" />
        <FormInput v-model="formData.z_report_usd" label="Reporte Z (USD)" type="number" step="0.01" min="0" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Columna Bolívares -->
        <div class="space-y-4 rounded-xl border border-border p-4 bg-bg-secondary/30">
          <h3 class="text-sm font-bold text-text-secondary uppercase tracking-wider">Ingresos Bolívares (Bs)</h3>
          <div class="space-y-3">
            <FormInput v-model="formData.pos_bs" label="Punto de Venta" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.pago_movil_bs" label="Pago Móvil" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.cash_bs" label="Efectivo Bs" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.transfer_bs" label="Transferencia" type="number" step="0.01" min="0" />
          </div>
          <div class="pt-3 border-t border-border flex justify-between items-center">
            <span class="text-sm font-semibold text-text-muted">Total Ingresado Bs:</span>
            <span class="text-base font-bold text-text">{{ formatCurrency(totalBs) }} Bs</span>
          </div>
        </div>

        <!-- Columna Dólares -->
        <div class="space-y-4 rounded-xl border border-border p-4 bg-bg-secondary/30">
          <h3 class="text-sm font-bold text-text-secondary uppercase tracking-wider">Ingresos Dólares (USD)</h3>
          <div class="space-y-3">
            <FormInput v-model="formData.cash_usd" label="Efectivo USD" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.zelle_usd" label="Zelle" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.binance_usd" label="Binance" type="number" step="0.01" min="0" />
            <FormInput v-model="formData.cashea_usd" label="Cashea" type="number" step="0.01" min="0" />
          </div>
          <div class="pt-3 border-t border-border flex justify-between items-center">
            <span class="text-sm font-semibold text-text-muted">Total Ingresado USD:</span>
            <span class="text-base font-bold text-text">${{ formatCurrency(totalUsd) }}</span>
          </div>
        </div>
      </div>

      <!-- Gran Total (Informativo) -->
      <div class="rounded-xl border border-primary/20 bg-primary-light/10 p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 class="text-sm font-bold text-primary">Gran Total del Día</h4>
            <p class="text-xs text-text-muted mt-1">Calculado automáticamente cruzando bolívares y dólares con la tasa del día introducida.</p>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold text-text">{{ formatCurrency(grandTotalBs) }} Bs</div>
            <div class="text-sm font-medium text-text-muted">≈ ${{ formatCurrency(grandTotalUsd) }}</div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <button
          type="button"
          @click="close"
          class="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary active:scale-95"
          :disabled="isSaving"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="handleSubmit"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSaving"
        >
          <svg v-if="isSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isEditing ? 'Guardar Cambios' : 'Registrar Reporte' }}
        </button>
      </div>
    </template>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ModalBase from '../common/ModalBase.vue'
import FormInput from '../forms/FormInput.vue'
import { useBusinessStore } from '../../store/business'
import { saveDailyReport } from '../../services/dailyReportService'
import type { DailyReport } from '../../services/dailyReportService'
import { useNotification } from '../../composables/common/useNotification'

const businessStore = useBusinessStore()
const { showSuccess, showError } = useNotification()

const isOpen = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

const errors = ref<Record<string, string>>({})

const defaultForm = () => ({
  id: '',
  date: new Date().toISOString().split('T')[0],
  exchange_rate: '',
  z_report_bs: '',
  z_report_usd: '',
  pos_bs: '',
  pago_movil_bs: '',
  cash_bs: '',
  transfer_bs: '',
  cash_usd: '',
  zelle_usd: '',
  binance_usd: '',
  cashea_usd: '',
})

const formData = ref(defaultForm())

const emit = defineEmits<{
  saved: []
}>()

const parseNum = (val: string | number) => Number(val) || 0

const totalBs = computed(() => {
  return parseNum(formData.value.pos_bs) +
         parseNum(formData.value.pago_movil_bs) +
         parseNum(formData.value.cash_bs) +
         parseNum(formData.value.transfer_bs)
})

const totalUsd = computed(() => {
  return parseNum(formData.value.cash_usd) +
         parseNum(formData.value.zelle_usd) +
         parseNum(formData.value.binance_usd) +
         parseNum(formData.value.cashea_usd)
})

const grandTotalBs = computed(() => {
  const rate = parseNum(formData.value.exchange_rate)
  return totalBs.value + (totalUsd.value * rate)
})

const grandTotalUsd = computed(() => {
  const rate = parseNum(formData.value.exchange_rate)
  if (rate === 0) return totalUsd.value
  return totalUsd.value + (totalBs.value / rate)
})

const formatCurrency = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const open = (report?: DailyReport) => {
  errors.value = {}
  isEditing.value = !!report
  if (report) {
    formData.value = {
      id: report.id,
      date: report.date,
      exchange_rate: String(report.exchange_rate || ''),
      z_report_bs: String(report.z_report_bs || ''),
      z_report_usd: String(report.z_report_usd || ''),
      pos_bs: String(report.pos_bs || ''),
      pago_movil_bs: String(report.pago_movil_bs || ''),
      cash_bs: String(report.cash_bs || ''),
      transfer_bs: String(report.transfer_bs || ''),
      cash_usd: String(report.cash_usd || ''),
      zelle_usd: String(report.zelle_usd || ''),
      binance_usd: String(report.binance_usd || ''),
      cashea_usd: String(report.cashea_usd || ''),
    }
  } else {
    formData.value = defaultForm()
    formData.value.exchange_rate = String(businessStore.business?.ves_exchange_rate || '')
  }
  isOpen.value = true
}

const close = () => {
  if (!isSaving.value) isOpen.value = false
}

const validate = () => {
  errors.value = {}
  if (!formData.value.date) errors.value.date = 'Requerido'
  if (!formData.value.exchange_rate || parseNum(formData.value.exchange_rate) <= 0) errors.value.exchange_rate = 'Inválida'
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  isSaving.value = true
  try {
    const payload = {
      id: isEditing.value ? formData.value.id : undefined,
      business_id: businessStore.business!.id,
      branch_id: businessStore.selectedBranchId,
      date: formData.value.date,
      exchange_rate: parseNum(formData.value.exchange_rate),
      z_report_bs: parseNum(formData.value.z_report_bs),
      z_report_usd: parseNum(formData.value.z_report_usd),
      pos_bs: parseNum(formData.value.pos_bs),
      pago_movil_bs: parseNum(formData.value.pago_movil_bs),
      cash_bs: parseNum(formData.value.cash_bs),
      transfer_bs: parseNum(formData.value.transfer_bs),
      cash_usd: parseNum(formData.value.cash_usd),
      zelle_usd: parseNum(formData.value.zelle_usd),
      binance_usd: parseNum(formData.value.binance_usd),
      cashea_usd: parseNum(formData.value.cashea_usd),
      total_bs: totalBs.value,
      total_usd: totalUsd.value,
    }
    await saveDailyReport(payload)
    showSuccess('Reporte guardado exitosamente')
    emit('saved')
    close()
  } catch (error: any) {
    showError(error.message || 'Error al guardar')
  } finally {
    isSaving.value = false
  }
}

defineExpose({ open })
</script>
