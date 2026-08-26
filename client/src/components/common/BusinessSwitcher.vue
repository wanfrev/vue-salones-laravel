<template>
  <div v-if="linkedBusinesses.length > 0" class="relative">
    <button @click="isOpen = !isOpen"
      class="flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-medium text-text transition-colors hover:bg-bg-secondary sm:gap-1.5 sm:px-2.5">
      <svg class="hidden h-3.5 w-3.5 shrink-0 text-text-muted sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M4 21V8l8-5 8 5v13M9 21v-6h6v6" />
      </svg>
      <span class="max-w-[56px] truncate sm:max-w-[120px]">Cambiar negocio</span>
      <svg class="h-3 w-3 shrink-0 text-text-muted transition-transform" :class="isOpen ? 'rotate-180' : ''" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="isOpen"
      class="absolute left-0 top-full mt-1 w-64 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden" style="overflow: clip;">
      <div class="px-3 py-2 border-b border-border">
        <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Negocios</p>
      </div>
      <div class="max-h-60 overflow-y-auto py-1 touch-pan-y overscroll-contain" style="-webkit-overflow-scrolling: touch;">
        <button v-for="biz in linkedBusinesses" :key="biz.user_id" @click="select(biz)"
          :disabled="!biz.active || switching"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
          <span class="min-w-0">
            <span class="block truncate text-text">{{ biz.business_name }}</span>
            <span class="block truncate text-[11px] text-text-muted">{{ getNiche(biz.niche_type).label }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Backdrop to close -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { listLinkedBusinesses, type LinkedBusiness } from '../../services/authService'
import { switchToBusiness } from '../../composables/common/useBusinessSwitch'
import { getNiche } from '../../config/niches'
import { useAuthStore } from '../../store/auth'

const authStore = useAuthStore()
const isOpen = ref(false)
const switching = ref(false)

const { data } = useQuery({
  queryKey: ['auth', 'linked-businesses'],
  queryFn: listLinkedBusinesses,
  enabled: computed(() => !!authStore.user),
  staleTime: 5 * 60 * 1000,
})

const linkedBusinesses = computed<LinkedBusiness[]>(() => data.value ?? [])

async function select(biz: LinkedBusiness) {
  if (!biz.active || switching.value) return
  switching.value = true
  isOpen.value = false
  try {
    await switchToBusiness(biz.user_id)
  } catch {
    switching.value = false
  }
}
</script>
