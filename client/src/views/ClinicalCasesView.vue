<template>
  <div>
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Atención psicológica</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-text sm:text-3xl">Casos</h1>
        <p class="mt-1 max-w-2xl text-sm text-text-muted">
          Terapia de pareja, familia o grupo. En un caso el paciente es el sistema: las sesiones y el plan conjuntos pertenecen al caso y los ven todos los integrantes; lo individual de cada uno sigue siendo privado.
        </p>
      </div>
      <button v-if="!showForm" @click="showForm = true" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 transition-theme hover:bg-primary-hover">
        <AddCircleIcon class="h-4 w-4" />
        Nuevo caso
      </button>
    </header>

    <CaseCreateForm v-if="showForm" class="mb-6" :saving="createMutation.isPending.value" @submit="handleCreate" @cancel="showForm = false" />

    <p v-if="!hasAccess" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
      No tienes permiso para ver el expediente clínico.
    </p>

    <template v-else>
      <div class="mb-4 flex gap-2" role="tablist" aria-label="Estado de los casos">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          role="tab"
          :aria-selected="status === f.value"
          @click="status = f.value"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition-theme"
          :class="status === f.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:border-primary/30'"
        >{{ f.label }}</button>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>

      <div v-else-if="cases.length === 0" class="rounded-xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        {{ status === 'active' ? 'No hay casos activos. Crea el primero con «Nuevo caso».' : 'No hay casos cerrados.' }}
      </div>

      <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <li v-for="c in cases" :key="c.id">
          <router-link :to="`${basePath}/casos/${c.id}/resumen`" class="block rounded-xl border border-border bg-surface p-4 shadow-sm transition-theme hover:border-primary/40 hover:bg-primary/5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="truncate text-base font-bold text-text">{{ c.name }}</p>
              <span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{{ CASE_TYPE_LABELS[c.type] }}</span>
            </div>
            <p class="mt-1 truncate text-sm text-text-secondary">{{ memberNames(c) }}</p>
            <p class="mt-2 text-xs text-text-muted">
              {{ activeMembers(c).length }} integrantes
              <span v-if="c.opened_on"> · desde {{ formatDateHuman(c.opened_on) }}</span>
              <span v-if="c.status === 'closed'" class="ml-1 rounded bg-bg-secondary px-1.5 py-0.5 font-semibold">Cerrado</span>
            </p>
          </router-link>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import CaseCreateForm from '../components/clinical/CaseCreateForm.vue'
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
