<template>
  <ModalBase
    :is-open="isOpen"
    title="Ficha Médica"
    :subtitle="visit ? `Atención del ${formatDate(visit.start_time)}` : ''"
    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 002 2z"
    size="xl"
    :is-loading="false"
    confirm-text="Imprimir Ficha"
    cancel-text="Cerrar"
    @close="close"
    @confirm="printFicha"
  >
    <div v-if="visit && pet" class="space-y-6">
      <style scoped>
        .print-only { display: none; }
        @media print {
          .print-only { display: block; }
          .print-hidden { display: none !important; }
          .modal-content { padding: 0 !important; border: none !important; }
        }
      </style>

      <div ref="printArea" class="print-area">
        <!-- Print Header -->
        <div class="print-only mb-6 border-b-2 border-primary/20 pb-4">
          <h1 class="text-2xl font-bold text-text mb-1">Ficha Clínica Veterinaria</h1>
          <h2 class="text-lg font-semibold text-text">Paciente: {{ pet.name }} | Tutor: {{ pet.client?.full_name || pet.client?.name || '—' }}</h2>
          <p class="text-sm text-text-muted">Raza: {{ pet.breed || 'N/A' }} | Peso: {{ pet.weight || 'N/A' }}</p>
          <p class="text-sm text-text-muted mt-1">Fecha de atención: {{ formatDate(visit.start_time) }}</p>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4 bg-bg-secondary/30 p-4 rounded-xl border border-border">
            <div>
              <p class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">Médico / Atendió</p>
              <p class="text-sm font-semibold text-text">Dr. {{ visit.profiles?.full_name || visit.employee_profile?.full_name || '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1">Registro</p>
              <p class="text-sm font-semibold text-text">Historia Médica Clínica</p>
            </div>
          </div>

          <!-- Clinical History (Structured) -->
          <div>
            <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-3 border-l-2 border-primary pl-2">Diagnóstico por Sistemas</h5>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 bg-primary/5 rounded-xl p-4 border border-primary/10">
              <div v-for="sys in systemList" :key="sys.key" class="text-sm bg-surface p-3 rounded-lg border border-primary/5 shadow-xs">
                <span class="font-bold text-text text-[13px] block mb-0.5 text-primary">{{ sys.label }}</span> 
                <span class="text-text-secondary leading-relaxed whitespace-pre-line" :class="{ 'italic text-text-muted': !getSystemVal(sys.key) }">
                  {{ getSystemVal(sys.key) || 'No aplica' }}
                </span>
              </div>
            </div>
          </div>

          <!-- General Diagnosis -->
          <div>
            <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-2 border-l-2 border-primary pl-2">Diagnóstico General</h5>
            <p class="text-sm text-text-secondary bg-bg-secondary/40 rounded-lg p-3 border border-border whitespace-pre-line" :class="{ 'italic text-text-muted': !visit.diagnosis }">
              {{ visit.diagnosis || 'No aplica' }}
            </p>
          </div>

          <!-- Treatment -->
          <div>
            <h5 class="text-[11px] font-bold text-primary uppercase tracking-widest mb-2 border-l-2 border-primary pl-2">Tratamiento Indicado</h5>
            <p class="text-sm text-text-secondary bg-bg-secondary/40 rounded-lg p-3 border border-border whitespace-pre-line" :class="{ 'italic text-text-muted': !visit.treatment }">
              {{ visit.treatment || 'No aplica' }}
            </p>
          </div>

          <!-- Notes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-l-2 border-border pl-2">Notas del Servicio</h5>
              <p class="text-sm text-text-secondary italic">{{ visit.service_notes || 'No aplica' }}</p>
            </div>
            <div>
              <h5 class="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 border-l-2 border-border pl-2">Notas Internas</h5>
              <p class="text-sm text-text-secondary italic">{{ visit.internal_notes || visit.notes || 'No aplica' }}</p>
            </div>
          </div>

          <!-- Associated Products -->
          <div v-if="getVisitProducts(visit).length > 0" class="pt-4 border-t border-border/60">
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

        <div class="mt-6 flex justify-start pt-4 border-t border-border print-hidden">
          <button
            type="button"
            @click="handleDelete"
            class="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/15 transition-colors"
          >
            Eliminar Ficha
          </button>
        </div>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { deleteCita } from '../../services/agendaService'
import { useQueryClient } from '@tanstack/vue-query'
import ModalBase from '../common/ModalBase.vue'
import type { Pet } from '../../types/database'

const MODAL_ID = 'consultorio-ficha-modal'

const { isOpen, modalData, close } = useModal(MODAL_ID)

const visit = ref<any>(null)
const pet = ref<Pet | null>(null)
const printArea = ref<HTMLElement | null>(null)

const systemList = [
  { key: 'Oftálmico', label: 'Sistema Oftálmico / Ojos' },
  { key: 'Otológico', label: 'Sistema Otológico / Oídos' },
  { key: 'Tegumentario', label: 'Sistema Tegumentario / Piel y Anexos' },
  { key: 'Músculo-Esquelético', label: 'Sistema Músculo-Esquelético' },
  { key: 'Respiratorio', label: 'Sistema Respiratorio' },
  { key: 'Cardiovascular', label: 'Sistema Cardiovascular' },
  { key: 'Gastrointestinal', label: 'Sistema Gastrointestinal / Digestivo' },
  { key: 'Genitourinario', label: 'Sistema Genitourinario (Urinario y Reproductor)' },
  { key: 'Nervioso', label: 'Sistema Nervioso / Neurológico' },
  { key: 'Linfático', label: 'Sistema Linfático / Inmunológico' },
  { key: 'Otros', label: 'Otros Diagnósticos' },
]

const getSystemVal = (key: string) => {
  if (!visit.value?.clinical_history && !visit.value?.clinicalHistory) return ''
  const hist = visit.value.clinical_history || visit.value.clinicalHistory || {}
  const val = hist[key]
  if (!val || val === 'No aplica') return ''
  return val
}

watch(() => modalData.value, (data) => {
  if (data?.visit && data?.pet) {
    visit.value = data.visit
    pet.value = data.pet
  }
}, { immediate: true })

const formatDate = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getVisitProducts = (v: any): any[] => {
  if (!v) return []
  if (Array.isArray(v.associated_products)) return v.associated_products
  if (Array.isArray(v.associatedProducts)) return v.associatedProducts
  return []
}

const printFicha = () => {
  const content = printArea.value?.innerHTML
  if (!content) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`
    <html>
    <head>
      <title>Ficha Médica de ${pet.value?.name}</title>
      <style>
        :root {
          --color-bg: #ffffff;
          --color-surface: #ffffff;
          --color-text: #1a1a1a;
          --color-text-muted: #52525b;
          --color-border: #e4e4e7;
          --color-primary: #869C84;
        }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 3rem; color: var(--color-text); line-height: 1.5; }
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
        .space-y-6 > * + * { margin-top: 1.5rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .border { border-width: 1px; }
        .border-border { border-color: var(--color-border); }
        .bg-surface { background-color: var(--color-surface); }
        .bg-primary\\/5 { background-color: rgba(134, 156, 132, 0.05) !important; }
        .bg-bg-secondary\\/30 { background-color: rgba(244, 244, 245, 0.3) !important; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .p-4 { padding: 1rem; }
        .p-3 { padding: 0.75rem; }
        .pb-4 { padding-bottom: 1rem; }
        .border-b { border-bottom-width: 1px; }
        .border-primary\\/10 { border-color: rgba(134, 156, 132, 0.1); }
        .border-primary\\/5 { border-color: rgba(134, 156, 132, 0.05); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .text-\\[11px\\] { font-size: 11px; }
        .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .border-l-2 { border-left-width: 2px; }
        .pl-2 { padding-left: 0.5rem; }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
          .bg-primary\\/5, .bg-primary\\/10, .bg-primary\\/20, .bg-bg-secondary\\/30, .bg-bg-secondary\\/40 { 
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
  setTimeout(() => {
    win.print()
    win.close()
  }, 200)
}

const queryClient = useQueryClient()

const handleDelete = async () => {
  if (!visit.value?.id) return
  if (!window.confirm('¿Deseas eliminar esta ficha médica? Esta acción no se puede deshacer.')) return
  try {
    await deleteCita(visit.value.id)
    await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    await queryClient.invalidateQueries({ queryKey: ['pets'], exact: false })
    close()
  } catch (err) {
    console.error('Error deleting ficha', err)
  }
}
</script>
