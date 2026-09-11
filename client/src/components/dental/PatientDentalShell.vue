<template>
  <header class="mb-6 flex items-center justify-between gap-3">
    <button @click="goBack" class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
      <ArrowLeftIcon class="h-4 w-4" />
      Volver al directorio
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

  <SegmentedTabs class="mb-6 flex-wrap" :tabs="tabs" :model-value="activeTabKey" @update:model-value="goToTab" />

  <router-view />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { sanitizePhone, getInitials } from '../../lib/formatters'
import { useBusinessStore } from '../../store/business'
import { getClienteById } from '../../services/clientesService'
import SegmentedTabs, { type SegmentedTab } from '../common/SegmentedTabs.vue'
import { ArrowLeftIcon, ChatRoundLineIcon } from '@solar-icons/vue/linear'
import type { Cliente } from '../../types/cliente'

const businessStore = useBusinessStore()
const route = useRoute()
const router = useRouter()

const clienteId = computed(() => route.params.id as string)
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

const tabs: SegmentedTab[] = [
  { key: 'historia-clinica', label: 'Historia clínica' },
  { key: 'odontograma', label: 'Odontograma' },
  { key: 'periodontograma', label: 'Periodontograma' },
  { key: 'anexo-endodoncia', label: 'Endodoncia' },
  { key: 'anexo-periodoncia', label: 'Periodoncia' },
  { key: 'consentimiento', label: 'Consentimientos' },
]

const activeTabKey = computed(() => tabs.find(t => route.path.endsWith(`/${t.key}`))?.key ?? '')

const goToTab = (key: string) => {
  router.push(`${basePath.value}/clientes/${clienteId.value}/expediente/${key}`)
}

const goBack = () => {
  router.push(`${basePath.value}/clientes/${clienteId.value}`)
}

const handleWhatsApp = () => {
  const phone = sanitizePhone(cliente.value?.phone ?? '')
  if (!phone) return
  window.open(`https://wa.me/${phone}`, '_blank')
}
</script>
