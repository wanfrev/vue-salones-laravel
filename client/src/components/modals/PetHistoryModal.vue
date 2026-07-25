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
                <div
                  v-for="visit in pet.visits"
                  :key="visit.id"
                  class="group border border-border hover:border-primary/50 rounded-lg p-4 bg-surface shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer page-break-inside-avoid relative"
                  @click="openVisitDetail(pet, visit)"
                >
                  <!-- Visit Header -->
                  <div class="flex justify-between items-start sm:items-center mb-4 pb-3 border-b border-border border-dashed flex-col sm:flex-row gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <h4 class="font-bold text-text text-base group-hover:text-primary transition-colors">{{ formatDate(visit.start_time) }}</h4>
                        <span
                          v-if="visit.status"
                          class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                          :class="{
                            'bg-success/15 text-success': visit.status === 'confirmed' || visit.status === 'paid' || visit.status === 'completed',
                            'bg-warning/15 text-warning': visit.status === 'pending' || visit.status === 'in_progress',
                            'bg-danger/15 text-danger': visit.status === 'cancelled' || visit.status === 'no_show'
                          }"
                        >
                          {{ getStatusLabel(visit.status) }}
                        </span>
                      </div>
                      <p class="text-sm text-text-muted mt-0.5 font-medium">{{ visit.services?.name || visit.service?.name || 'Servicio' }}</p>
                    </div>
                    <div class="text-left sm:text-right flex items-center gap-2">
                      <span class="text-xs font-bold px-2.5 py-1.5 bg-bg text-text-muted rounded-md border border-border inline-flex items-center gap-1.5">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Atendió: {{ visit.profiles?.full_name || visit.employee_profile?.full_name || '—' }}
                      </span>
                      <span class="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block">
                        Ver ficha →
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

                  <!-- Associated Products -->
                  <div v-if="getVisitProducts(visit).length > 0" class="mt-3 pt-3 border-t border-border/50 text-xs">
                    <span class="font-bold text-text-muted">Insumos/Productos: </span>
                    <span class="text-text font-medium">{{ getVisitProducts(visit).map(p => `${p.productName || p.name || 'Producto'} (x${p.quantity})`).join(', ') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal Secundario: Detalle Completo de una Historia Clínica -->
    <ModalBase
      :is-open="showDetailModal"
      :title="`Ficha Clínica — ${selectedPet?.name || 'Mascota'}`"
      :subtitle="selectedVisit ? `${formatDate(selectedVisit.start_time)} · ${selectedVisit.services?.name || selectedVisit.service?.name || 'Servicio'}` : ''"
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012"
      size="lg"
      @close="showDetailModal = false"
    >
      <div v-if="selectedVisit" class="space-y-6">
        <!-- Ficha Resumen de la Visita -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border bg-bg-secondary/30 p-4">
          <!-- Col 1: Mascota & Tutor -->
          <div class="space-y-1.5">
            <p class="text-xs font-bold uppercase tracking-wider text-primary">Información del Paciente & Tutor</p>
            <div class="text-sm">
              <span class="font-bold text-text">Tutor (Dueño):</span>
              <span class="text-text-muted ml-1">{{ clientName || '—' }}</span>
            </div>
            <div class="text-sm">
              <span class="font-bold text-text">Mascota:</span>
              <span class="text-text-muted ml-1">{{ selectedPet?.name }} ({{ selectedPet?.breed || 'Sin raza' }}<template v-if="selectedPet?.weight"> · {{ selectedPet?.weight }}</template>)</span>
            </div>
            <div v-if="selectedPet?.notes" class="text-xs text-text-muted italic bg-surface p-2 rounded border border-border mt-2">
              <span class="font-semibold text-text">Notas de la mascota:</span> {{ selectedPet.notes }}
            </div>
          </div>

          <!-- Col 2: Detalles de Atención -->
          <div class="space-y-1.5">
            <p class="text-xs font-bold uppercase tracking-wider text-primary">Detalles de la Cita</p>
            <div class="text-sm">
              <span class="font-bold text-text">Fecha y Hora:</span>
              <span class="text-text-muted ml-1">{{ formatDate(selectedVisit.start_time) }} {{ formatTime(selectedVisit.start_time) }}</span>
            </div>
            <div class="text-sm">
              <span class="font-bold text-text">Servicio:</span>
              <span class="text-text-muted ml-1">{{ selectedVisit.services?.name || selectedVisit.service?.name || '—' }}</span>
            </div>
            <div class="text-sm">
              <span class="font-bold text-text">Atendido por:</span>
              <span class="text-text-muted ml-1">{{ selectedVisit.profiles?.full_name || selectedVisit.employee_profile?.full_name || '—' }}</span>
            </div>
            <div v-if="selectedVisit.assistant_profile || selectedVisit.assistantProfile" class="text-sm">
              <span class="font-bold text-text">Asistente:</span>
              <span class="text-text-muted ml-1">{{ selectedVisit.assistant_profile?.full_name || selectedVisit.assistantProfile?.full_name }}</span>
            </div>
          </div>
        </div>

        <!-- Diagnóstico por Sistemas -->
        <div v-if="selectedVisit.clinical_history && Object.keys(selectedVisit.clinical_history).length > 0" class="space-y-3">
          <div class="flex items-center gap-2 border-b border-border pb-2">
            <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 002 2z" />
            </svg>
            <h3 class="font-bold text-text text-base">Diagnóstico por Sistemas Anatómicos</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="system in VET_SYSTEMS"
              :key="system.key"
              class="rounded-lg border p-3 transition-colors"
              :class="selectedVisit.clinical_history[system.key] ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-bg-secondary/10 opacity-60'"
            >
              <p class="text-xs font-bold uppercase tracking-wider" :class="selectedVisit.clinical_history[system.key] ? 'text-primary' : 'text-text-muted'">
                {{ system.label }}
              </p>
              <p class="text-sm mt-1 text-text">
                {{ selectedVisit.clinical_history[system.key] || 'Sin hallazgos / Normal' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Diagnóstico General Fallback -->
        <div v-else-if="selectedVisit.diagnosis" class="space-y-2">
          <h3 class="font-bold text-text text-sm uppercase tracking-wider text-primary">Diagnóstico General</h3>
          <div class="p-3 rounded-lg border border-border bg-surface text-sm text-text">
            {{ selectedVisit.diagnosis }}
          </div>
        </div>

        <!-- Tratamiento -->
        <div v-if="selectedVisit.treatment" class="space-y-2">
          <h3 class="font-bold text-text text-sm uppercase tracking-wider text-primary">Tratamiento Indicado / Realizado</h3>
          <div class="p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm text-text whitespace-pre-line">
            {{ selectedVisit.treatment }}
          </div>
        </div>

        <!-- Notas de Servicio & Internas -->
        <div v-if="selectedVisit.service_notes || selectedVisit.internal_notes || selectedVisit.notes" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-if="selectedVisit.service_notes || selectedVisit.notes" class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-wider text-text-muted">Notas del Servicio</p>
            <div class="p-3 rounded-lg border border-border bg-surface text-xs text-text-muted">
              {{ selectedVisit.service_notes || selectedVisit.notes }}
            </div>
          </div>
          <div v-if="selectedVisit.internal_notes" class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-wider text-text-muted">Notas Internas</p>
            <div class="p-3 rounded-lg border border-border bg-surface text-xs text-text-muted italic">
              {{ selectedVisit.internal_notes }}
            </div>
          </div>
        </div>

        <!-- Insumos / Productos Asociados -->
        <div v-if="getVisitProducts(selectedVisit).length > 0" class="space-y-2">
          <p class="text-xs font-bold uppercase tracking-wider text-primary">Productos / Insumos Utilizados</p>
          <div class="rounded-lg border border-border overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-bg-secondary border-b border-border font-semibold text-text-muted">
                <tr>
                  <th class="p-2.5">Producto</th>
                  <th class="p-2.5 text-center">Cantidad</th>
                  <th class="p-2.5 text-right">Precio Unit.</th>
                  <th class="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="(p, pidx) in getVisitProducts(selectedVisit)" :key="pidx">
                  <td class="p-2.5 font-medium text-text">{{ p.productName || p.name || 'Producto' }}</td>
                  <td class="p-2.5 text-center font-bold text-text">{{ p.quantity }}</td>
                  <td class="p-2.5 text-right text-text-muted">${{ Number(p.unitPrice || p.price || 0).toFixed(2) }}</td>
                  <td class="p-2.5 text-right font-bold text-text">${{ (Number(p.unitPrice || p.price || 0) * Number(p.quantity || 1)).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Acciones en el footer del Modal Secundario -->
        <div class="flex items-center justify-between border-t border-border pt-4 mt-6">
          <button
            type="button"
            @click="editVisitAppointment(selectedVisit)"
            class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-bg-secondary transition-colors"
          >
            <svg class="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Editar Cita
          </button>
          <div class="flex gap-2">
            <button
              type="button"
              @click="printSingleVisit(selectedPet, selectedVisit)"
              class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-text-inverse shadow-sm hover:bg-primary-hover transition-colors"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Ficha
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ModalBase from '../common/ModalBase.vue'
import { listPetsByClient } from '../../services/petService'
import { apiRequest } from '../../lib/api'
import { getInitials } from '../../lib/formatters'
import { useModal } from '../../composables/common/useModal'
import type { Pet } from '../../types/database'

const MODAL_ID = 'pet-history-modal'

const VET_SYSTEMS = [
  { key: 'Oftálmico', label: 'Sistema Oftálmico / Ojos' },
  { key: 'Otológico', label: 'Sistema Otológico / Oídos' },
  { key: 'Tegumentario', label: 'Sistema Tegumentario / Piel y Anexos' },
  { key: 'Músculo-Esquelético', label: 'Sistema Músculo-Esquelético' },
  { key: 'Respiratorio', label: 'Sistema Respiratorio' },
  { key: 'Cardiovascular', label: 'Sistema Cardiovascular' },
  { key: 'Gastrointestinal', label: 'Sistema Gastrointestinal / Digestivo' },
  { key: 'Genitourinario', label: 'Sistema Genitourinario' },
  { key: 'Nervioso', label: 'Sistema Nervioso / Neurológico' },
  { key: 'Linfático', label: 'Sistema Linfático / Inmunológico' },
  { key: 'Otros', label: 'Otros Diagnósticos' },
]

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

// Modal Secundario de Detalle
const showDetailModal = ref(false)
const selectedPet = ref<Pet | null>(null)
const selectedVisit = ref<any | null>(null)

const openVisitDetail = (pet: Pet, visit: any) => {
  selectedPet.value = pet
  selectedVisit.value = visit
  showDetailModal.value = true
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

const formatTime = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const getVisitProducts = (visit: any): any[] => {
  if (!visit) return []
  if (Array.isArray(visit.associated_products)) return visit.associated_products
  if (Array.isArray(visit.associatedProducts)) return visit.associatedProducts
  return []
}

const editVisitAppointment = (visit: any) => {
  showDetailModal.value = false
  close()
  useModal('cita-form-modal').open({ cita: visit })
}

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

const printSingleVisit = (pet: Pet | null, visit: any) => {
  if (!pet || !visit) return
  const win = window.open('', '_blank', 'width=850,height=900')
  if (!win) return

  const systemsHtml = (visit.clinical_history && Object.keys(visit.clinical_history).length > 0)
    ? VET_SYSTEMS.map(sys => {
        const val = visit.clinical_history[sys.key]
        if (!val) return ''
        return `<div style="margin-bottom: 8px; font-size: 13px;">
                  <strong style="color: #27272a;">${sys.label}:</strong>
                  <span style="color: #52525b; margin-left: 4px;">${val}</span>
                </div>`
      }).join('')
    : (visit.diagnosis ? `<p style="font-size: 13px; color: #3f3f46;">${visit.diagnosis}</p>` : '<p style="font-size: 13px; color: #a1a1aa;">Sin diagnóstico registrado</p>')

  const products = getVisitProducts(visit)
  const productsHtml = products.length > 0
    ? `<table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:12px;">
        <thead>
          <tr style="background:#f4f4f5; text-align:left;">
            <th style="padding:6px; border:1px solid #e4e4e7;">Producto</th>
            <th style="padding:6px; border:1px solid #e4e4e7; text-align:center;">Cant.</th>
            <th style="padding:6px; border:1px solid #e4e4e7; text-align:right;">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td style="padding:6px; border:1px solid #e4e4e7;">${p.productName || p.name || 'Producto'}</td>
              <td style="padding:6px; border:1px solid #e4e4e7; text-align:center;">${p.quantity}</td>
              <td style="padding:6px; border:1px solid #e4e4e7; text-align:right;">$${Number(p.unitPrice || p.price || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : ''

  win.document.write(`
    <html>
    <head>
      <title>Ficha Clínica - ${pet.name} (${formatDate(visit.start_time)})</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2.5rem; color: #18181b; line-height: 1.5; }
        .header { border-bottom: 2px solid #869C84; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .title { font-size: 20px; font-weight: bold; color: #869C84; margin: 0; }
        .subtitle { font-size: 14px; color: #71717a; margin-top: 4px; }
        .section { margin-bottom: 1.5rem; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 1rem; }
        .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #869C84; margin-bottom: 8px; border-left: 3px solid #869C84; padding-left: 6px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media print { body { padding: 1rem; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">INFORME DE HISTORIA CLÍNICA VETERINARIA</h1>
        <p class="subtitle">Fecha de Visita: ${formatDate(visit.start_time)} ${formatTime(visit.start_time)}</p>
      </div>

      <div class="section">
        <div class="grid">
          <div>
            <strong>Tutor (Propietario):</strong> ${props.clientName || '—'}<br>
            <strong>Paciente (Mascota):</strong> ${pet.name}<br>
            <strong>Raza / Especie:</strong> ${pet.breed || 'Sin raza'}<br>
            <strong>Peso:</strong> ${pet.weight || '—'}
          </div>
          <div>
            <strong>Servicio:</strong> ${visit.services?.name || visit.service?.name || '—'}<br>
            <strong>Atendido por:</strong> ${visit.profiles?.full_name || visit.employee_profile?.full_name || '—'}<br>
            ${visit.assistant_profile ? `<strong>Asistente:</strong> ${visit.assistant_profile.full_name}<br>` : ''}
            <strong>Estado:</strong> ${getStatusLabel(visit.status)}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DIAGNÓSTICO POR SISTEMAS</div>
        ${systemsHtml}
      </div>

      ${visit.treatment ? `
        <div class="section">
          <div class="section-title">TRATAMIENTO INDICADO</div>
          <p style="font-size:13px; color:#27272a; margin:0; whitespace:pre-line;">${visit.treatment}</p>
        </div>
      ` : ''}

      ${(visit.service_notes || visit.internal_notes) ? `
        <div class="section">
          <div class="section-title">NOTAS Y OBSERVACIONES</div>
          <p style="font-size:13px; color:#52525b; margin:0; font-style:italic;">${visit.service_notes || visit.internal_notes}</p>
        </div>
      ` : ''}

      ${productsHtml ? `
        <div class="section">
          <div class="section-title">PRODUCTOS / INSUMOS APLICADOS</div>
          ${productsHtml}
        </div>
      ` : ''}
    </body>
    </html>
  `)

  win.document.close()
  win.focus()
  win.print()
  win.close()
}
</script>
