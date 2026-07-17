<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCurrency } from '../../composables/common/useCurrency'
import { useBusinessStore } from '../../store/business'
import { useNotification } from '../../composables/common/useNotification'
import { db } from '../../lib/api'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { exchangeRate } = useCurrency()
const businessStore = useBusinessStore()
const { info } = useNotification()

const employeeRateInput = ref<number | null>(null)
const isSaving = ref(false)
const error = ref('')

watch(() => props.show, (open) => {
  if (open) {
    employeeRateInput.value = businessStore.employeeExchangeRate ?? null
    error.value = ''
  }
})

const handleSave = async () => {
  const bid = businessStore.business?.id
  if (!bid) return
  if (employeeRateInput.value != null && (employeeRateInput.value <= 0 || !Number.isFinite(employeeRateInput.value))) {
    error.value = 'Ingresa una tasa válida mayor a 0'; return
  }
  isSaving.value = true
  try {
    const value = employeeRateInput.value == null ? null : employeeRateInput.value
    const { error: err } = await db.from('businesses').update({ employee_ves_rate: value }).eq('id', bid)
    if (err) throw err
    businessStore.updateBusiness({ employee_ves_rate: value } as any)
    emit('close')
    info(value == null ? 'Tasa de empleados desactivada' : `Tasa de empleados actualizada a ${value} Bs`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar'
  } finally { isSaving.value = false }
}

const handleClear = async () => {
  const bid = businessStore.business?.id
  if (!bid) return
  if (!window.confirm('¿Restablecer la tasa de empleados? Se usará la tasa global.')) return
  isSaving.value = true
  try {
    const { error: err } = await db.from('businesses').update({ employee_ves_rate: null }).eq('id', bid)
    if (err) throw err
    businessStore.updateBusiness({ employee_ves_rate: null } as any)
    employeeRateInput.value = null
    emit('close')
    info('Tasa de empleados desactivada')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar'
  } finally { isSaving.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')">
      <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Tasa para empleados</h2>
          <p class="text-sm text-text-muted">Esta tasa se usará SOLO para pagos de nómina, consumos/deuda y recibos de
            empleados.</p>
        </div>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label class="mb-1 block text-sm font-medium text-text">Tasa (Bs por 1 USD)</label>
            <input v-model.number="employeeRateInput" type="number" min="0" step="0.01"
              placeholder="Dejar vacío para usar la tasa global"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30" />
            <p class="mt-1 text-xs text-text-muted">Actual: {{ exchangeRate }} Bs (tasa global). {{ businessStore.employeeExchangeRate ? `Tasa empleados: ${businessStore.employeeExchangeRate} Bs.` : 'Sin tasa de empleados.' }}</p>
          </div>
          <div v-if="error" class="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{{ error }}
          </div>
          <div class="flex items-center justify-end gap-2">
            <button v-if="businessStore.employeeExchangeRate" type="button" @click="handleClear"
              class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">Restablecer</button>
            <button type="button" @click="emit('close')"
              class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">Cancelar</button>
            <button type="submit" :disabled="isSaving"
              class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:opacity-60">{{
                isSaving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
