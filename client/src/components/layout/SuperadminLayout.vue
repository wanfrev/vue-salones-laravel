<template>
  <div class="min-h-screen bg-bg">
    <header class="sticky top-0 z-40 border-b border-border/50 bg-surface/80 pt-[var(--safe-top)] backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <router-link to="/superadmin" class="flex shrink-0 items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white shadow-sm shadow-primary/20">L</div>
          <span class="hidden text-sm font-bold text-text sm:inline">Panel de control</span>
        </router-link>

        <nav class="flex min-w-0 items-center gap-1" aria-label="Secciones del panel">
          <div class="flex min-w-0 items-center gap-1 overflow-x-auto">
            <router-link v-for="item in NAV" :key="item.name" :to="item.to" :title="item.hint"
              class="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              :class="isActive(item.name) ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'">
              {{ item.label }}
            </router-link>
          </div>
          <button @click="handleLogout" :disabled="loading"
            class="ml-1 shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text disabled:opacity-50">
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/common/useAuth'

const route = useRoute()
const { logout, loading } = useAuth()

// A business page (and its admins page) belongs to "Negocios" in the menu.
const NAV = [
  { name: 'superadmin', to: '/superadmin', label: 'Negocios', hint: 'Lista de negocios y sus fichas' },
  { name: 'superadmin-features', to: '/superadmin/features', label: 'Funciones por nicho', hint: 'Compara qué tiene activado cada negocio dentro de su nicho' },
  { name: 'superadmin-audit-log', to: '/superadmin/audit-log', label: 'Auditoría', hint: 'Registro de las acciones sensibles del panel' },
  { name: 'superadmin-accounts', to: '/superadmin/accounts', label: 'Superadmins', hint: 'Quién tiene acceso a este panel' },
]

const isActive = (name: string) =>
  route.name === name || (name === 'superadmin' && String(route.name ?? '').startsWith('superadmin-business'))

function handleLogout() {
  logout()
}
</script>
