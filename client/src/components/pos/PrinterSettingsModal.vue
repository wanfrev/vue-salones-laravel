<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" @click.self="emit('close')">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-text">Impresora térmica</h2>
          <p class="text-sm text-text-muted">Configura la impresora de esta computadora — es un ajuste local, no afecta a otros equipos.</p>
        </div>

        <div v-if="status === 'checking'" class="flex items-center gap-2 py-4 text-sm text-text-muted">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Buscando QZ Tray...
        </div>

        <div v-else-if="status === 'unavailable'" class="space-y-3">
          <div class="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning">
            <DangerTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
            <span>No se detectó QZ Tray en esta computadora. Sin él, los recibos se imprimen con el diálogo normal del navegador (más lento en impresoras térmicas).</span>
          </div>
          <a href="https://qz.io/download/" target="_blank" rel="noopener"
            class="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary">
            Descargar QZ Tray
          </a>
          <button type="button"
            class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
            @click="checkAndLoad">
            Ya lo instalé, reintentar
          </button>
        </div>

        <div v-else class="space-y-3">
          <div class="flex items-center gap-2 rounded-lg bg-success/10 p-2.5 text-xs font-medium text-success">
            <CheckCircleIcon class="h-4 w-4 shrink-0" />
            QZ Tray conectado
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-text" for="printer-select">Impresora</label>
            <select id="printer-select" v-model="selected" :class="inputClass">
              <option value="">Usar la impresora por defecto de Windows</option>
              <option v-for="name in printers" :key="name" :value="name">{{ name }}</option>
            </select>
            <p v-if="printers.length === 0" class="mt-1 text-xs text-text-muted">No se encontraron impresoras instaladas en esta PC.</p>
          </div>

          <p v-if="testError" class="text-xs text-danger">{{ testError }}</p>
          <p v-if="testOk" class="text-xs text-success">Ticket de prueba enviado — revisa la impresora.</p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" :disabled="testing"
              class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              @click="testPrint">
              {{ testing ? 'Imprimiendo...' : 'Imprimir prueba' }}
            </button>
            <button type="button"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover"
              @click="save">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBusinessStore } from '../../store/business'
import {
  getSelectedPrinterName, isQzAvailable, listQzPrinters, printThermalReceiptESC, setSelectedPrinterName,
} from '../../lib/qzPrinter'
import { DangerTriangleIcon, CheckCircleIcon } from '@solar-icons/vue/linear'

const emit = defineEmits<{ close: [] }>()

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/20'

const businessStore = useBusinessStore()

const status = ref<'checking' | 'available' | 'unavailable'>('checking')
const printers = ref<string[]>([])
const selected = ref(getSelectedPrinterName() ?? '')
const testing = ref(false)
const testOk = ref(false)
const testError = ref('')

const checkAndLoad = async () => {
  status.value = 'checking'
  testOk.value = false
  testError.value = ''
  const available = await isQzAvailable()
  if (!available) {
    status.value = 'unavailable'
    return
  }
  try {
    printers.value = await listQzPrinters()
  } catch {
    printers.value = []
  }
  status.value = 'available'
}

onMounted(checkAndLoad)

const save = () => {
  setSelectedPrinterName(selected.value || null)
  emit('close')
}

const testPrint = async () => {
  setSelectedPrinterName(selected.value || null)
  testing.value = true
  testOk.value = false
  testError.value = ''
  try {
    await printThermalReceiptESC({
      businessName: businessStore.business?.name ?? 'Luma',
      date: new Date().toLocaleString('es-VE'),
      subtotal: 0,
      total: 0,
      method: 'Prueba',
      currency: 'USD',
    })
    testOk.value = true
  } catch (err) {
    testError.value = err instanceof Error ? err.message : 'No se pudo imprimir la prueba.'
  } finally {
    testing.value = false
  }
}
</script>
