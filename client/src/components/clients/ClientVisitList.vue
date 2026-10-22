<template>
  <section class="rounded-xl border border-border bg-surface p-4 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Historial de visitas</p>
        <h3 class="mt-1 text-base font-semibold text-text">{{ title }}</h3>
      </div>

      <div class="grid grid-cols-2 items-end gap-2 sm:flex">
        <label class="block min-w-0">
          <span class="mb-1 block text-[11px] font-semibold text-text-muted">Desde</span>
          <input v-model="localFrom" type="date" :max="localTo || undefined" :class="dateInputClass" @change="emitRange" />
        </label>
        <label class="block min-w-0">
          <span class="mb-1 block text-[11px] font-semibold text-text-muted">Hasta</span>
          <input v-model="localTo" type="date" :min="localFrom || undefined" :class="dateInputClass" @change="emitRange" />
        </label>
        <button v-if="localFrom || localTo" type="button"
          class="col-span-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:col-span-1"
          @click="clearRange">
          Limpiar fechas
        </button>
      </div>
    </div>

    <p v-if="rangeInvalid" class="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
      La fecha «Desde» no puede ser posterior a «Hasta».
    </p>

    <Transition name="page-fade" mode="out-in">
      <div v-if="isLoading" key="loading" class="space-y-3" aria-busy="true">
        <div v-for="n in 3" :key="n" class="animate-pulse rounded-xl border border-border-subtle p-4">
          <div class="mb-3 h-3 w-1/3 rounded bg-bg-secondary" />
          <div class="mb-2 h-3 w-3/4 rounded bg-bg-secondary" />
          <div class="h-3 w-1/2 rounded bg-bg-secondary" />
        </div>
      </div>

      <div v-else-if="isError" key="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-6 text-center">
        <p class="text-sm font-semibold text-danger">No se pudo cargar el historial.</p>
        <p class="mt-1 text-xs text-text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" class="mt-3 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-secondary" @click="emit('retry')">
          Reintentar
        </button>
      </div>

      <div v-else-if="visits.length === 0" key="empty" class="py-10 text-center text-sm text-text-muted">
        {{ localFrom || localTo ? 'No hay visitas en ese rango de fechas.' : emptyText }}
      </div>

      <ul v-else key="list" class="space-y-3">
        <li v-for="visit in visits" :key="visit.id"
          v-memo="[visit.id, visit.date, visit.state, visit.amount, visit.payment_status]"
          class="rounded-xl border border-border-subtle p-4 transition-colors hover:border-border">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-text">
                {{ formatDate(visit.date) }}
                <span class="font-normal text-text-muted">· {{ formatTime(visit.date) }}</span>
              </p>
              <div class="mt-1.5 flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" :class="visitStateClass(visit)">{{ visitStateLabel(visit) }}</span>
                <span v-if="!isInactiveVisit(visit) && visit.kind === 'appointment'" class="text-[11px] font-semibold" :class="paymentStatusClass(visit.payment_status)">
                  {{ paymentStatusLabel(visit.payment_status) }}
                </span>
              </div>
            </div>
            <p v-if="!isInactiveVisit(visit)" class="text-base font-bold tabular-nums text-text">{{ formatUsd(visit.amount) }}</p>
          </div>

          <ul v-if="visit.services.length" class="mt-3 space-y-1">
            <li v-for="(service, i) in visit.services" :key="i" class="flex items-baseline justify-between gap-3 text-sm">
              <span class="min-w-0 text-text">
                <span class="font-medium">{{ service.name }}</span>
                <span v-if="formatStaff(service)" class="text-text-muted"> · {{ formatStaff(service) }}</span>
              </span>
              <span v-if="!isInactiveVisit(visit)" class="shrink-0 tabular-nums text-text-secondary">{{ formatUsd(service.price) }}</span>
            </li>
          </ul>

          <p v-if="visit.products.length" class="mt-2 text-xs text-text-secondary">
            <span class="font-semibold text-text-muted">Productos:</span>
            {{ visit.products.map(formatProductLine).join(', ') }}
          </p>

          <p v-if="visit.payments.length" class="mt-1 text-xs text-text-secondary">
            <span class="font-semibold text-text-muted">Pagó:</span>
            {{ visit.payments.map(formatPaymentLine).join(' · ') }}
          </p>

          <p v-if="visit.notes" class="mt-2 whitespace-pre-line rounded-lg bg-bg-secondary/60 px-3 py-2 text-xs text-text-secondary">{{ visit.notes }}</p>
          <p v-if="visit.internal_notes" class="mt-2 whitespace-pre-line rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-text-secondary">
            <span class="font-semibold text-warning">Nota interna:</span> {{ visit.internal_notes }}
          </p>
        </li>
      </ul>
    </Transition>

    <div v-if="hasMore && !isLoading && !isError" class="mt-4 text-center">
      <button type="button" :disabled="isLoadingMore"
        class="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-50"
        @click="emit('loadMore')">
        {{ isLoadingMore ? 'Cargando…' : 'Ver más visitas' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatDate, formatTime } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import type { ClientVisit } from '../../types/clientVisits'
import {
  formatPaymentLine, formatProductLine, formatStaff, formatUsd, isInactiveVisit,
  paymentStatusClass, paymentStatusLabel, visitStateClass, visitStateLabel,
} from './visitFormat'

const props = defineProps<{
  visits: ClientVisit[]
  isLoading: boolean
  isError: boolean
  hasMore: boolean
  isLoadingMore: boolean
  from: string
  to: string
  rangeInvalid: boolean
}>()

const emit = defineEmits<{
  loadMore: []
  retry: []
  'update:range': [from: string, to: string]
}>()

const businessStore = useBusinessStore()
const dateInputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10'

// Estado local de los filtros: no se muta nada del padre, solo se emite el rango elegido.
const localFrom = ref(props.from)
const localTo = ref(props.to)
watch(() => [props.from, props.to] as const, ([f, t]) => { localFrom.value = f; localTo.value = t })

const emitRange = () => emit('update:range', localFrom.value, localTo.value)
const clearRange = () => {
  localFrom.value = ''
  localTo.value = ''
  emitRange()
}

const title = computed(() => {
  const t = businessStore.terminology
  return `${t.servicePlural || 'Servicios'} y ${(t.appointmentPlural || 'citas').toLowerCase()}`
})
const emptyText = computed(() => {
  const client = (businessStore.terminology.client || 'cliente').toLowerCase()
  return `Este ${client} todavía no tiene visitas registradas.`
})
</script>
