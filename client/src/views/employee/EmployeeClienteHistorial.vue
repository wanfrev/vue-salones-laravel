<template>
  <AppLayout>
    <header class="mb-4 lg:mb-6 no-print">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-sm text-primary mb-0.5">
            <DocumentIcon class="h-4 w-4" />
             <span class="font-medium uppercase tracking-wider">{{ t.clientPlural || 'Clientes' }}</span>
          </div>
          <p class="text-sm font-semibold text-text sm:text-base">{{ cliente?.name || t.client || 'Cliente' }}</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="goBack"
            class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
          >
            <ArrowLeftIcon class="h-4 w-4" />
            Volver
          </button>
          <button
            v-if="isPatientNiche"
            @click="windowPrint"
            class="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-theme hover:bg-bg-secondary"
            title="Imprimir estado de cuenta"
          >
            <PrinterIcon class="h-4 w-4" />
            Estado de cuenta
          </button>
          <button
            v-if="!hidePhoneFromEmployee && cliente?.phone"
            @click="handleWhatsApp"
            class="flex items-center gap-2 rounded-xl bg-success px-3 py-2 text-sm font-medium text-text-inverse shadow-lg shadow-success/25 transition-theme hover:bg-success/90"
          >
            <CheckCircleIcon class="h-4 w-4" />
            WhatsApp
          </button>
          <button
            v-if="isPetNiche"
            @click="goToConsultorio"
            class="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface px-3 py-2 text-sm font-medium text-primary transition-theme hover:bg-primary/5"
          >
            <DocumentIcon class="h-4 w-4" />
             Ver {{ t.historyPlural || 'Historias clínicas' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Only shown when printing — a plain header since the sidebar/nav are hidden by @media print.
         Odontología-only, same as the button that triggers it. -->
    <div v-if="isPatientNiche" class="print-only mb-6">
      <p class="text-lg font-bold text-text">{{ businessStore.business?.name || 'Estado de cuenta' }}</p>
      <p class="text-sm text-text-secondary">{{ cliente?.name }}<span v-if="!hidePhoneFromEmployee && cliente?.phone"> · {{ cliente.phone }}</span></p>
      <p class="text-xs text-text-muted">Emitido el {{ new Date().toLocaleDateString('es-VE') }}</p>
    </div>

    <!-- Same nav (icons + "has data" dots) PatientDentalShell uses once inside the expediente —
         shared so opening a tool from here doesn't feel like a different app. -->
    <section v-if="isPatientNiche" class="mb-4 no-print">
      <h3 class="mb-3 text-sm font-semibold text-text">Herramientas clínicas</h3>
      <DentalToolsNav v-if="isDentalNiche" :tabs="navTabs" model-value="" @update:model-value="goToTab" />
      <!-- Nicho psicologia: herramientas del módulo clinical.* (oculto para quien no tenga permiso de expediente). -->
      <ClinicalToolsSection v-else-if="isClinicalNiche" />
    </section>

    <!-- Client Info Card -->
    <div v-if="cliente" class="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm no-print">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {{ getInitials(cliente.name) }}
        </div>
        <div class="min-w-0">
          <p class="text-lg font-semibold text-text">{{ cliente.name }}</p>
          <p v-if="!hidePhoneFromEmployee" class="text-sm text-text-secondary">{{ cliente.phone }}</p>
          <p v-if="!hidePhoneFromEmployee && cliente.email" class="text-sm text-text-muted truncate">{{ cliente.email }}</p>
        </div>
      </div>
      <div v-if="cliente.notes" class="mt-3 border-t border-border pt-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Notas / Preferencias</p>
        <p class="text-sm text-text-secondary whitespace-pre-wrap">{{ cliente.notes }}</p>
      </div>
    </div>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ClientVisitList
        class="lg:col-span-2"
        :visits="visits" :is-loading="isLoading" :is-error="isError" :has-more="hasMore" :is-loading-more="isLoadingMore"
        :from="from" :to="to" :range-invalid="rangeInvalid"
        @load-more="loadMore" @retry="retry" @update:range="setRange"
      />
      <ClientVisitSummary :summary="summary" :loading="isLoading" :is-patient-niche="isPatientNiche" />
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone, getInitials, formatDate } from '../../lib/formatters'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { getClienteById } from '../../services/clientesService'
import { isPetNiche as checkPetNiche } from '../../config/nicheFields'
import { isDentalNiche as checkDentalNiche, isClinicalNiche as checkClinicalNiche, isPatientNiche as checkPatientNiche } from '../../config/niches'
import { useDentalToolsNavTabs } from '../../composables/dental/useDentalToolsNavTabs'
import { useClientVisits } from '../../composables/clients/useClientVisits'
import ClientVisitList from '../../components/clients/ClientVisitList.vue'
import ClientVisitSummary from '../../components/clients/ClientVisitSummary.vue'
import DentalToolsNav from '../../components/dental/DentalToolsNav.vue'
import ClinicalToolsSection from '../../components/clinical/ClinicalToolsSection.vue'
import AppLayout from '../../components/layout/AppLayout.vue'
import type { Cliente } from '../../types/cliente'
import { DocumentIcon, ArrowLeftIcon, CheckCircleIcon, PrinterIcon } from '@solar-icons/vue/linear'

const authStore = useAuthStore()
const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
const isPetNiche = computed(() => checkPetNiche(businessStore.nicheType))
const isDentalNiche = computed(() => checkDentalNiche(businessStore.nicheType))
const isClinicalNiche = computed(() => checkClinicalNiche(businessStore.nicheType))
const isPatientNiche = computed(() => checkPatientNiche(businessStore.nicheType))
const { navTabs } = useDentalToolsNavTabs(() => clienteId.value, () => isDentalNiche.value)
const t = computed(() => businessStore.terminology)
const hidePhoneFromEmployee = computed(() => authStore.role === 'empleado' && businessStore.hasFeature('hide_client_phone_from_employees'))

const { data: clienteData } = useQuery({
  queryKey: computed(() => ['cliente', clienteId.value]),
  queryFn: () => getClienteById(clienteId.value),
  enabled: computed(() => !!clienteId.value),
})

const cliente = computed<Cliente | null>(() => clienteData.value ?? null)

const {
  visits, summary, from, to, rangeInvalid, setRange, isLoading, isError, hasMore, isLoadingMore, loadMore, retry,
} = useClientVisits(clienteId)
const ultimaVisita = computed(() => (summary.value?.last_visit ? formatDate(summary.value.last_visit) : ''))

const windowPrint = () => window.print()

const goBack = () => {
  router.push('/dashboard/clientes')
}

const goToConsultorio = () => {
  if (cliente.value) {
    router.push(`/dashboard/consultorio?q=${encodeURIComponent(cliente.value.name)}`)
  } else {
    router.push('/dashboard/consultorio')
  }
}

const goToTab = (key: string) => {
  router.push(`/dashboard/clientes/${clienteId.value}/expediente/${key}`)
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
