<template>
  <div v-if="clients.length === 0" class="px-4 py-16 text-center text-sm text-text-muted">{{ emptyText }}</div>

  <div v-else :style="{ '--actions-w': clinicalActions ? '17.5rem' : '8.5rem' }">
    <!-- Encabezado de columnas (solo escritorio). La rejilla es la misma que la de las filas. -->
    <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
      <span :class="headClass">{{ terminology.client || 'Cliente' }}</span>
      <span :class="headClass">Contacto</span>
      <span :class="headClass">Última visita</span>
      <span :class="headClass">{{ thirdColumn === 'identity' ? 'Identificación' : 'Gasto' }}</span>
      <span />
    </div>

    <ul class="divide-y divide-border-subtle">
      <li
        v-for="client in clients"
        :key="client.id"
        v-memo="[client.id, client.name, client.phone, client.email, client.lastVisit, client.totalAppointments, client.totalSpent, canEdit, hidePhone, clinicalActions, hasAttachments]"
        data-testid="client-row"
        tabindex="0"
        :class="[gridClass, 'group relative cursor-pointer px-4 py-3 outline-none transition-colors hover:bg-primary/5 focus-visible:bg-primary/5']"
        @click="emit('open', client)"
        @keydown.enter.self="emit('open', client)"
      >
        <!-- Cliente. En móvil, deja sitio a la derecha para los iconos de acción (si no hay botones de texto). -->
        <div :class="['flex min-w-0 items-center gap-3 lg:pr-0', clinicalActions ? '' : 'pr-[4.75rem]']">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {{ getInitials(client.name) }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-text">{{ client.name }}</p>
            <p class="text-xs leading-snug text-text-muted lg:truncate">
              <span class="hidden lg:inline">Desde {{ client.joinDate ? formatDateHuman(client.joinDate) : '—' }}</span>
              <span class="lg:hidden">{{ metaLine(client) }}</span>
            </p>
          </div>
        </div>

        <!-- Contacto -->
        <div class="hidden min-w-0 lg:block">
          <p v-if="hidePhone" class="text-xs italic text-text-muted">Oculto</p>
          <template v-else>
            <p class="truncate text-xs font-medium text-text-secondary">{{ client.phone || 'Sin teléfono' }}</p>
            <p v-if="client.email" class="truncate text-xs text-text-muted">{{ client.email }}</p>
          </template>
        </div>

        <!-- Última visita -->
        <div class="hidden min-w-0 lg:block">
          <template v-if="visitDay(client)">
            <p class="text-xs font-medium text-text-secondary">{{ formatDateHuman(visitDay(client)!) }}</p>
            <p class="truncate text-xs text-text-muted">{{ relativeVisit(visitDay(client)) }} · {{ client.totalAppointments || 0 }} {{ visitsLabel(client) }}</p>
          </template>
          <p v-else class="text-xs text-text-muted">Sin {{ visitsPlural }}</p>
        </div>

        <!-- Gasto / identificación -->
        <div class="hidden min-w-0 lg:block">
          <template v-if="thirdColumn === 'identity'">
            <p class="truncate text-xs font-medium text-text-secondary">{{ client.documentId || client.code || 'Sin documento' }}</p>
            <p v-if="client.medicalInsurance" class="truncate text-xs text-text-muted">{{ client.medicalInsurance }}</p>
          </template>
          <p v-else class="text-sm font-medium tabular-nums text-text">${{ client.totalSpent || 0 }}</p>
        </div>

        <!-- Acciones: en móvil, iconos arriba a la derecha (o, con botones de texto, en su propia línea
             bajo los datos); en escritorio, última columna. -->
        <div
          :class="[
            'flex flex-wrap items-center gap-1.5 lg:static lg:mt-0 lg:justify-end lg:pl-0',
            clinicalActions ? 'mt-2 pl-12' : 'absolute right-2 top-2',
          ]"
        >
          <template v-if="clinicalActions">
            <button
              type="button"
              class="whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/15"
              title="Abrir el expediente y la historia clínica"
              @click.stop="emit('clinical', client, 'historia')"
            >Expediente</button>
            <button
              v-if="hasAttachments"
              type="button"
              class="whitespace-nowrap rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary transition-theme hover:bg-primary/5"
              title="Ver y subir archivos del paciente"
              @click.stop="emit('clinical', client, 'adjuntos')"
            >Archivos</button>
          </template>
          <button
            v-if="!hidePhone && client.phone"
            type="button"
            class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-success"
            title="Escribir por WhatsApp"
            aria-label="Escribir por WhatsApp"
            @click.stop="emit('whatsapp', client)"
          >
            <ChatRoundLineIcon class="h-4 w-4" />
          </button>
          <button
            v-if="canEdit"
            type="button"
            class="rounded-lg p-2 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
            :title="`Editar ${singular}`"
            :aria-label="`Editar ${singular}`"
            @click.stop="emit('edit', client)"
          >
            <PenIcon class="h-4 w-4" />
          </button>
          <ArrowRightIcon class="ml-1 hidden h-4 w-4 text-text-muted transition-colors group-hover:text-primary lg:block" aria-hidden="true" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatRoundLineIcon, PenIcon, ArrowRightIcon } from '@solar-icons/vue/linear'
import { formatDateHuman, getInitials } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import type { Cliente } from '../../types/cliente'
import { relativeVisit, visitDay } from './clientFilters'

const props = withDefaults(defineProps<{
  clients: Cliente[]
  /** 'spend' = columna Gasto · 'identity' = documento y seguro (nichos de paciente). */
  thirdColumn?: 'spend' | 'identity'
  canEdit?: boolean
  hidePhone?: boolean
  /** Botones «Expediente» y «Archivos» (psicología, con permiso de expediente). */
  clinicalActions?: boolean
  hasAttachments?: boolean
  emptyText: string
}>(), { thirdColumn: 'spend', canEdit: false, hidePhone: false, clinicalActions: false, hasAttachments: false })

const emit = defineEmits<{
  open: [client: Cliente]
  edit: [client: Cliente]
  whatsapp: [client: Cliente]
  clinical: [client: Cliente, tab: 'historia' | 'adjuntos']
}>()

const businessStore = useBusinessStore()
const terminology = computed(() => businessStore.terminology)
const singular = computed(() => (terminology.value.client || 'cliente').toLowerCase())
const visitsPlural = computed(() => (terminology.value.appointmentPlural || 'citas').toLowerCase())

// Columnas: cliente · contacto · última visita · gasto/identificación · acciones.
// Cada fila es su propia rejilla: la última columna lleva un ancho FIJO (no `auto`) para que las
// columnas queden alineadas entre filas aunque una no tenga, por ejemplo, el botón de WhatsApp.
const gridClass = 'lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.5fr)_minmax(0,1fr)_var(--actions-w)] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'

const visitsLabel = (client: Cliente) => {
  const n = client.totalAppointments || 0
  const plural = visitsPlural.value
  // «1 citas» suena mal: la forma singular solo se usa cuando termina en «s» (citas → cita).
  return n === 1 && plural.endsWith('s') ? plural.slice(0, -1) : plural
}

/** Línea de datos de la fila en móvil: teléfono · visitas · última visita. */
const metaLine = (client: Cliente) => {
  const parts: string[] = []
  if (!props.hidePhone) parts.push(client.phone || 'Sin teléfono')
  parts.push(`${client.totalAppointments || 0} ${visitsLabel(client)}`)
  const last = visitDay(client)
  parts.push(last ? `Última ${relativeVisit(last)}` : `Sin ${visitsPlural.value}`)
  return parts.join(' · ')
}
</script>
