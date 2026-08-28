<template>
  <div class="rounded-xl border border-border bg-surface p-4 space-y-3">
    <div>
      <p class="text-sm font-semibold text-text">Acceso al módulo</p>
      <p class="text-xs text-text-muted">Marca qué vendedores pueden entrar a Spreadsheet, además de ti.</p>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-sm text-text-muted">Cargando...</div>

    <p v-else-if="vendedoras.length === 0" class="py-6 text-center text-sm text-text-muted">
      No hay vendedores registrados todavía. Créalos desde CRM.
    </p>

    <div v-else class="divide-y divide-border">
      <label v-for="v in vendedoras" :key="v.id"
        class="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-sm">
        <span class="text-text">{{ v.name }}</span>
        <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            class="peer sr-only"
            :checked="v.canAccessSpreadsheet"
            :disabled="pendingId === v.id"
            @change="toggleAccess(v, ($event.target as HTMLInputElement).checked)"
          />
          <span
            :class="[
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-theme peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-1 peer-disabled:opacity-50',
              v.canAccessSpreadsheet ? 'border-primary bg-primary' : 'border-border bg-surface hover:border-primary/50'
            ]"
          >
            <svg v-if="v.canAccessSpreadsheet" viewBox="0 0 16 16" class="h-3 w-3 text-text-inverse" fill="none">
              <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../../composables/common/useNotification'
import { translateError } from '../../lib/errors'
import { adminUpdateEmployee } from '../../services/adminService'
import {
  listSpreadsheetVendedoras, staffingSpreadsheetKeys, type SpreadsheetVendedoraRow,
} from '../../services/staffing/staffingSpreadsheetService'

const props = defineProps<{ businessId: string | null }>()

const queryClient = useQueryClient()
const { success, error: showError } = useNotification()
const pendingId = ref<string | null>(null)

const queryKey = computed(() => staffingSpreadsheetKeys.vendedoras(props.businessId))

const { data, isLoading } = useQuery({
  queryKey,
  queryFn: () => listSpreadsheetVendedoras(),
  enabled: computed(() => !!props.businessId),
})

const vendedoras = computed(() => data.value ?? [])

const toggleAccess = async (vendedora: SpreadsheetVendedoraRow, checked: boolean) => {
  pendingId.value = vendedora.id
  try {
    await adminUpdateEmployee(vendedora.id, { can_access_spreadsheet: checked })
    await queryClient.invalidateQueries({ queryKey: queryKey.value, exact: false })
    success(checked ? `${vendedora.name} ahora tiene acceso` : `Acceso quitado a ${vendedora.name}`)
  } catch (err) {
    showError(translateError(err))
  } finally {
    pendingId.value = null
  }
}
</script>
