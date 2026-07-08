<template>
  <div class="rounded-2xl border border-border bg-surface p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text">Administradores ({{ admins.length }})</h2>
      <router-link
        :to="`/superadmin/business/${businessId}/admins`"
        class="text-sm font-semibold text-primary transition-theme hover:text-primary-hover"
      >
        Ver todos
      </router-link>
    </div>

    <div v-if="admins.length" class="space-y-2">
      <div
        v-for="admin in admins.slice(0, 5)"
        :key="admin.id"
        class="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-3"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
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
</template>

<script setup lang="ts">
defineProps<{
  admins: any[]
  businessId: string
}>()
</script>
