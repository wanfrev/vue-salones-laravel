<template>
  <div class="min-h-screen bg-bg">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4">
          <img :src="lumaLogo" alt="Luma" class="h-7 w-auto object-contain" />
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-text">{{ business?.name ?? 'Cargando...' }}</h1>
            <p class="text-sm text-text-muted">Administradores del negocio</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="business?.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'"
          >
            {{ business?.active ? 'Activo' : 'Inactivo' }}
          </span>
          <router-link
            to="/superadmin"
            class="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
          >
            Volver
          </router-link>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-text">Administradores ({{ admins.length }})</h2>

        <div v-if="admins.length" class="space-y-2">
          <div
            v-for="admin in admins"
            :key="admin.id"
            class="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary p-4"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
              {{ admin.full_name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">{{ admin.full_name }}</p>
              <p class="text-xs text-text-muted truncate">{{ admin.id }}</p>
            </div>
            <span class="rounded-full bg-primary-light/50 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {{ admin.role }}
            </span>
          </div>
        </div>

        <div v-else class="rounded-xl border border-dashed border-border bg-bg-secondary p-6 text-center text-sm text-text-muted">
          No hay administradores para este negocio.
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import { useThemeStore } from '../store/theme'
import { listBusinessAdmins, listBusinesses, superadminKeys } from '../services/superadminService'
import lumaLogoLight from '../assets/Luma.svg'
import lumaLogoDark from '../assets/Luma blanco.svg'
import type { AuthProfile } from '../types/auth'
import type { Business } from '../types/database'

const themeStore = useThemeStore()
const lumaLogo = computed(() => (themeStore.isDark ? lumaLogoDark : lumaLogoLight))

const route = useRoute()
const businessId = route.params.id as string

const { data: businessesData } = useQuery({
  queryKey: superadminKeys.businesses(),
  queryFn: listBusinesses,
})

const business = computed<Business | undefined>(() =>
  businessesData.value?.find((b: Business) => b.id === businessId)
)

const { data: adminsData } = useQuery({
  queryKey: superadminKeys.businessAdmins(businessId),
  queryFn: () => listBusinessAdmins(businessId),
})

const admins = computed<AuthProfile[]>(() => adminsData.value ?? [])
</script>
