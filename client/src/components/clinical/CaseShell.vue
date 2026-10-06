<template>
  <div v-if="isLoading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
  </div>

  <p v-else-if="!clinicalCase" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
    No se encontró el caso, o no tienes permiso para verlo.
  </p>

  <template v-else>
    <header class="mb-5">
      <button @click="goBack" class="mb-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-theme hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
        <ArrowLeftIcon class="h-4 w-4" />
        Volver a casos
      </button>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Caso de {{ CASE_TYPE_LABELS[clinicalCase.type].toLowerCase() }}</span>
        <span v-if="clinicalCase.status === 'closed'" class="rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Cerrado</span>
      </div>
      <h1 class="mt-1 truncate text-2xl font-bold tracking-tight text-text sm:text-3xl">{{ clinicalCase.name }}</h1>

      <ul class="mt-3 flex flex-wrap gap-2">
        <li v-for="m in activeMembers(clinicalCase)" :key="m.client_id">
          <router-link :to="`${basePath}/clientes/${m.client_id}/expediente-clinico/historia`"
            class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary transition-theme hover:border-primary/40 hover:text-primary"
            title="Abrir el expediente individual">
            <span v-if="m.is_primary" class="rounded bg-primary/15 px-1 text-[10px] font-bold text-primary">Titular</span>
            {{ titleCase(m.client_name) }}<span v-if="m.role" class="text-text-muted">· {{ m.role }}</span>
          </router-link>
        </li>
      </ul>
    </header>

    <DentalToolsNav :tabs="navTabs" :model-value="activeTabKey" @update:model-value="goToTab" />

    <router-view />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, CalendarIcon, DocumentMedicineIcon, ChartSquareIcon, UsersGroupRoundedIcon } from '@solar-icons/vue/linear'
import DentalToolsNav, { type DentalNavTab } from '../dental/DentalToolsNav.vue'
import { CASE_TYPE_LABELS, activeMembers } from './cases'
import { useCase } from '../../composables/clinical/useCases'
import { useBusinessStore } from '../../store/business'

const route = useRoute()
const router = useRouter()
const businessStore = useBusinessStore()

const caseId = computed(() => route.params.caseId as string)
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

const { clinicalCase, isLoading } = useCase(() => caseId.value)

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())

// El genograma del caso solo aparece si el negocio tiene esa capability.
const navTabs = computed<DentalNavTab[]>(() => {
  const tabs: DentalNavTab[] = [
    { key: 'resumen', label: 'Integrantes', icon: UsersGroupRoundedIcon, shortcut: 1, hasData: true },
    { key: 'sesiones', label: 'Sesiones conjuntas', shortLabel: 'Sesiones', icon: CalendarIcon, shortcut: 2, hasData: false },
    { key: 'plan', label: 'Plan conjunto', shortLabel: 'Plan', icon: DocumentMedicineIcon, shortcut: 3, hasData: false },
  ]
  if (businessStore.hasCapability('clinical.diagrams')) {
    tabs.push({ key: 'genograma', label: 'Genograma', icon: ChartSquareIcon, shortcut: 4, hasData: false })
  }
  return tabs
})

const activeTabKey = computed(() => navTabs.value.find(t => route.path.endsWith(`/${t.key}`))?.key ?? '')

const goToTab = (key: string) => router.push(`${basePath.value}/casos/${caseId.value}/${key}`)
const goBack = () => router.push(`${basePath.value}/casos`)
</script>
