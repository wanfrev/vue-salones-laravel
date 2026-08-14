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

    <button v-for="v in vendedorasCtx.vendedoras.value" :key="v.id" type="button"
      class="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold uppercase transition-theme"
      :class="modelValue === v.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-secondary'"
      @click="emit('update:modelValue', v.id)">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold normal-case text-primary">
        {{ getInitials(v.name) }}
      </span>
      <span class="min-w-0 flex-1 truncate">Ventas {{ v.name }}</span>
      <span class="shrink-0 rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold normal-case text-text-muted">
        {{ v.leadCount }}
      </span>
    </button>

    <button type="button"
      class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm font-semibold text-text-muted transition-theme hover:border-primary hover:text-primary"
      @click="showNewModal = true">
      <AddCircleIcon class="h-4 w-4 shrink-0" />
      <span>Agregar vendedora</span>
    </button>

    <NuevaVendedoraModal v-if="showNewModal" :business-id="businessId" @close="showNewModal = false"
      @created="vendedorasCtx.refetch()" />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useVendedoras } from '../../composables/staffing/useVendedoras'
import { getInitials } from '../../lib/formatters'
import NuevaVendedoraModal from './NuevaVendedoraModal.vue'
import { UsersGroupRoundedIcon, AddCircleIcon } from '@solar-icons/vue/linear'

const props = defineProps<{
  businessId: string | null
  modelValue: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [id: string | null] }>()

const vendedorasCtx = useVendedoras(toRef(props, 'businessId'))
const showNewModal = ref(false)
</script>
