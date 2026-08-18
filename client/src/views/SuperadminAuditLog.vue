<template>
  <SuperadminLayout>
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-lg font-bold text-text">Auditoría</h1>
          <p class="text-xs text-text-muted">Toda acción sensible de superadmin, en todos los negocios — quién, qué y cuándo.</p>
        </div>
        <div class="flex items-center gap-2">
          <select v-model="actionFilter"
            class="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
            <option value="">Todas las acciones</option>
            <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-surface p-5">
        <div v-if="isLoading" class="py-12 text-center text-sm text-text-muted">Cargando...</div>

        <div v-else-if="logs.length === 0" class="py-12 text-center text-sm text-text-muted">
          Sin actividad registrada{{ actionFilter ? ' para este filtro' : '' }}.
        </div>

        <div v-else class="divide-y divide-border-subtle">
          <div v-for="log in logs" :key="log.id" class="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" :class="actionBadgeClass(log.action)">
                  {{ describeAuditAction(log) }}
                </span>
                <router-link v-if="log.business" :to="`/superadmin/business/${log.business.id}`"
                  class="text-xs font-semibold text-text hover:text-primary transition-colors">
                  {{ log.business.name }}
                </router-link>
              </div>
              <p class="mt-1 text-xs text-text-muted">
                <span class="font-medium text-text-secondary">{{ log.actor?.full_name ?? 'Superadmin' }}</span>
                <template v-if="describeAuditChanges(log)"> — {{ describeAuditChanges(log) }}</template>
                <template v-else-if="metadataSummary(log)"> — {{ metadataSummary(log) }}</template>
              </p>
            </div>
            <span class="shrink-0 text-[11px] text-text-muted whitespace-nowrap">{{ formatDateTime(log.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </SuperadminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import SuperadminLayout from '../components/layout/SuperadminLayout.vue'
import { formatDateTime } from '../lib/formatters'
import {
  listGlobalAuditLogs, superadminKeys, describeAuditAction, describeAuditChanges,
  AUDIT_ACTION_LABELS, type SuperadminAuditLogEntry,
} from '../services/superadminService'

const actionFilter = ref('')

const actionOptions = Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))

const { data, isLoading } = useQuery({
  queryKey: computed(() => superadminKeys.globalAuditLogs(actionFilter.value || null)),
  queryFn: () => listGlobalAuditLogs(actionFilter.value || null),
})
const logs = computed(() => data.value ?? [])

const ACTION_BADGE_CLASSES: Record<string, string> = {
  create_business: 'bg-success/10 text-success',
  update_business: 'bg-info/10 text-info',
  delete_business: 'bg-danger/10 text-danger',
  suspend_business: 'bg-warning/10 text-warning',
  resume_business: 'bg-success/10 text-success',
  reset_admin_password: 'bg-warning/10 text-warning',
  impersonate_admin: 'bg-primary/10 text-primary',
  create_superadmin: 'bg-success/10 text-success',
  revoke_superadmin: 'bg-danger/10 text-danger',
  restore_superadmin: 'bg-success/10 text-success',
}
const actionBadgeClass = (action: string) => ACTION_BADGE_CLASSES[action] ?? 'bg-bg-secondary text-text-muted'

function metadataSummary(log: SuperadminAuditLogEntry): string | null {
  const meta = log.metadata
  if (!meta) return null
  if (typeof meta.admin_name === 'string') return meta.admin_name
  if (typeof meta.business_name === 'string' && !log.business) return meta.business_name
  if (typeof meta.owner_email === 'string') return meta.owner_email
  return null
}
</script>
