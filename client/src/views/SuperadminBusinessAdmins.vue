<template>
  <SuperadminLayout>
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <router-link to="/superadmin" class="text-xs font-medium text-text-muted hover:text-text transition-colors">
          Negocios
        </router-link>
        <span class="text-text-muted/40 text-xs">/</span>
        <router-link :to="`/superadmin/business/${businessId}`" class="text-xs font-medium text-text-muted hover:text-text transition-colors">
          {{ business?.name || '...' }}
        </router-link>
        <span class="text-text-muted/40 text-xs">/</span>
        <span class="text-xs font-semibold text-text">Administradores</span>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-5">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-bold text-text">Administradores</h1>
          <span class="rounded-full bg-bg-secondary px-2.5 py-0.5 text-xs font-semibold text-text-muted">{{ admins.length }}</span>
        </div>
        <div v-if="admins.length === 0" class="py-12 text-center text-sm text-text-muted">
          No hay administradores registrados para este negocio.
        </div>
        <div v-else class="divide-y divide-border-subtle">
          <div v-for="admin in admins" :key="admin.id"
            class="flex items-center gap-4 px-1 py-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
              {{ getInitials(admin.full_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">{{ admin.full_name }}</p>
              <p class="text-xs text-text-muted">{{ admin.email }}</p>
            </div>
            <span class="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[10px] font-bold uppercase">{{ admin.role }}</span>
          </div>
        </div>
      </div>
    </div>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import { listBusinessAdmins, listBusinesses, superadminKeys } from '../services/superadminService'
import type { Business } from '../types/database'

const route = useRoute()
const businessId = computed(() => route.params.id as string)

const { data: businessesData } = useQuery({
  queryKey: superadminKeys.businesses(),
  queryFn: listBusinesses,
})
const business = computed<Business | undefined>(() =>
  businessesData.value?.find((b: Business) => b.id === businessId.value)
)

const { data: adminsData } = useQuery({
  queryKey: computed(() => superadminKeys.businessAdmins(businessId.value)),
  queryFn: () => listBusinessAdmins(businessId.value),
})
const admins = computed(() => adminsData.value ?? [])

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}
</script>
