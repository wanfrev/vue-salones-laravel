<template>
  <!-- Only shown when printing a leaf tab (e.g. Presupuesto) — the shell's own header/nav/alerts
       are hidden by the @media print rules below, so this stands in as the printed identity block. -->
  <div class="print-only mb-4">
    <p class="text-lg font-bold text-text">{{ cliente?.name }}</p>
    <p class="text-xs text-text-secondary">
      <span v-if="cliente?.phone">{{ cliente.phone }}</span>
      <span v-if="cliente?.documentId"> · Documento {{ cliente.documentId }}</span>
    </p>
  </div>

  <div v-if="medicalAlerts.length > 0" class="mb-4 rounded-xl border-2 border-danger/50 bg-danger/5 px-4 py-3 no-print">
    <div class="flex items-center gap-2 text-sm font-bold text-danger">
      <DangerTriangleIcon class="h-5 w-5 shrink-0" />
      Alertas médicas
    </div>
    <div class="mt-2 flex flex-wrap gap-2">
      <span
        v-for="alert in medicalAlerts"
        :key="alert.key"
        class="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-2.5 py-1 text-xs text-danger"
        :title="alert.note || undefined"
      >
        <span class="font-bold">{{ alert.label }}</span>
        <span v-if="alert.note" class="max-w-[16rem] truncate font-medium text-text-secondary">— {{ alert.note }}</span>
      </span>
    </div>
  </div>

  <div v-if="encounterCitaId" class="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 shadow-sm backdrop-blur no-print">
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

  <header class="mb-6 flex items-center justify-between gap-3 no-print">
    <button @click="goBack" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
      <ArrowLeftIcon class="h-4 w-4" />
      {{ encounterCitaId ? 'Volver al Gabinete' : 'Volver al directorio' }}
    </button>
    <button v-if="cliente?.phone" @click="handleWhatsApp" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:border-success/40 hover:bg-success/5 hover:text-success" title="Contactar por WhatsApp">
      <ChatRoundLineIcon class="h-4 w-4" />
      Contactar
    </button>
  </header>

  <section class="mb-5 flex min-w-0 items-start gap-4 no-print">
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

  <DentalToolsNav class="no-print" :tabs="navTabs" :model-value="activeTabKey" @update:model-value="goToTab" />

  <router-view />

  <div class="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4 no-print">
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
import { useDentalToolsNavTabs } from '../../composables/dental/useDentalToolsNavTabs'
import DentalToolsNav from './DentalToolsNav.vue'
import { MEDICAL_SYSTEM_LABELS, HIGH_RISK_MEDICAL_SYSTEMS } from './medicalSystemLabels'
import { ArrowLeftIcon, ArrowRightIcon, ChatRoundLineIcon, DangerTriangleIcon } from '@solar-icons/vue/linear'
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

// Same tab list (icons, "has data" dots, shortcuts) the client summary page's quick-access
// cards use — shared so the two screens can't drift into different visual languages again.
const { navTabs, currentHistory } = useDentalToolsNavTabs(() => clienteId.value)

// Red alert badges in the header — pulled straight from Historia Clínica's "antecedentes
// médicos" so a doctor (or the secretary booking the visit) sees allergies/meds/conditions
// that change chairside decisions without having to open that tab first.
const medicalAlerts = computed(() => {
  const antecedentes = currentHistory.value?.anamnesis?.antecedentes_medicos
  if (!antecedentes) return []
  return HIGH_RISK_MEDICAL_SYSTEMS
    .filter(key => antecedentes[key]?.refiere)
    .map(key => ({ key, label: MEDICAL_SYSTEM_LABELS[key], note: antecedentes[key]?.observaciones || '' }))
})

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

<style>
@media print {
  @page { size: auto; margin: 10mm; }

  html, body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  header, aside, nav, footer {
    display: none !important;
  }

  main {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }

  main > div {
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .fixed.inset-0 {
    display: none !important;
  }

  .min-h-screen > .fixed {
    display: none !important;
  }
}
</style>
