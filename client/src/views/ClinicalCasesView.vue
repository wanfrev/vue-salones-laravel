<template>
  <div>
    <ClinicalPageHeader
      :icon="UsersGroupRoundedIcon"
      title="Casos"
      description="Terapia de pareja, familia o grupo. En un caso el paciente es el sistema: las sesiones y el plan conjuntos pertenecen al caso y los ven todos los integrantes; lo individual de cada uno sigue siendo privado."
    >
      <button v-if="!showForm" @click="showForm = true" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover">
        <AddCircleIcon class="h-4 w-4" />
        Nuevo caso
      </button>
    </ClinicalPageHeader>

    <CaseCreateForm v-if="showForm" class="mb-4" :saving="createMutation.isPending.value" @submit="handleCreate" @cancel="showForm = false" />

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <p v-if="!hasAccess" class="px-4 py-12 text-center text-sm text-text-muted">
        No tienes permiso para ver el expediente clínico.
      </p>

      <template v-else>
        <UnderlineTabs v-model="status" :tabs="FILTERS" aria-label="Estado de los casos" />

        <ClinicalListSkeleton v-if="isLoading" />

        <div v-else-if="cases.length === 0" class="px-4 py-12 text-center text-sm text-text-muted">
          {{ status === 'active' ? 'No hay casos activos. Crea el primero con «Nuevo caso».' : 'No hay casos cerrados.' }}
        </div>

        <ul v-else class="divide-y divide-border-subtle">
          <li v-for="c in cases" :key="c.id">
            <router-link :to="`${basePath}/casos/${c.id}/resumen`" class="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-primary/5 sm:px-4">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-text">{{ c.name }}</p>
                <p class="mt-0.5 truncate text-xs text-text-secondary">{{ memberNames(c) }}</p>
                <p class="mt-0.5 text-xs text-text-muted">
                  {{ activeMembers(c).length }} integrantes
                  <span v-if="c.opened_on"> · desde {{ formatDateHuman(c.opened_on) }}</span>
                  <span v-if="c.status === 'closed'" class="font-semibold"> · Cerrado</span>
                </p>
              </div>
              <span class="shrink-0 text-xs font-semibold text-primary">{{ CASE_TYPE_LABELS[c.type] }}</span>
              <ArrowRightIcon class="hidden h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-primary sm:block" aria-hidden="true" />
            </router-link>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AddCircleIcon, ArrowRightIcon, UsersGroupRoundedIcon } from '@solar-icons/vue/linear'
import CaseCreateForm from '../components/clinical/CaseCreateForm.vue'
import ClinicalListSkeleton from '../components/clinical/ClinicalListSkeleton.vue'
import ClinicalPageHeader from '../components/clinical/ClinicalPageHeader.vue'
import UnderlineTabs from '../components/common/UnderlineTabs.vue'
import { CASE_TYPE_LABELS, activeMembers, memberNames } from '../components/clinical/cases'
import { useCases } from '../composables/clinical/useCases'
import { formatDateHuman } from '../lib/formatters'
import type { CreateCasePayload } from '../services/clinical/caseService'
import type { ClinicalCaseStatus } from '../types/database'

const route = useRoute()
const router = useRouter()
const basePath = computed(() => (route.path.startsWith('/dashboard') ? '/dashboard' : '/admin'))

const FILTERS: Array<{ value: ClinicalCaseStatus; label: string }> = [
  { value: 'active', label: 'Activos' },
  { value: 'closed', label: 'Cerrados' },
]
const status = ref<ClinicalCaseStatus>('active')
const showForm = ref(false)

const { cases, isLoading, hasAccess, createMutation } = useCases(() => status.value)

async function handleCreate(payload: CreateCasePayload) {
  try {
    const created = await createMutation.mutateAsync(payload)
    showForm.value = false
    router.push(`${basePath.value}/casos/${created.id}/resumen`)
  } catch {
    // El toast de error ya lo muestra onError; el formulario queda abierto para no perder la selección.
  }
}
</script>
