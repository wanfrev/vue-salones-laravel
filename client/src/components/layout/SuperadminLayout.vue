<template>
  <div class="min-h-screen bg-bg">
    <header class="sticky top-0 z-40 border-b border-border/50 bg-surface/80 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <router-link to="/superadmin" class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-white shadow-sm shadow-primary/20">
            L
          </div>
          <span class="text-sm font-bold text-text">SaaS Control</span>
        </router-link>
        <button
          @click="handleLogout"
          :disabled="loading"
          class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text transition-colors disabled:opacity-50"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../../composables/common/useAuth'

const { logout, loading } = useAuth()

function handleLogout() {
  logout()
}
</script>
