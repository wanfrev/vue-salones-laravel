<template>
  <div class="relative">
    <button @click="isOpen = !isOpen"
      class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-bg-secondary"
      :class="currentBranch ? 'text-text' : 'text-text-muted'">
      <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <span class="max-w-[120px] truncate">{{ currentBranch?.name ?? 'Sucursal' }}</span>
      <svg class="h-3 w-3 text-text-muted transition-transform" :class="isOpen ? 'rotate-180' : ''" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="isOpen"
      class="absolute left-0 top-full mt-1 w-56 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden">
      <div class="px-3 py-2 border-b border-border">
        <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Sucursales</p>
      </div>
      <div class="max-h-60 overflow-y-auto py-1">
        <button v-for="branch in store.branches" :key="branch.id" @click="select(branch.id)"
          class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary"
          :class="branch.id === store.selectedBranchId ? 'bg-primary/5 text-primary font-semibold' : 'text-text'">
          <span class="truncate">{{ branch.name }}</span>
        </button>
      </div>
    </div>

    <!-- Backdrop to close -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBusinessStore } from '../../store/business'

const store = useBusinessStore()
const isOpen = ref(false)

const currentBranch = computed(() => store.currentBranch)

function select(id: string) {
  store.setBranch(id)
  isOpen.value = false
}
</script>
