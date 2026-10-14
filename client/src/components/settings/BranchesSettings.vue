<template>
  <SettingsSection :title="section.title" :description="section.description">
    <template #actions>
      <button
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
        @click="ctx.openNew()"
      >
        <AddCircleIcon class="h-3.5 w-3.5" />
        Nueva sucursal
      </button>
    </template>

    <div v-if="ctx.isLoading.value" class="flex items-center justify-center py-8">
      <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-label="Cargando sucursales">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>

    <div v-else-if="ctx.branches.value.length === 0" class="py-8 text-center">
      <EmptyState
        icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        title="Todavía no tienes sucursales"
        subtitle="Agrega la primera ubicación física de tu negocio."
        action-label="Nueva sucursal"
        @action="ctx.openNew()"
      />
    </div>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="branch in ctx.branches.value" :key="branch.id"
        class="card-hairline group rounded-xl p-4 transition-all duration-200 hover:border-border-strong"
      >
        <div class="mb-2 flex items-start justify-between">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5a7.5 7.5 0 1115 0c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5z" />
                <circle cx="12" cy="10.5" r="3" />
              </svg>
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-text">{{ branch.name }}</p>
              <p v-if="branch.address" class="truncate text-xs text-text-muted">{{ branch.address }}</p>
            </div>
          </div>
          <span v-if="branch.is_default" class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span>
        </div>

        <p v-if="branch.phone" class="mb-3 flex items-center gap-1.5 text-xs text-text-muted">
          <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
          {{ branch.phone }}
        </p>

        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-surface-elevated hover:text-text"
            @click="ctx.openEdit(branch)"
          >Editar</button>
          <button
            v-if="!branch.is_default"
            :disabled="ctx.deleteMutation.isPending.value"
            class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            title="Eliminar sucursal" aria-label="Eliminar sucursal"
            @click="ctx.handleDelete(branch.id)"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </SettingsSection>

  <BranchFormModal
    :is-open="ctx.showModal.value"
    :is-editing="!!ctx.editingId.value"
    :form="ctx.form.value"
    :save-error="ctx.saveError.value"
    :save-mutation="ctx.saveMutation"
    @close="ctx.closeModal()"
    @save="ctx.handleSave()"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AddCircleIcon } from '@solar-icons/vue/linear'
import { useAuth } from '../../composables/common/useAuth'
import { useBranches } from '../../composables/common/useBranches'
import { useBusinessStore } from '../../store/business'
import { EmptyState } from '../common'
import { BranchFormModal } from '../modals'
import SettingsSection from './SettingsSection.vue'
import { sectionCopy, termsFrom } from './featureCopy'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const ctx = useBranches(computed(() => authStore.businessId))
const section = computed(() => sectionCopy(termsFrom(businessStore.terminology)).sucursales)
</script>
