<template>
  <div v-if="encounterCitaId" class="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 shadow-sm backdrop-blur">
    <div class="flex min-w-0 items-center gap-2 text-sm">
      <span class="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary"></span>
      <span class="font-semibold text-text">Atendiendo ahora</span>
      <span v-if="encounterService" class="truncate text-text-secondary">— {{ encounterService }}</span>
      <span v-if="encounterTime" class="shrink-0 text-text-muted">{{ encounterTime }}</span>
    </div>
    <button
      type="button"
      :disabled="finalizeMutation.isPending.value"
      @click="handleFinalize"
      class="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover disabled:opacity-50"
    >
      {{ finalizeMutation.isPending.value ? 'Finalizando...' : 'Finalizar Atención' }}
    </button>
  </div>

  <header class="mb-6 flex items-center justify-between gap-3">
    <button @click="goBack" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
      <ArrowLeftIcon class="h-4 w-4" />
      {{ encounterCitaId ? 'Volver al Gabinete' : 'Volver al directorio' }}
    </button>
    <button v-if="cliente?.phone" @click="handleWhatsApp" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:border-success/40 hover:bg-success/5 hover:text-success" title="Contactar por WhatsApp">
      <ChatRoundLineIcon class="h-4 w-4" />
      Contactar
    </button>
  </header>

  <section class="mb-5 flex min-w-0 items-start gap-4">
    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/15 sm:h-16 sm:w-16">
      {{ getInitials(cliente?.name || '') }}
    </div>
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Expediente del paciente</span>
        <span v-if="cliente?.code" class="rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">ID {{ cliente.code }}</span>
      </div>
      <h1 class="mt-1 truncate text-2xl font-bold tracking-tight text-text sm:text-3xl">{{ cliente?.name || businessStore.terminology.client || 'Paciente' }}</h1>
      <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span v-if="cliente?.phone">{{ cliente.phone }}</span>
        <span v-if="cliente?.email">{{ cliente.email }}</span>
        <span v-if="cliente?.documentId">Documento {{ cliente.documentId }}</span>
        <span v-if="cliente?.medicalInsurance">Seguro: {{ cliente.medicalInsurance }}</span>
      </div>
    </div>
  </section>

  <DentalToolsNav :tabs="navTabs" :model-value="activeTabKey" @update:model-value="goToTab" />

  <router-view />

  <div class="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
    <button
      v-if="prevTab"
      type="button"
      @click="goToTab(prevTab.key)"
      class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <ArrowLeftIcon class="h-4 w-4" />
      {{ prevTab.label }}
    </button>
    <span v-else></span>
    <button
      v-if="nextTab"
      type="button"
      @click="goToTab(nextTab.key)"
      class="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-theme hover:bg-primary/10"
    >
      {{ nextTab.label }}
      <ArrowRightIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { sanitizePhone, getInitials } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import { getClienteById } from '../../services/clientesService'
import { finalizeAttention } from '../../services/agendaService'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { useClinicalHistories } from '../../composables/dental/useClinicalHistories'
import { useDentalChart } from '../../composables/dental/useDentalChart'
import { usePeriodontograms } from '../../composables/dental/usePeriodontograms'
import { useEndoAnnexes } from '../../composables/dental/useEndoAnnexes'
import { usePerioAnnexes } from '../../composables/dental/usePerioAnnexes'
import { useConsents } from '../../composables/dental/useConsents'
import DentalToolsNav, { type DentalNavTab } from './DentalToolsNav.vue'
import {
  ArrowLeftIcon, ArrowRightIcon, ChatRoundLineIcon,
  ClipboardTextIcon, Widget2Icon, ChartSquareIcon, DocumentMedicineIcon, HealthIcon, ClipboardCheckIcon,
} from '@solar-icons/vue/linear'
import type { Cliente } from '../../types/cliente'

const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const { success, error: showError } = useNotification()

const clienteId = computed(() => route.params.id as string)
// Set when arriving from the Tablero de Gabinete (?cita=<id>) — turns this shell into an
// active-encounter view: sticky "Finalizar Atención" bar, and "volver" returns to the
// gabinete queue instead of the general client directory, so the doctor never has to leave
// the clinical tabs to close out the visit and move to the next patient.
const encounterCitaId = computed(() => (route.query.cita as string) || '')
const encounterService = computed(() => (route.query.service as string) || '')
const encounterTime = computed(() => (route.query.time as string) || '')
// Admin routes live at /admin/clientes/:id/expediente/..., employee routes at the same path
// under /dashboard — this shell is mounted at both, so the base is read off the current path
// instead of being hardcoded, keeping the component identical in both trees.
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const cliente = computed<Cliente | null>(() => clienteData.value ?? null)

// One lightweight query per clinical tool, keyed exactly like each tab's own view — this both
// drives the "has data" dots below and warms the cache, so a tab a doctor switches into during
// the same visit renders instantly instead of showing its own loading spinner again.
const { histories, isLoading: historiaLoading } = useClinicalHistories(() => clienteId.value)
const { chart, isLoading: odontogramaLoading } = useDentalChart(() => clienteId.value)
const { periodontograms, isLoading: periodontogramaLoading } = usePeriodontograms(() => clienteId.value)
const { annexes: endoAnnexes, isLoading: endoLoading } = useEndoAnnexes(() => clienteId.value)
const { annexes: perioAnnexes, isLoading: perioAnexoLoading } = usePerioAnnexes(() => clienteId.value)
const { consents, isLoading: consentimientoLoading } = useConsents(() => clienteId.value)

const navTabs = computed<DentalNavTab[]>(() => [
  { key: 'historia-clinica', label: 'Historia clínica', icon: ClipboardTextIcon, shortcut: 1, isLoading: historiaLoading.value, hasData: histories.value.length > 0 },
  { key: 'odontograma', label: 'Odontograma', icon: Widget2Icon, shortcut: 2, isLoading: odontogramaLoading.value, hasData: Object.keys(chart.value?.teeth ?? {}).length > 0 },
  { key: 'periodontograma', label: 'Periodontograma', icon: ChartSquareIcon, shortcut: 3, isLoading: periodontogramaLoading.value, hasData: periodontograms.value.length > 0 },
  { key: 'anexo-endodoncia', label: 'Endodoncia', shortLabel: 'Endodoncia', icon: DocumentMedicineIcon, shortcut: 4, isLoading: endoLoading.value, hasData: endoAnnexes.value.length > 0 },
  { key: 'anexo-periodoncia', label: 'Periodoncia', icon: HealthIcon, shortcut: 5, isLoading: perioAnexoLoading.value, hasData: perioAnnexes.value.length > 0 },
  { key: 'consentimiento', label: 'Consentimientos', icon: ClipboardCheckIcon, shortcut: 6, isLoading: consentimientoLoading.value, hasData: consents.value.length > 0 },
])

const activeTabKey = computed(() => navTabs.value.find(t => route.path.endsWith(`/${t.key}`))?.key ?? '')
const activeTabIndex = computed(() => navTabs.value.findIndex(t => t.key === activeTabKey.value))
const prevTab = computed(() => (activeTabIndex.value > 0 ? navTabs.value[activeTabIndex.value - 1] : null))
const nextTab = computed(() => (
  activeTabIndex.value >= 0 && activeTabIndex.value < navTabs.value.length - 1 ? navTabs.value[activeTabIndex.value + 1] : null
))

// Number keys 1-6 jump straight to a tool — skipped while the doctor is typing in a field.
function onKeydown(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return
  const tab = navTabs.value.find(t => String(t.shortcut) === e.key)
  if (tab) goToTab(tab.key)
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const goToTab = (key: string) => {
  // Preserve the active-encounter query params (cita/service/time) across tab switches.
  router.push({ path: `${basePath.value}/clientes/${clienteId.value}/expediente/${key}`, query: route.query })
}

const goBack = () => {
  if (encounterCitaId.value) {
    router.push('/dashboard/gabinete')
    return
  }
  router.push(`${basePath.value}/clientes/${clienteId.value}`)
}

const finalizeMutation = useMutation({
  mutationFn: (id: string) => finalizeAttention(id),
  onError: (err) => showError(translateError(err)),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
    success('Atención finalizada — enviada al Punto de Venta')
    router.push('/dashboard/gabinete')
  },
})

function handleFinalize() {
  if (!encounterCitaId.value || finalizeMutation.isPending.value) return
  finalizeMutation.mutate(encounterCitaId.value)
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
