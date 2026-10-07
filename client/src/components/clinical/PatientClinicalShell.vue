<template>
  <div v-if="riskAlerts.length > 0" class="mb-4 rounded-xl border-2 border-danger/50 bg-danger/5 px-4 py-3">
    <div class="flex items-center gap-2 text-sm font-bold text-danger">
      <DangerTriangleIcon class="h-5 w-5 shrink-0" />
      Alertas de riesgo
    </div>
    <div class="mt-2 flex flex-wrap gap-2">
      <span
        v-for="alert in riskAlerts"
        :key="alert.key"
        class="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-2.5 py-1 text-xs text-danger"
        :title="alert.note || undefined"
      >
        <span class="font-bold">{{ alert.label }}</span>
        <span v-if="alert.note" class="max-w-[16rem] truncate font-medium text-text-secondary">— {{ alert.note }}</span>
      </span>
    </div>
  </div>

  <header class="mb-6 flex items-center justify-between gap-3">
    <button @click="goBack" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
      <ArrowLeftIcon class="h-4 w-4" />
      Volver a la ficha
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
        <span v-if="age !== null">{{ age }} años</span>
        <span v-if="minor" class="rounded-md bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">Menor de edad</span>
      </div>
    </div>
  </section>

  <!-- Menor de edad: tutor y si se le puede entregar información. -->
  <div v-if="minor && !guardian" class="mb-4 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-text-secondary">
    <strong class="text-warning">Menor de edad sin tutor registrado.</strong>
    Agrega nombre y teléfono del tutor en la ficha del paciente (sección «Datos del tutor»).
  </div>
  <div v-else-if="guardian" class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
    <div class="min-w-0">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Tutor / representante legal</p>
      <p class="mt-0.5 truncate font-semibold text-text">
        {{ guardian.name || 'Sin nombre' }}<span v-if="guardian.relationship" class="font-normal text-text-secondary"> · {{ guardian.relationship }}</span>
      </p>
      <p class="text-xs text-text-muted">
        <span v-if="guardian.phone">{{ guardian.phone }}</span><span v-if="guardian.document"> · Documento {{ guardian.document }}</span>
      </p>
    </div>
    <div class="flex items-center gap-2">
      <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="guardian.shareInfo ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary'">
        {{ guardian.shareInfo ? 'Se puede informar al tutor' : 'Sin autorización para informar al tutor' }}
      </span>
      <button v-if="guardian.phone" @click="openGuardianWhatsApp" class="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-theme hover:border-success/40 hover:bg-success/5 hover:text-success">
        WhatsApp tutor
      </button>
    </div>
  </div>

  <!-- Pertenece a un caso (pareja / familia / grupo): lo conjunto vive en el caso. -->
  <div v-if="activeCases.length > 0" class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm">
    <span class="text-xs font-bold uppercase tracking-wider text-primary">Integrante de</span>
    <router-link v-for="c in activeCases" :key="c.id" :to="`${basePath}/casos/${c.id}/resumen`"
      class="rounded-full border border-primary/30 bg-surface px-3 py-1 text-xs font-semibold text-primary transition-theme hover:bg-primary/10">
      {{ c.name }} <span class="font-normal text-text-muted">· {{ CASE_TYPE_LABELS[c.type] }}</span>
    </router-link>
  </div>

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
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone, getInitials } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import { getClienteById } from '../../services/clientesService'
import { useClinicalToolsNavTabs } from '../../composables/clinical/useClinicalToolsNavTabs'
import DentalToolsNav from '../dental/DentalToolsNav.vue'
import { CASE_TYPE_LABELS, ageFromBirthday, guardianFromMetadata, isMinor } from './cases'
import { useClientCases } from '../../composables/clinical/useCaseRecords'
import { ArrowLeftIcon, ArrowRightIcon, ChatRoundLineIcon, DangerTriangleIcon } from '@solar-icons/vue/linear'
import type { Cliente } from '../../types/cliente'

const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
// Se monta en /admin/clientes/:id/expediente-clinico/... y en /dashboard/... — la base se lee de
// la ruta actual para que el componente sea idéntico en ambos árboles.
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const cliente = computed<Cliente | null>(() => clienteData.value ?? null)

const { navTabs, riskAlerts } = useClinicalToolsNavTabs(() => clienteId.value)

// Menor de edad y tutor: salen de la fecha de nacimiento y de los datos del tutor del perfil del paciente.
const age = computed(() => ageFromBirthday(cliente.value?.birthday))
const minor = computed(() => isMinor(cliente.value?.birthday))
const guardian = computed(() => guardianFromMetadata(cliente.value?.metadata))

// Casos de los que es integrante activo (solo se consulta en negocios con casos).
const { cases } = useClientCases(() => clienteId.value, () => businessStore.hasCapability('clinical.cases'))
const activeCases = computed(() => cases.value.filter(c => c.status === 'active' && c.active_member))

const activeTabKey = computed(() => navTabs.value.find(t => route.path.endsWith(`/${t.key}`))?.key ?? '')
const activeTabIndex = computed(() => navTabs.value.findIndex(t => t.key === activeTabKey.value))
const prevTab = computed(() => (activeTabIndex.value > 0 ? navTabs.value[activeTabIndex.value - 1] : null))
const nextTab = computed(() => (
  activeTabIndex.value >= 0 && activeTabIndex.value < navTabs.value.length - 1 ? navTabs.value[activeTabIndex.value + 1] : null
))

// Teclas 1-6 saltan directo a una pestaña — ignoradas mientras se escribe en un campo.
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
  router.push(`${basePath.value}/clientes/${clienteId.value}/expediente-clinico/${key}`)
}

const goBack = () => {
  router.push(`${basePath.value}/clientes/${clienteId.value}`)
}

const openGuardianWhatsApp = () => {
  const phone = sanitizePhone(guardian.value?.phone ?? '')
  if (phone) window.open(`https://wa.me/${phone}`, '_blank')
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
