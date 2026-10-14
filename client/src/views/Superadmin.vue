<template>
  <SuperadminLayout>
    <div class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold text-text">Negocios</h1>
          <p class="mt-0.5 max-w-2xl text-xs text-text-muted">
            Todos los negocios de la plataforma. Entra a uno para ajustar sus funciones, ver su equipo o suspenderlo.
          </p>
        </div>
        <button type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-[0.98]"
          @click="showNewModal = true">
          <AddCircleIcon class="h-4 w-4" />
          Nuevo negocio
        </button>
      </div>

      <BusinessStatsBar v-model:status="status" v-model:niche="niche" :counts="counts" :niches="nicheCounts" :niche-label="nicheLabel" />

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-[220px] flex-1">
          <MagnifierIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="search" placeholder="Buscar por nombre, identificador o nicho..." aria-label="Buscar negocio"
            class="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-all placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10" />
        </div>
        <label class="flex items-center gap-2 text-xs font-medium text-text-secondary">
          Ordenar por
          <select v-model="sort" class="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre (A–Z)</option>
            <option value="niche">Nicho</option>
          </select>
        </label>
        <button v-if="hasActiveFilters" type="button" class="text-xs font-semibold text-primary hover:underline" @click="clearFilters">Quitar filtros</button>
      </div>

      <p class="text-xs text-text-muted">
        Mostrando {{ visible.length }} {{ visible.length === 1 ? 'negocio' : 'negocios' }}<template v-if="hasActiveFilters"> con los filtros aplicados</template>.
      </p>

      <div v-if="isLoading" class="py-12 text-center text-sm text-text-muted">Cargando negocios...</div>
      <BusinessList v-else :businesses="visible" :niche-label="nicheLabel" :busy-id="busyId"
        :empty-title="emptyTitle" :empty-hint="emptyHint" @suspend="confirmSuspend" @resume="confirmResume" />
    </div>

    <NewBusinessModal :open="showNewModal" :live-businesses="liveBusinesses" @close="showNewModal = false" @created="showNewModal = false" />
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { AddCircleIcon, MagnifierIcon } from '@solar-icons/vue/linear'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import BusinessStatsBar from '../components/superadmin/BusinessStatsBar.vue'
import BusinessList from '../components/superadmin/BusinessList.vue'
import NewBusinessModal from '../components/superadmin/NewBusinessModal.vue'
import {
  NO_NICHE, countByNiche, countByStatus, filterBusinesses, sortBusinesses,
  type ListedBusiness, type SortKey, type StatusFilter,
} from '../components/superadmin/businessFilters'
import { useNotification } from '../composables/common/useNotification'
import { listBusinesses, resumeBusiness, suspendBusiness, superadminKeys } from '../services/superadminService'
import { translateError } from '../lib/errors'
import { creatableNiches } from '../config/niches'
import type { Business } from '../types/database'

const { success, error: showError } = useNotification()
const queryClient = useQueryClient()

const search = ref('')
const status = ref<StatusFilter>('all')
const niche = ref('')
const sort = ref<SortKey>('recent')
const showNewModal = ref(false)

// One query for everything: deleted businesses are filtered on screen, so the "Eliminados" card can
// show its count without a second request.
const { data, isLoading } = useQuery({
  queryKey: computed(() => [...superadminKeys.businesses(), true] as const),
  queryFn: () => listBusinesses(true),
})
const businesses = computed<Business[]>(() => data.value ?? [])

const knownNiches = creatableNiches()
const nicheLabel = (n: string): string => {
  if (n === NO_NICHE) return 'Sin nicho'
  return knownNiches.find(k => k.id === n)?.label ?? n.replace(/_/g, ' ')
}

const counts = computed(() => countByStatus(businesses.value))
const nicheCounts = computed(() => countByNiche(businesses.value))
const liveBusinesses = computed(() => businesses.value.filter(b => !b.deleted_at))

const visible = computed(() =>
  sortBusinesses(
    filterBusinesses(businesses.value as ListedBusiness[], { search: search.value, status: status.value, niche: niche.value }, nicheLabel),
    sort.value,
    nicheLabel,
  ),
)

const hasActiveFilters = computed(() => !!search.value.trim() || status.value !== 'all' || !!niche.value)
const clearFilters = () => { search.value = ''; status.value = 'all'; niche.value = '' }

const emptyTitle = computed(() => counts.value.all === 0 && !hasActiveFilters.value ? 'Todavía no hay negocios' : 'Ningún negocio coincide')
const emptyHint = computed(() => counts.value.all === 0 && !hasActiveFilters.value
  ? 'Crea el primero con el botón «Nuevo negocio».'
  : 'Prueba con otra búsqueda o quita los filtros.')

// Suspend / reactivate straight from the list — the same calls and confirmations as the business page.
const busyId = ref<string | null>(null)
const refresh = () => queryClient.invalidateQueries({ queryKey: superadminKeys.businesses() }).catch(() => {})

const { mutateAsync: suspendBiz } = useMutation({
  mutationFn: suspendBusiness,
  onSuccess: () => { success('Servicio suspendido'); refresh() },
  onError: (err) => showError(translateError(err, 'Error al suspender')),
  onSettled: () => { busyId.value = null },
})
const { mutateAsync: resumeBiz } = useMutation({
  mutationFn: resumeBusiness,
  onSuccess: () => { success('Servicio reactivado'); refresh() },
  onError: (err) => showError(translateError(err, 'Error al reactivar')),
  onSettled: () => { busyId.value = null },
})

const confirmSuspend = (b: ListedBusiness) => {
  if (!window.confirm(`¿Suspender "${b.name}"?`)) return
  busyId.value = b.id
  suspendBiz(b.id).catch(() => {})
}
const confirmResume = (b: ListedBusiness) => {
  if (!window.confirm(`¿Reactivar "${b.name}"?`)) return
  busyId.value = b.id
  resumeBiz(b.id).catch(() => {})
}
</script>
