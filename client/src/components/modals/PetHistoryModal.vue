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
      <!-- Print button -->
      <div class="flex justify-end">
        <button @click="printHistory" class="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-bg-secondary transition-colors">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
      </div>

      <div ref="printArea" class="print-area space-y-6">
        <template v-for="pet in petsWithHistory" :key="pet.id">
          <div class="rounded-xl border border-border bg-surface overflow-hidden">
            <!-- Pet header -->
            <div class="bg-bg-secondary/50 px-4 py-3 border-b border-border">
              <div class="flex items-center gap-2">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {{ getInitials(pet.name) }}
                </div>
                <div>
                  <p class="font-semibold text-text">{{ pet.name }}</p>
                  <p class="text-xs text-text-muted">
                    {{ pet.breed || 'Sin raza' }} <template v-if="pet.weight"> · {{ pet.weight }}</template>
                  </p>
                </div>
                <span class="ml-auto text-xs text-text-muted">{{ pet.visits.length }} visita(s)</span>
              </div>
            </div>

            <!-- Visits table -->
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border bg-bg-secondary/30">
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Fecha</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Servicio</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Atendió</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Diagnóstico</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Tratamiento</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Notas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="visit in pet.visits" :key="visit.id" class="text-sm hover:bg-bg-secondary/30 transition-colors">
                    <td class="px-4 py-2.5 text-text whitespace-nowrap">{{ formatDate(visit.start_time) }}</td>
                    <td class="px-4 py-2.5">
                      <span class="font-medium text-text">{{ visit.services?.name || visit.service?.name || 'Servicio' }}</span>
                    </td>
                    <td class="px-4 py-2.5 text-text">
                      {{ visit.profiles?.full_name || visit.employee_profile?.full_name || '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-text text-xs max-w-48">{{ visit.diagnosis || '—' }}</td>
                    <td class="px-4 py-2.5 text-text text-xs max-w-48">{{ visit.treatment || '—' }}</td>
                    <td class="px-4 py-2.5 text-text-muted text-xs max-w-40">{{ visit.internal_notes || visit.service_notes || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
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
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
        th { font-size: 0.75rem; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
        .font-semibold { font-weight: 600; }
        .text-xs { font-size: 0.75rem; }
        .max-w-48 { max-width: 12rem; }
        .max-w-40 { max-width: 10rem; }
        @media print { body { padding: 1rem; } }
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
