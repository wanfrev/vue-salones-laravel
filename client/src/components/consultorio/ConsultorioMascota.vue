<template>
  <div class="space-y-6">
    <!-- Header with Back Button and Actions -->
    <header class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6 print-hidden">
      <div class="flex items-center gap-4">
        <button
          @click="$emit('back')"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:bg-bg-secondary hover:text-text transition-colors"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Historial Clínico
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-text">
            {{ pet.name }}
          </h1>
          <p class="text-sm text-text-muted mt-1 font-medium">
            Tutor: <span class="text-text">{{ pet.client?.full_name || pet.client?.name || '—' }}</span>
            <span v-if="pet.breed" class="mx-2 text-border-strong">•</span>
            <span v-if="pet.breed">{{ pet.breed }}</span>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="printHistory"
          class="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-muted shadow-xs hover:bg-bg-secondary transition-colors"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>
    </header>

    <div v-if="isLoading" class="py-12 text-center text-text-muted text-sm flex items-center justify-center gap-2">
      <svg class="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Cargando historial...
    </div>

    <div v-else-if="!visits || visits.length === 0" class="py-12 text-center border border-border border-dashed rounded-xl bg-surface">
      <svg class="mx-auto h-12 w-12 text-border-strong mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-text-muted font-medium">Esta mascota no tiene historial clínico registrado.</p>
    </div>

    <div v-else class="space-y-6">
      <style scoped>
        .print-only { display: none; }
        @media print {
          .print-only { display: block; }
          .print-hidden { display: none !important; }
        }
      </style>

      <div ref="printArea" class="print-area">
        <!-- Print Header -->
        <div class="print-only mb-6 border-b-2 border-primary/20 pb-4">
          <h1 class="text-2xl font-bold text-text mb-1">Historia Clínica Veterinaria</h1>
          <h2 class="text-lg font-semibold text-text">Paciente: {{ pet.name }} | Tutor: {{ pet.client?.full_name || pet.client?.name || '—' }}</h2>
          <p class="text-sm text-text-muted">Fecha de impresión: {{ new Date().toLocaleDateString('es-ES') }}</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="visit in visits"
            :key="visit.id"
            @click="openFichaModal(visit)"
            class="group border border-border hover:border-primary/50 rounded-xl p-5 bg-surface shadow-xs transition-all duration-200 page-break-inside-avoid relative cursor-pointer"
          >
            <!-- Visit Header -->
            <div class="flex justify-between items-start sm:items-center mb-5 pb-4 border-b border-border border-dashed flex-col sm:flex-row gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <h4 class="font-bold text-text text-lg">{{ formatDate(visit.start_time) }}</h4>
                  <span
                    v-if="visit.status"
                    class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ml-1"
                    :class="{
                      'bg-success/15 text-success': visit.status === 'confirmed' || visit.status === 'paid' || visit.status === 'completed',
                      'bg-warning/15 text-warning': visit.status === 'pending' || visit.status === 'in_progress',
                      'bg-danger/15 text-danger': visit.status === 'cancelled' || visit.status === 'no_show'
                    }"
                  >
                    {{ getStatusLabel(visit.status) }}
                  </span>
                </div>
                <p class="text-sm text-text-muted mt-1 font-medium flex items-center gap-1.5">
                  <span class="inline-block w-2 h-2 rounded-full bg-primary/40"></span>
                  {{ visit.services?.name || visit.service?.name || 'Servicio' }}
                </p>
              </div>
              <div class="text-left sm:text-right flex items-center gap-2 w-full sm:w-auto">
                <span class="text-xs font-bold px-3 py-1.5 bg-bg-secondary/50 text-text-secondary rounded-lg border border-border inline-flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Dr. {{ visit.profiles?.full_name || visit.employee_profile?.full_name || '—' }}
                </span>
                <button
                  @click.stop="editFicha(visit)"
                  class="print-hidden p-1.5 text-text-muted hover:text-primary bg-bg-secondary rounded-md transition-colors"
                  title="Editar Ficha"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  @click.stop="deleteFicha(visit)"
                  class="print-hidden p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 bg-bg-secondary rounded-md transition-colors"
                  title="Eliminar Ficha"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Clinical History (Structured) -->
            <div v-if="visit.clinical_history && Object.keys(visit.clinical_history).length > 0" class="mb-5">
              <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-3 border-l-2 border-primary pl-2">Diagnóstico por Sistemas</h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 bg-primary/5 rounded-xl p-4 border border-primary/10">
                <template v-for="(val, sys) in visit.clinical_history" :key="sys">
                  <div v-if="val" class="text-sm bg-surface p-2.5 rounded-lg border border-primary/5 shadow-xs">
                    <span class="font-bold text-text text-[13px] block mb-0.5 text-primary">{{ sys }}</span> 
                    <span class="text-text-secondary leading-relaxed">{{ val }}</span>
                  </div>
                </template>
              </div>
            </div>
            <!-- Fallback Diagnosis -->
            <div v-else-if="visit.diagnosis" class="mb-5">
              <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-2 border-l-2 border-primary pl-2">Diagnóstico General</h5>
              <p class="text-sm text-text-secondary bg-bg-secondary/40 rounded-lg p-3 border border-border whitespace-pre-line">{{ visit.diagnosis }}</p>
            </div>

            <!-- Treatment -->
            <div v-if="visit.treatment" class="mb-5">
              <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-2 border-l-2 border-primary pl-2">Tratamiento Indicado</h5>
              <p class="text-sm text-text-secondary bg-bg-secondary/40 rounded-lg p-3 border border-border whitespace-pre-line">{{ visit.treatment }}</p>
            </div>

            <!-- Notes -->
            <div v-if="visit.internal_notes || visit.service_notes" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div v-if="visit.service_notes">
                <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-l-2 border-border pl-2">Notas del Servicio</h5>
                <p class="text-sm text-text-secondary italic">{{ visit.service_notes }}</p>
              </div>
              <div v-if="visit.internal_notes">
                <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-l-2 border-border pl-2">Notas Internas</h5>
                <p class="text-sm text-text-secondary italic">{{ visit.internal_notes }}</p>
              </div>
            </div>

            <!-- Associated Products -->
            <div v-if="getVisitProducts(visit).length > 0" class="mt-4 pt-4 border-t border-border/60">
              <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">Insumos/Productos Aplicados</h5>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(p, i) in getVisitProducts(visit)" 
                  :key="i"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-medium text-text-secondary"
                >
                  <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  {{ p.productName || p.name || 'Producto' }} <strong class="text-text">x{{ p.quantity }}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <ConsultorioFichaModal />
    <HistoriaMedicaModal />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { apiRequest } from '../../lib/api'
import { useModal } from '../../composables/common/useModal'
import { deleteCita } from '../../services/agendaService'
import ConsultorioFichaModal from './ConsultorioFichaModal.vue'
import HistoriaMedicaModal from './HistoriaMedicaModal.vue'
import type { Pet } from '../../types/database'

const props = defineProps<{
  pet: Pet
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const visits = ref<any[]>([])
const isLoading = ref(true)
const printArea = ref<HTMLElement | null>(null)

const loadHistory = async () => {
  if (!props.pet || !props.pet.client_id) return
  isLoading.value = true
  try {
    const data = await apiRequest<any[]>('GET', `/clients/${props.pet.client_id}/pets/${props.pet.id}/history`)
    // Only show medical records created from Consultorio (or containing structured clinical history)
    visits.value = (data || []).filter(v => v.source === 'consultorio' || (v.clinical_history && Object.keys(v.clinical_history).length > 0))
  } catch (error) {
    console.error('Failed to load history', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadHistory()
})

watch(() => props.pet.id, () => {
  loadHistory()
})

const formatDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    confirmed: 'Confirmada',
    paid: 'Pagada',
    completed: 'Completada',
    pending: 'Pendiente',
    in_progress: 'En Proceso',
    cancelled: 'Cancelada',
    no_show: 'No Asistió'
  }
  return map[status] || status
}

const getVisitProducts = (visit: any): any[] => {
  if (!visit) return []
  if (Array.isArray(visit.associated_products)) return visit.associated_products
  if (Array.isArray(visit.associatedProducts)) return visit.associatedProducts
  return []
}

const openNewFicha = () => {
  useModal('historia-medica-modal').open({ pet: props.pet })
}

const editFicha = (visit: any) => {
  useModal('historia-medica-modal').open({ cita: visit, pet: props.pet })
}

const openFichaModal = (visit: any) => {
  useModal('consultorio-ficha-modal').open({ visit, pet: props.pet })
}

const deleteFicha = async (visit: any) => {
  if (!visit?.id) return
  if (!window.confirm('¿Deseas eliminar esta ficha médica? Esta acción no se puede deshacer.')) return
  try {
    await deleteCita(visit.id)
    await loadHistory()
  } catch (err) {
    console.error('Error deleting ficha', err)
  }
}

// Window Event listener to refresh when Cita is saved
const handleFocus = () => {
  loadHistory() // Simple way to refresh when modal closes and focus returns
}

onMounted(() => {
  window.addEventListener('focus', handleFocus)
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('focus', handleFocus)
})

const printHistory = () => {
  const content = printArea.value?.innerHTML
  if (!content) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`
    <html>
    <head>
      <title>Historial de ${props.pet.name}</title>
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
        .print-hidden { display: none !important; }
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
        .text-[13px] { font-size: 13px; }
        .text-text-muted { color: var(--color-text-muted); }
        .text-text-secondary { color: #3f3f46; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .border { border-width: 1px; }
        .border-border { border-color: var(--color-border); }
        .bg-surface { background-color: var(--color-surface); }
        .page-break-inside-avoid { page-break-inside: avoid; }
        .bg-primary\\/5 { background-color: rgba(134, 156, 132, 0.05) !important; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .p-5 { padding: 1.25rem; }
        .p-4 { padding: 1rem; }
        .p-3 { padding: 0.75rem; }
        .p-2\\.5 { padding: 0.625rem; }
        .pb-4 { padding-bottom: 1rem; }
        .border-b { border-bottom-width: 1px; }
        .border-primary\\/10 { border-color: rgba(134, 156, 132, 0.1); }
        .border-primary\\/5 { border-color: rgba(134, 156, 132, 0.05); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .justify-between { justify-content: space-between; }
        .items-start { align-items: flex-start; }
        .sm\\:items-center { align-items: center; }
        .mb-5 { margin-bottom: 1.25rem; }
        .border-dashed { border-style: dashed; }
        .flex-col { flex-direction: column; }
        .sm\\:flex-row { flex-direction: row; }
        .h-4 { height: 1rem; }
        .w-4 { width: 1rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-left { text-align: left; }
        .sm\\:text-right { text-align: right; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
        .bg-bg-secondary\\/50 { background-color: rgba(244, 244, 245, 0.5) !important; }
        .inline-flex { display: inline-flex; }
        .gap-1\\.5 { gap: 0.375rem; }
        .w-full { width: 100%; }
        .sm\\:w-auto { width: auto; }
        .justify-center { justify-content: center; }
        .sm\\:justify-start { justify-content: flex-start; }
        .text-\\[11px\\] { font-size: 11px; }
        .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .border-l-2 { border-left-width: 2px; }
        .pl-2 { padding-left: 0.5rem; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .gap-x-6 { column-gap: 1.5rem; }
        .gap-y-3 { row-gap: 0.75rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .bg-bg-secondary\\/40 { background-color: rgba(244, 244, 245, 0.4) !important; }
        .whitespace-pre-line { white-space: pre-line; }
        .italic { font-style: italic; }
        .block { display: block; }
        .leading-relaxed { line-height: 1.625; }
        @media print { 
          body { padding: 0; background: white; } 
          .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-primary\\/5, .bg-primary\\/10, .bg-primary\\/20, .bg-bg-secondary\\/40, .bg-bg-secondary\\/50 { 
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
