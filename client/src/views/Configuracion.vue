<template>
  <header class="mb-5 lg:mb-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1.5">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Configuración</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">Ajustes del Negocio</h1>
      </div>
    </div>
  </header>

  <!-- Not enabled gate -->
  <div v-if="!businessStore.isMultiBranch" class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary mb-4">
      <svg class="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h2 class="text-lg font-semibold text-text">Múltiples sucursales no disponible</h2>
    <p class="mt-1 text-sm text-text-muted max-w-md">Esta funcionalidad no está habilitada para tu plan actual. Contacta al administrador del sistema para activarla.</p>
  </div>

  <template v-else>
    <!-- Sucursales -->
    <SectionCard
      title="Sucursales"
      subtitle="Gestiona las ubicaciones físicas de tu negocio"
      icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    >
      <template #header-actions>
        <button
          @click="branchesCtx.openNew()"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse transition-theme hover:bg-primary-hover shadow-sm shadow-primary/20"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva sucursal
        </button>
      </template>

      <div v-if="branchesCtx.isLoading.value" class="flex items-center justify-center py-8">
        <svg class="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="branchesCtx.branches.value.length === 0" class="py-8 text-center">
        <EmptyState
          icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          title="No hay sucursales"
          subtitle="Agrega tu primera ubicación física"
          action-label="Nueva sucursal"
          @action="branchesCtx.openNew()"
        />
      </div>

      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="branch in branchesCtx.branches.value"
          :key="branch.id"
          class="group rounded-lg border border-border bg-bg-secondary/50 p-4 transition-theme hover:border-border-strong"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text truncate">{{ branch.name }}</p>
                <p v-if="branch.address" class="text-xs text-text-muted truncate">{{ branch.address }}</p>
              </div>
            </div>
            <span v-if="branch.is_default" class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Principal</span>
          </div>
          <p v-if="branch.phone" class="text-xs text-text-muted mb-3">{{ branch.phone }}</p>
          <div class="flex gap-2">
            <button
              @click="branchesCtx.openEdit(branch)"
              class="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-bg-secondary hover:text-text"
            >
              Editar
            </button>
            <button
              v-if="!branch.is_default"
              @click="branchesCtx.handleDelete(branch.id)"
              :disabled="branchesCtx.deleteMutation.isPending.value"
              class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-theme hover:bg-danger/10 hover:text-danger hover:border-danger/30 disabled:opacity-50"
              title="Eliminar sucursal"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </SectionCard>

    <!-- Branch Form Modal -->
    <BranchFormModal
      :is-open="branchesCtx.showModal.value"
      :is-editing="!!branchesCtx.editingId.value"
      :form="branchesCtx.form.value"
      :save-error="branchesCtx.saveError.value"
      :save-mutation="branchesCtx.saveMutation"
      @close="branchesCtx.closeModal()"
      @save="branchesCtx.handleSave()"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/common/useAuth'
import { useBusinessStore } from '../store/business'
import { useBranches } from '../composables/common/useBranches'
import { SectionCard, EmptyState } from '../components/common'
import { BranchFormModal } from '../components/modals'

const { authStore } = useAuth()
const businessStore = useBusinessStore()
const businessId = computed(() => authStore.businessId)
const branchesCtx = useBranches(businessId)
</script>
