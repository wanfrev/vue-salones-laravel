<template>
  <div class="w-full shrink-0 rounded-xl border border-border bg-surface p-2 sm:w-64">
    <button type="button"
      class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-theme"
      :class="modelValue === null ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary'"
      @click="emit('update:modelValue', null)">
      <UsersGroupRoundedIcon class="h-4 w-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate">Todos los leads</span>
    </button>

    <div v-if="vendedorasCtx.isLoading.value" class="px-3 py-4 text-center text-xs text-text-muted">
      Cargando...
    </div>

    <div v-for="v in vendedorasCtx.vendedoras.value" :key="v.id"
      class="mb-1 flex w-full items-center gap-1 rounded-lg text-sm font-semibold uppercase transition-theme"
      :class="modelValue === v.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary'">
      <button type="button" class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
        @click="emit('update:modelValue', v.id)">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold normal-case text-primary">
          {{ getInitials(v.name) }}
        </span>
        <span class="min-w-0 flex-1 truncate">Ventas {{ v.name }}</span>
        <span class="shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold normal-case text-text-muted">
          {{ v.leadCount }}
        </span>
      </button>
      <button type="button" class="shrink-0 rounded-md p-1.5 normal-case text-text-muted transition-theme hover:bg-bg-secondary hover:text-primary"
        title="Editar vendedor" @click="editingVendedor = v">
        <PenIcon class="h-3.5 w-3.5" />
      </button>
    </div>

    <button type="button"
      class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm font-semibold text-text-muted transition-theme hover:border-primary hover:text-primary"
      @click="showNewModal = true">
      <AddCircleIcon class="h-4 w-4 shrink-0" />
      <span>Agregar vendedor</span>
    </button>

    <NuevaVendedoraModal v-if="showNewModal" :business-id="businessId" @close="showNewModal = false"
      @created="vendedorasCtx.refetch()" />

    <EditarVendedorModal v-if="editingVendedor" :vendedor="editingVendedor" @close="editingVendedor = null"
      @updated="vendedorasCtx.refetch()" @deleted="handleVendedorDeleted" />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useVendedoras } from '../../composables/staffing/useVendedoras'
import { getInitials } from '../../lib/formatters'
import NuevaVendedoraModal from './NuevaVendedoraModal.vue'
import EditarVendedorModal from './EditarVendedorModal.vue'
import { UsersGroupRoundedIcon, AddCircleIcon, PenIcon } from '@solar-icons/vue/linear'
import type { VendedoraRow } from '../../services/leadsService'

const props = defineProps<{
  businessId: string | null
  modelValue: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const vendedorasCtx = useVendedoras(toRef(props, 'businessId'))
const showNewModal = ref(false)
const editingVendedor = ref<VendedoraRow | null>(null)

const handleVendedorDeleted = () => {
  if (props.modelValue === editingVendedor.value?.id) emit('update:modelValue', null)
  vendedorasCtx.refetch()
}
</script>
