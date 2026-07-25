<template>
  <ModalBase
    :is-open="isOpen"
    title="Historial de Mascotas"
    :subtitle="clientName ? `Historial clínico de ${clientName}` : ''"
    icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    size="xl"
    @close="close"
  >
    <div v-if="loading" class="py-12 text-center text-text-muted text-sm">Cargando historial...</div>

    <div v-else-if="petsWithHistory.length === 0" class="py-12 text-center text-text-muted text-sm">
      No hay mascotas con historial registrado
    </div>

    <div v-else class="space-y-6">
      <style scoped>
        .print-only { display: none; }
        @media print {
          .print-only { display: block; }
        }
      </style>
      <!-- Print button -->
      <div class="flex justify-end">
        <button @click="printHistory" class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-bg-secondary transition-colors">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
      </div>

      <div ref="printArea" class="print-area">
        <!-- Print Header -->
        <div class="print-only mb-6 border-b-2 border-primary/20 pb-4">
          <h1 class="text-2xl font-bold text-text mb-1">Historia Clínica Veterinaria</h1>
          <h2 class="text-lg font-semibold text-text">Tutor: {{ clientName || '—' }}</h2>
          <p class="text-sm text-text-muted">Fecha de impresión: {{ new Date().toLocaleDateString('es-ES') }}</p>
        </div>

        <div class="space-y-8">
          <template v-for="pet in petsWithHistory" :key="pet.id">
            <div class="rounded-xl border border-border bg-surface overflow-hidden page-break-inside-avoid">
              <!-- Pet header -->
              <div class="bg-primary/5 px-4 py-3 border-b border-primary/10">
                <div class="flex items-center gap-2">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold print-exact">
                    {{ getInitials(pet.name) }}
                  </div>
                  <div>
                    <p class="font-bold text-text text-lg leading-tight">{{ pet.name }}</p>
                    <p class="text-sm text-text-muted font-medium mt-0.5">
                      {{ pet.breed || 'Sin raza' }} <template v-if="pet.weight"> · {{ pet.weight }}</template>
                    </p>
                  </div>
                  <span class="ml-auto text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full print-exact">{{ pet.visits.length }} visita(s)</span>
                </div>
              </div>

              <!-- Visits List -->
              <div class="p-4 space-y-4 bg-bg-secondary/10">
                <div v-for="visit in pet.visits" :key="visit.id" class="border border-border rounded-lg p-4 bg-surface shadow-xs page-break-inside-avoid">
                  <!-- Visit Header -->
                  <div class="flex justify-between items-start sm:items-center mb-4 pb-3 border-b border-border border-dashed flex-col sm:flex-row gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <h4 class="font-bold text-text text-base">{{ formatDate(visit.start_time) }}</h4>
                      </div>
                      <p class="text-sm text-text-muted mt-0.5 font-medium">{{ visit.services?.name || visit.service?.name || 'Servicio' }}</p>
                    </div>
                    <div class="text-left sm:text-right">
                      <span class="text-xs font-bold px-2.5 py-1.5 bg-bg text-text-muted rounded-md border border-border inline-flex items-center gap-1.5">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Atendió: {{ visit.profiles?.full_name || visit.employee_profile?.full_name || '—' }}
                      </span>
                    </div>
                  </div>

                  <!-- Clinical History (Structured) -->
                  <div v-if="visit.clinical_history && Object.keys(visit.clinical_history).length > 0" class="mb-4">
                    <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-2.5 border-l-2 border-primary pl-2">Diagnóstico por Sistemas</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-primary/5 rounded-lg p-3">
                      <template v-for="(val, sys) in visit.clinical_history" :key="sys">
                        <div v-if="val" class="text-sm">
                          <span class="font-bold text-text">{{ sys }}:</span> 
                          <span class="text-text-muted ml-1">{{ val }}</span>
                        </div>
                      </template>
                    </div>
                  </div>
                  <!-- Fallback Diagnosis -->
                  <div v-else-if="visit.diagnosis" class="mb-4">
                    <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-1.5 border-l-2 border-primary pl-2">Diagnóstico General</h5>
                    <p class="text-sm text-text-muted bg-bg-secondary/30 rounded p-2">{{ visit.diagnosis }}</p>
                  </div>

                  <!-- Treatment -->
                  <div v-if="visit.treatment" class="mb-4">
                    <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-1.5 border-l-2 border-primary pl-2">Tratamiento</h5>
                    <p class="text-sm text-text-muted bg-bg-secondary/30 rounded p-2">{{ visit.treatment }}</p>
                  </div>

                  <!-- Notes -->
                  <div v-if="visit.internal_notes || visit.service_notes">
                    <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-l-2 border-border pl-2">Notas</h5>
                    <p class="text-sm text-text-muted italic">{{ visit.internal_notes || visit.service_notes }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModalBase from '../common/ModalBase.vue'
import { listPetsByClient } from '../../services/petService'
import { apiRequest } from '../../lib/api'
import { getInitials } from '../../lib/formatters'
import type { Pet } from '../../types/database'

const MODAL_ID = 'pet-history-modal'

const props = defineProps<{
  modelValue: boolean
  clientId?: string
  clientName?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const isOpen = ref(false)
const loading = ref(false)
const printArea = ref<HTMLElement | null>(null)
const petsWithHistory = ref<Array<Pet & { visits: any[] }>>([])

watch(() => props.modelValue, async (val) => {
  isOpen.value = val
  if (val && props.clientId) {
    await loadHistory()
  }
})

const close = () => {
  isOpen.value = false
  emit('update:modelValue', false)
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const loadHistory = async () => {
  if (!props.clientId) return
  loading.value = true
  try {
    const pets = await listPetsByClient(props.clientId)
    const results: Array<Pet & { visits: any[] }> = []

    for (const pet of pets) {
      const visits = await apiRequest<any[]>('GET', `/clients/${props.clientId}/pets/${pet.id}/history`)
      if (visits.length > 0) {
        results.push({ ...pet, visits })
      }
    }

    petsWithHistory.value = results
  } catch {
    petsWithHistory.value = []
  } finally {
    loading.value = false
  }
}

const printHistory = () => {
  const content = printArea.value?.innerHTML
  if (!content) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`
    <html>
    <head>
      <title>Historial de Mascotas - ${props.clientName || ''}</title>
      <style>
        :root {
          --color-bg: #ffffff;
          --color-surface: #ffffff;
          --color-text: #1a1a1a;
          --color-text-muted: #52525b;
          --color-border: #e4e4e7;
          --color-primary: #869C84;
        }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: var(--color-text); line-height: 1.5; }
        .print-only { display: block !important; }
        .hidden { display: none !important; }
        .mb-6 { margin-bottom: 1.5rem; }
        .pb-4 { padding-bottom: 1rem; }
        .border-b-2 { border-bottom-width: 2px; }
        .border-primary\\/20 { border-color: rgba(134, 156, 132, 0.2); }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .font-bold { font-weight: 700; }
        .text-text { color: var(--color-text); }
        .mb-1 { margin-bottom: 0.25rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .font-semibold { font-weight: 600; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-text-muted { color: var(--color-text-muted); }
        .space-y-8 > * + * { margin-top: 2rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .border { border-width: 1px; }
        .border-border { border-color: var(--color-border); }
        .bg-surface { background-color: var(--color-surface); }
        .overflow-hidden { overflow: hidden; }
        .page-break-inside-avoid { page-break-inside: avoid; }
        .bg-primary\\/5 { background-color: rgba(134, 156, 132, 0.05) !important; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .border-b { border-bottom-width: 1px; }
        .border-primary\\/10 { border-color: rgba(134, 156, 132, 0.1); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .h-10 { height: 2.5rem; }
        .w-10 { width: 2.5rem; }
        .justify-center { justify-content: center; }
        .rounded-full { border-radius: 9999px; }
        .bg-primary\\/20 { background-color: rgba(134, 156, 132, 0.2) !important; }
        .text-primary { color: var(--color-primary); }
        .leading-tight { line-height: 1.25; }
        .font-medium { font-weight: 500; }
        .mt-0\\.5 { margin-top: 0.125rem; }
        .ml-auto { margin-left: auto; }
        .bg-primary\\/10 { background-color: rgba(134, 156, 132, 0.1) !important; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .p-4 { padding: 1rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .bg-bg-secondary\\/10 { background-color: rgba(244, 244, 245, 0.5) !important; }
        .shadow-xs { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        .justify-between { justify-content: space-between; }
        .items-start { align-items: flex-start; }
        .sm\\:items-center { align-items: center; }
        .mb-4 { margin-bottom: 1rem; }
        .pb-3 { padding-bottom: 0.75rem; }
        .border-dashed { border-style: dashed; }
        .flex-col { flex-direction: column; }
        .sm\\:flex-row { flex-direction: row; }
        .h-4 { height: 1rem; }
        .w-4 { width: 1rem; }
        .text-base { font-size: 1rem; line-height: 1.5rem; }
        .text-left { text-align: left; }
        .sm\\:text-right { text-align: right; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
        .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
        .bg-bg { background-color: var(--color-bg) !important; }
        .inline-flex { display: inline-flex; }
        .gap-1\\.5 { gap: 0.375rem; }
        .h-3\\.5 { height: 0.875rem; }
        .w-3\\.5 { width: 0.875rem; }
        .text-\\[11px\\] { font-size: 11px; }
        .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; }
        .mb-2\\.5 { margin-bottom: 0.625rem; }
        .border-l-2 { border-left-width: 2px; }
        .pl-2 { padding-left: 0.5rem; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .gap-x-6 { column-gap: 1.5rem; }
        .gap-y-2 { row-gap: 0.5rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .p-3 { padding: 0.75rem; }
        .ml-1 { margin-left: 0.25rem; }
        .mb-1\\.5 { margin-bottom: 0.375rem; }
        .bg-bg-secondary\\/30 { background-color: rgba(244, 244, 245, 0.8) !important; }
        .rounded { border-radius: 0.25rem; }
        .p-2 { padding: 0.5rem; }
        .italic { font-style: italic; }
        @media print { 
          body { padding: 0; background: white; } 
          .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-primary\\/5, .bg-primary\\/10, .bg-primary\\/20, .bg-bg-secondary\\/10, .bg-bg-secondary\\/30 { 
            -webkit-print-color-adjust: exact; print-color-adjust: exact; 
          }
        }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}
</script>
