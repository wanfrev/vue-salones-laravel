<template>
  <div v-if="!selectedPet" class="space-y-6">
    <header class="mb-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Consultorio
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-text lg:text-3xl">
            Historias Clínicas
          </h1>
        </div>
        <div class="mt-4 sm:mt-0">
          <button
            @click="openNewFicha"
            class="flex items-center justify-center gap-1.5 w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Historia Médica
          </button>
        </div>
      </div>
    </header>

    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative flex-1 max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre de mascota o tutor..."
          class="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text outline-none transition-theme placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 text-center text-text-muted text-sm flex items-center justify-center gap-2">
      <svg class="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Cargando pacientes...
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPets.length === 0" class="py-12 text-center border border-border border-dashed rounded-xl bg-surface">
      <svg class="mx-auto h-12 w-12 text-border-strong mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <p class="text-sm text-text-muted font-medium">No se encontraron mascotas.</p>
      <p class="text-xs text-text-muted/70 mt-1">Intenta con otro término de búsqueda.</p>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="lg:hidden space-y-3">
      <div
        v-for="pet in filteredPets"
        :key="pet.id"
        class="rounded-xl border border-border bg-surface p-4 transition-theme active:bg-bg-secondary"
        @click="openHistory(pet)"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {{ getInitials(pet.name) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-text truncate">{{ pet.name }}</p>
            <p class="text-xs text-text-muted mt-0.5 truncate">{{ pet.breed || 'Sin raza' }} <template v-if="pet.weight">· {{ pet.weight }}</template></p>
            <p class="text-xs text-text-muted mt-1 truncate">Tutor: <span class="font-medium text-text">{{ pet.client?.full_name || pet.client?.name || '—' }}</span></p>
          </div>
          <svg class="h-5 w-5 text-text-muted/50 mt-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Desktop Table -->
    <div v-if="!isLoading && filteredPets.length > 0" class="hidden lg:block overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-bg-secondary/30">
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Paciente (Mascota)</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Raza / Peso</th>
              <th class="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Tutor</th>
              <th class="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pet in filteredPets" :key="pet.id" class="cursor-pointer border-b border-border-subtle last:border-b-0 transition-theme hover:bg-bg-secondary group" @click="openHistory(pet)">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary group-hover:bg-primary/20 transition-colors">
                    {{ getInitials(pet.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-text truncate group-hover:text-primary transition-colors">{{ pet.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-xs text-text-secondary">{{ pet.breed || 'Sin raza' }}</div>
                <div v-if="pet.weight" class="text-xs text-text-muted mt-0.5">{{ pet.weight }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-sm font-medium text-text truncate max-w-[150px]">{{ pet.client?.full_name || pet.client?.name || '—' }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/15 transition-colors border border-primary/10"
                >
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 002 2z" />
                  </svg>
                  Ver Ficha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <ConsultorioMascota
    v-else
    :pet="selectedPet"
    @back="selectedPet = null"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { useModal } from '../../composables/common/useModal'
import { petsKeys, listAllPets } from '../../services/petService'
import { getInitials } from '../../lib/formatters'
import ConsultorioMascota from './ConsultorioMascota.vue'
import type { Pet } from '../../types/database'

const route = useRoute()
const searchQuery = ref('')
const selectedPet = ref<Pet | null>(null)

onMounted(() => {
  if (route.query.q) {
    searchQuery.value = route.query.q as string
  }
})

const openNewFicha = () => {
  useModal('cita-form-modal').open({
    status: 'completed', // For medical histories, default to completed
  })
}

// React Query to fetch all pets for this business
const { data: pets, isLoading } = useQuery({
  queryKey: petsKeys.all(),
  queryFn: () => listAllPets(),
  staleTime: 5 * 60 * 1000,
})

const filteredPets = computed(() => {
  if (!pets.value) return []
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return pets.value

  return pets.value.filter((pet: any) => {
    const petName = (pet.name || '').toLowerCase()
    const clientName = (pet.client?.full_name || pet.client?.name || '').toLowerCase()
    return petName.includes(query) || clientName.includes(query)
  })
})

const openHistory = (pet: Pet) => {
  selectedPet.value = pet
}
</script>
