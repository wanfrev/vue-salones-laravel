<template>
  <div data-testid="service-history">
    <!-- Filtros: período, orden y, si la búsqueda coincide con varios servicios, cuál de ellos -->
    <div class="flex flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2.5 sm:px-4">
      <label class="sr-only" for="sh-range">Período</label>
      <select id="sh-range" v-model="preset" data-testid="range-select"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text outline-none focus:border-primary">
        <option v-for="p in RANGE_PRESETS" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <label class="sr-only" for="sh-sort">Ordenar por</label>
      <select id="sh-sort" v-model="sort" data-testid="sort-select"
        class="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text outline-none focus:border-primary">
        <option v-for="o in SERVICE_SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <span v-if="isFetching && !isLoading" class="text-xs text-text-muted" role="status">Actualizando…</span>
    </div>

    <!-- Las opciones salen de la búsqueda sin acotar; «Todos» siempre permite volver -->
    <div v-if="services.length > 1 || serviceId" class="scroll-thin flex gap-1.5 overflow-x-auto border-b border-border-subtle px-3 py-2 sm:px-4" data-testid="service-chips">
      <button type="button" class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        :class="!serviceId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-bg-secondary'"
        @click="serviceId = null">Todos</button>
      <button v-for="s in services" :key="s.service_id" type="button" data-testid="service-chip"
        class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        :class="serviceId === s.service_id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-bg-secondary'"
        @click="serviceId = s.service_id">{{ s.name }} <span class="text-text-muted">· {{ s.visits }}</span></button>
    </div>

    <div v-if="isLoading" class="divide-y divide-border-subtle" aria-busy="true">
      <div v-for="i in 4" :key="i" class="flex items-center gap-4 px-4 py-4">
        <div class="h-3 w-40 animate-pulse rounded bg-bg-secondary" /><div class="h-3 w-16 animate-pulse rounded bg-bg-secondary" />
      </div>
    </div>

    <div v-else-if="error" class="px-4 py-10 text-center" role="alert">
      <p class="text-sm font-medium text-danger">No se pudo cargar el historial.</p>
      <button type="button" class="mt-2 text-xs font-semibold text-primary hover:text-primary-hover" @click="refetch()">Reintentar</button>
    </div>

    <div v-else-if="!clients.length" class="px-4 py-14 text-center" data-testid="history-empty">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary"><StarIcon class="h-7 w-7 text-text-muted" /></div>
      <h3 class="mt-3 text-base font-medium text-text">Sin servicios realizados</h3>
      <p class="mt-1 text-sm text-text-muted">{{ filters.q ? `No se hizo «${filters.q}» en este período.` : 'No hay servicios realizados en este período.' }}</p>
      <p class="mt-1 text-xs text-text-muted">Solo cuentan los servicios ya realizados (completados o pagados). Prueba con otro nombre o un período más largo.</p>
    </div>

    <template v-else>
      <p class="px-4 py-2.5 text-xs text-text-secondary" data-testid="history-summary">
        <b class="text-text">{{ summary!.clients }}</b> {{ summary!.clients === 1 ? 'cliente' : 'clientes' }} ·
        <b class="text-text">{{ summary!.visits }}</b> {{ summary!.visits === 1 ? 'visita' : 'visitas' }}
        <template v-if="summary!.first_at"> · desde el <b class="text-text">{{ formatDate(summary!.first_at) }}</b></template>
        <template v-if="summary!.anonymous_visits"> · {{ summary!.anonymous_visits }} sin cliente registrado</template>
      </p>

      <div :class="[gridClass, 'hidden border-y border-border-subtle bg-bg-secondary/30 px-4 py-2 md:grid']">
        <span :class="headClass">Cliente</span>
        <span :class="[headClass, 'text-right']">Veces</span>
        <span :class="headClass">Primera vez</span>
        <span :class="headClass">Última vez</span>
      </div>

      <ul class="divide-y divide-border-subtle">
        <li v-for="c in clients" :key="buyerKey(c.client_id)" data-testid="client-row">
          <button type="button" :aria-expanded="expanded === buyerKey(c.client_id)"
            :class="[gridClass, 'w-full px-4 py-3 text-left text-sm transition-colors hover:bg-bg-secondary/40']"
            @click="toggle(c.client_id)">
            <span class="min-w-0">
              <span class="block truncate font-medium" :class="c.client_name ? 'text-text' : 'italic text-text-muted'">{{ c.client_name ?? 'Sin cliente registrado' }}</span>
              <span v-if="c.client_phone" class="block text-xs text-text-muted">{{ c.client_phone }}</span>
            </span>
            <!-- En el celular los datos van en renglones que se acomodan; en pantallas grandes cada uno es su columna -->
            <span class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-secondary md:contents">
              <span class="md:text-right md:text-sm md:text-text"><span class="md:hidden">Se lo hizo </span>{{ visitsLabel(c.visits) }}</span>
              <span class="md:text-sm"><span class="md:hidden">Primera: </span>{{ c.first_at ? formatDate(c.first_at) : '—' }}</span>
              <span class="md:text-sm"><span class="md:hidden">Última: </span>{{ c.last_at ? formatDate(c.last_at) : '—' }}</span>
            </span>
          </button>
          <ServiceHistoryClientDetail v-if="expanded === buyerKey(c.client_id)" :client-key="buyerKey(c.client_id)" :filters="filters" />
        </li>
      </ul>

      <div v-if="page > 1 || hasMore" class="flex items-center justify-between border-t border-border-subtle px-4 py-2.5 text-xs">
        <button type="button" data-testid="page-prev" :disabled="page <= 1"
          class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary hover:bg-bg-secondary disabled:opacity-40" @click="goTo(page - 1)">Anterior</button>
        <span class="text-text-muted">Página {{ page }}</span>
        <button type="button" data-testid="page-next" :disabled="!hasMore"
          class="rounded-lg border border-border px-3 py-1.5 font-semibold text-text-secondary hover:bg-bg-secondary disabled:opacity-40" @click="goTo(page + 1)">Siguiente</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { StarIcon } from '@solar-icons/vue/linear'
import { formatDate } from '../../lib/formatters'
import { useServiceHistory } from '../../composables/services/useServiceHistory'
import ServiceHistoryClientDetail from './ServiceHistoryClientDetail.vue'
import { RANGE_PRESETS, buyerKey } from '../productos/productSalesHistory'
import { SERVICE_SORT_OPTIONS, visitsLabel } from './serviceHistory'

const props = withDefaults(defineProps<{
  /** Lo que se escribe en el buscador de la pantalla (nombre del servicio o su categoría). */
  search: string
  /** Solo pide datos mientras la pestaña está a la vista. */
  active?: boolean
}>(), { active: true })

const { preset, sort, serviceId, page, filters, data, isLoading, isFetching, error, refetch } =
  useServiceHistory(toRef(props, 'search'), toRef(props, 'active'))

const summary = computed(() => data.value?.summary)
const clients = computed(() => data.value?.clients ?? [])
const services = computed(() => data.value?.services ?? [])
const hasMore = computed(() => !!data.value?.has_more)

// Una sola fila abierta a la vez; al cambiar de búsqueda, rango o página se cierra.
const expanded = ref<string | null>(null)
const toggle = (clientId: string | null) => {
  const key = buyerKey(clientId)
  expanded.value = expanded.value === key ? null : key
}
watch([filters, sort, page], () => { expanded.value = null })

const goTo = (n: number) => { page.value = Math.max(1, n) }

// Cliente · Veces · Primera vez · Última vez (la primera columna toma el sobrante).
const gridClass = 'md:grid md:grid-cols-[minmax(0,1.6fr)_6rem_7rem_7rem] md:items-center md:gap-3'
const headClass = 'text-[11px] font-bold uppercase tracking-wider text-text-muted'
</script>
