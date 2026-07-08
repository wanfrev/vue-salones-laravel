<template>
  <div>
    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
        <div class="h-3 w-24 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-16 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-3 w-20 animate-pulse rounded bg-bg-secondary"></div>
        <div class="h-6 w-20 animate-pulse rounded-full bg-bg-secondary"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="citas.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
        <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="mt-4 text-lg font-medium text-text">No hay {{ t || 'cita' }}s</h3>
      <p class="mt-1 text-sm text-text-muted">No se encontraron {{ t || 'cita' }}s para mostrar.</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Desktop Table -->
      <div class="hidden overflow-hidden rounded-xl border border-border bg-surface sm:block">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-bg-secondary/50">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Cliente</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">Fecha
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">Hora
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Servicio</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Empleado</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">Estado
              </th>
              <th class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="cita in citas" :key="cita.id" class="group transition-theme hover:bg-bg-secondary/30">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {{ getInitials(cita.clientName) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-text truncate">{{ cita.clientName }}</p>
                    <p v-if="cita.notes" class="text-xs text-text-muted truncate max-w-[160px]">{{ cita.notes }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm font-medium text-text">{{ formatDateLabel(cita.date) }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm font-medium tabular-nums text-text">{{ formatTime24to12(cita.time) }}</span>
                <span class="ml-1.5 text-xs text-text-muted">{{ cita.duration }}min</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-text-secondary">{{ cita.service }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-text-secondary">{{ cita.employee }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', getStatusColor(cita.status)]">
                  <span class="h-1.5 w-1.5 rounded-full currentColor opacity-70"></span>
                  {{ cita.statusLabel }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button @click="$emit('edit', cita)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                    title="Editar">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button @click="$emit('delete', cita.id)"
                    class="rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-danger"
                    title="Eliminar">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="divide-y divide-border rounded-xl border border-border bg-surface sm:hidden">
        <div v-for="cita in citas" :key="cita.id"
          class="p-4 transition-theme first:rounded-t-xl last:rounded-b-xl hover:bg-bg-secondary/30">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {{ getInitials(cita.clientName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-text truncate">{{ cita.clientName }}</p>
                <p class="text-xs text-text-muted">{{ cita.service }}</p>
                <p v-if="cita.employee" class="text-xs text-text-muted">{{ cita.employee }}</p>
                <p class="text-xs text-text-muted font-medium mt-0.5">{{ formatDateLabel(cita.date) }}</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold tabular-nums text-text">{{ formatTime24to12(cita.time) }}</p>
              <p class="text-xs text-text-muted">{{ cita.duration }}min</p>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span
              :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', getStatusColor(cita.status)]">
              <span class="h-1.5 w-1.5 rounded-full currentColor opacity-70"></span>
              {{ cita.statusLabel }}
            </span>
            <div class="flex gap-1">
              <button @click="$emit('edit', cita)"
                class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
                title="Editar">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button @click="$emit('delete', cita.id)"
                class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-danger"
                title="Eliminar">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="cita.notes" class="mt-2 border-t border-border-subtle pt-2">
            <p class="text-xs text-text-muted truncate">{{ cita.notes }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { getInitials, getStatusColor, formatTime24to12 } from '../../lib/formatters'
import type { Cita } from '../../types/cita'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]} ${dd}/${mm}`
}

defineProps<{
  citas: Cita[]
  loading?: boolean
  t?: string
}>()

defineEmits<{
  edit: [cita: Cita]
  delete: [id: string]
}>()
</script>
