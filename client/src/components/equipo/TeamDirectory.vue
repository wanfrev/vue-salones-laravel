<template>
  <section class="mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:mb-6">
    <!-- Negocios de personal: activos / inactivos y búsqueda (como siempre, solo ahí) -->
    <div v-if="isStaffing" class="flex flex-col gap-3 border-b border-border-subtle px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div class="scroll-thin -mx-1 flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Estado del equipo">
        <button v-for="s in STATUS_CHIPS" :key="s.value" type="button" role="tab" :aria-selected="status === s.value" :class="chipClass(status === s.value)" @click="emit('update:status', s.value)">
          {{ s.label }}
        </button>
      </div>
      <div class="relative sm:w-72">
        <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          :value="search"
          type="text"
          :placeholder="`Buscar ${singular}...`"
          class="w-full rounded-xl border border-border bg-bg-secondary/40 py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Resto de negocios: cuántos cobran cada forma de pago (solo informativo, igual que las tarjetas de antes) -->
    <div v-else class="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2.5 sm:px-4" data-testid="pay-stats">
      <span v-for="s in payStats" :key="s.label" class="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary">
        {{ s.label }}
        <span class="rounded-full bg-surface px-1.5 text-[10px] font-bold tabular-nums text-text">{{ s.value }}</span>
      </span>
    </div>

    <!-- Lista -->
    <div v-if="employees.length === 0" class="px-4 py-14 text-center text-sm text-text-muted">{{ emptyText }}</div>

    <div v-else>
      <div :class="[gridClass, 'hidden border-b border-border-subtle bg-bg-secondary/30 px-4 py-2 lg:grid']">
        <span :class="headClass">{{ title }}</span>
        <span :class="headClass">{{ isStaffing ? 'Empresas' : 'Forma de pago' }}</span>
        <span />
      </div>

      <ul class="divide-y divide-border-subtle">
        <li
          v-for="member in employees"
          :key="member.id"
          data-testid="team-row"
          :class="[gridClass, 'relative px-4 py-3 transition-colors hover:bg-bg-secondary/40', member.active === false ? 'opacity-60' : '']"
        >
          <!-- Empleado (en móvil deja sitio a la derecha para los iconos de acción) -->
          <div class="flex min-w-0 items-center gap-3 pr-[7.25rem] lg:pr-0">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{{ getInitials(member.name) }}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-semibold text-text">{{ member.name }}</p>
                <button
                  v-if="isStaffing"
                  type="button"
                  class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-theme"
                  :class="member.active === false ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-success/10 text-success hover:bg-success/20'"
                  :title="member.active === false ? 'Activar empleado' : 'Desactivar empleado'"
                  @click="emit('toggleActive', member)"
                >{{ member.active === false ? 'Inactivo' : 'Activo' }}</button>
                <span v-else-if="member.active === false" class="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">Inactivo</span>
              </div>
              <p class="truncate text-xs text-text-muted">{{ [member.role, member.email].filter(Boolean).join(' · ') }}</p>
            </div>
          </div>

          <!-- Forma de pago / empresas -->
          <div class="mt-1.5 min-w-0 pl-12 lg:mt-0 lg:pl-0">
            <template v-if="isStaffing">
              <p v-if="!member.staffingAssignments?.length" class="text-xs text-text-muted">Sin empresa asignada</p>
              <div v-else class="flex flex-wrap gap-1">
                <span v-for="a in member.staffingAssignments" :key="a.companyId" class="inline-flex max-w-full items-center gap-1 rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] text-text-secondary">
                  <span class="truncate font-semibold text-text">{{ a.companyName || 'Empresa' }}</span>
                  <span class="shrink-0 text-primary">{{ a.role }}</span>
                </span>
              </div>
            </template>
            <template v-else>
              <!-- Una línea en móvil («Porcentaje · 50% por servicio»); dos en escritorio. -->
              <p class="truncate text-xs font-semibold text-text">{{ member.payTypeLabel }}<span class="font-normal text-text-muted lg:hidden"> · {{ member.payValueLabel }}</span></p>
              <p class="hidden truncate text-xs text-text-muted lg:block">{{ member.payValueLabel }}</p>
            </template>
          </div>

          <!-- Acciones: las mismas de siempre (agenda, ver, recibo, editar) -->
          <div class="absolute right-2 top-2 flex items-center lg:static lg:justify-end lg:gap-0.5">
            <button v-if="showAgenda" type="button" :class="iconButton" title="Ver Agenda" aria-label="Ver agenda" @click="emit('viewAgenda', member)"><CalendarIcon class="h-4 w-4" /></button>
            <button type="button" :class="iconButton" title="Ver información" aria-label="Ver información" @click="emit('viewInfo', member)"><EyeIcon class="h-4 w-4" /></button>
            <button type="button" :class="iconButton" title="Imprimir Recibo de Pago" aria-label="Imprimir recibo de pago" @click="emit('viewRecibo', member)"><PrinterIcon class="h-4 w-4" /></button>
            <button type="button" :class="iconButton" title="Editar Empleado" aria-label="Editar empleado" @click="emit('edit', member)"><PenIcon class="h-4 w-4" /></button>
          </div>
        </li>
      </ul>

      <!-- «Ver todos» / «Ver menos»: por defecto se muestran los primeros, como siempre -->
      <div v-if="hasMore" class="border-t border-border-subtle p-3 text-center">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition-theme hover:border-primary/30 hover:bg-primary/5"
          @click="emit('toggleShowAll')"
        >
          {{ showAll ? 'Ver menos' : 'Ver todos (' + totalCount + ')' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CalendarIcon, EyeIcon, MagnifierIcon, PenIcon, PrinterIcon } from '@solar-icons/vue/linear'
import { getInitials } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import type { Empleado } from '../../types/empleado'
import type { EmployeeActiveFilter } from '../../services/equipoService'

const props = defineProps<{
  /** Lo que se muestra: Equipo.vue ya aplicó la búsqueda y el «Ver todos». */
  employees: Empleado[]
  /** Con % · Sueldo base · Sueldo + %, con las mismas definiciones de siempre (se solapan). */
  stats: { percentage: number; salaryBase: number; mixed: number }
  search: string
  status: EmployeeActiveFilter
  isStaffing: boolean
  showAgenda: boolean
  hasMore: boolean
  showAll: boolean
  totalCount: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:status': [value: EmployeeActiveFilter]
  toggleShowAll: []
  edit: [member: Empleado]
  viewInfo: [member: Empleado]
  viewAgenda: [member: Empleado]
  viewRecibo: [member: Empleado]
  toggleActive: [member: Empleado]
}>()

const businessStore = useBusinessStore()
const title = computed(() => businessStore.terminology.employee || 'Empleado')
const singular = computed(() => (businessStore.terminology.employee || 'empleado').toLowerCase())
const plural = computed(() => (businessStore.terminology.employeePlural || `${singular.value}s`).toLowerCase())

const STATUS_CHIPS: { value: EmployeeActiveFilter; label: string }[] = [
  { value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }, { value: 'all', label: 'Todos' },
]

const payStats = computed(() => [
  { label: 'Con %', value: props.stats.percentage },
  { label: 'Sueldo base', value: props.stats.salaryBase },
  { label: 'Sueldo + %', value: props.stats.mixed },
])

// Mismo mensaje de siempre cuando una búsqueda no encuentra a nadie.
const emptyText = computed(() =>
  props.isStaffing && props.search.trim()
    ? `Ningún ${singular.value} coincide con "${props.search.trim()}".`
    : `Todavía no hay ${plural.value} registrados.`)

// Última columna de ancho fijo: las columnas quedan alineadas entre filas (cada fila es su propia rejilla).
const gridClass = 'lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_10rem] lg:items-center lg:gap-4'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
const iconButton = 'rounded-lg p-1.5 text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary lg:p-2'

const chipClass = (active: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    active ? 'bg-primary text-text-inverse shadow-sm' : 'bg-bg-secondary text-text-secondary hover:bg-primary/10 hover:text-primary'}`
</script>
