<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-surface">
    <div v-if="businesses.length === 0" class="px-6 py-14 text-center">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
        <BuildingsIcon class="h-6 w-6 text-text-muted" />
      </div>
      <p class="mb-1 text-sm font-semibold text-text">{{ emptyTitle }}</p>
      <p class="text-xs text-text-muted">{{ emptyHint }}</p>
    </div>

    <ul v-else class="divide-y divide-border-subtle">
      <li v-for="biz in businesses" :key="biz.id" class="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-bg-secondary/40">
        <router-link :to="`/superadmin/business/${biz.id}`" class="flex min-w-0 flex-1 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{{ initials(biz.name) }}</span>
          <span class="min-w-0">
            <span class="flex flex-wrap items-center gap-2">
              <span class="truncate text-sm font-semibold text-text transition-colors group-hover:text-primary">{{ biz.name }}</span>
              <span v-if="biz.deleted_at" class="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">Eliminado</span>
              <span v-else class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" :class="biz.active ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
                {{ biz.active ? 'Activo' : 'Suspendido' }}
              </span>
            </span>
            <span class="mt-0.5 block truncate text-[11px] text-text-muted">{{ biz.slug }} · creado {{ formatDate(biz.created_at) }}</span>
          </span>
        </router-link>

        <span class="w-36 shrink-0 truncate rounded-lg bg-bg-secondary px-2.5 py-1 text-center text-[11px] font-semibold text-text-secondary" :title="nicheLabel(nicheOf(biz))">
          {{ nicheLabel(nicheOf(biz)) }}
        </span>

        <div class="flex shrink-0 items-center gap-1.5">
          <router-link :to="`/superadmin/business/${biz.id}`"
            class="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text">
            Abrir
          </router-link>
          <template v-if="!biz.deleted_at">
            <button v-if="biz.active" type="button" :disabled="busyId === biz.id" title="El negocio y sus usuarios pierden el acceso hasta que lo reactives"
              class="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
              @click="emit('suspend', biz)">Suspender</button>
            <button v-else type="button" :disabled="busyId === biz.id"
              class="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-50"
              @click="emit('resume', biz)">Reactivar</button>
          </template>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { BuildingsIcon } from '@solar-icons/vue/linear'
import { formatDate } from '../../lib/formatters'
import { nicheOf, type ListedBusiness } from './businessFilters'

defineProps<{
  businesses: ListedBusiness[]
  nicheLabel: (niche: string) => string
  busyId?: string | null
  emptyTitle: string
  emptyHint: string
}>()

const emit = defineEmits<{
  (e: 'suspend', b: ListedBusiness): void
  (e: 'resume', b: ListedBusiness): void
}>()

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
</script>
