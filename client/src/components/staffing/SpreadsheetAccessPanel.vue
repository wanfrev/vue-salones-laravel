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
        class="flex items-center justify-between gap-3 py-2.5 text-sm">
        <span class="text-text">{{ v.name }}</span>
        <input
          type="checkbox"
          class="rounded border-border"
          :checked="v.canAccessSpreadsheet"
          :disabled="pendingId === v.id"
          @change="toggleAccess(v, ($event.target as HTMLInputElement).checked)"
        />
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
