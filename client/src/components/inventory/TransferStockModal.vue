<template>
  <ModalBase :is-open="isOpen" title="Transferir stock" subtitle="Mueve stock de una sucursal a otra"
    icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
    size="sm" confirm-text="Transferir" :is-confirm-disabled="!isValid" :is-loading="isLoading"
    @close="$emit('close')" @confirm="$emit('confirm')">
    <div class="space-y-4">
      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-sm font-medium text-text">{{ product?.name }}</p>
      </div>

      <FormDropdown
        v-model="fromBranchId"
        label="De sucursal"
        placeholder="Selecciona origen"
        :options="branchOptions"
        required
      />
      <FormDropdown
        v-model="toBranchId"
        label="A sucursal"
        placeholder="Selecciona destino"
        :options="toBranchOptions"
        required
      />

      <FormInput v-model.number="quantity" label="Cantidad a transferir" type="number" min="0" step="1" placeholder="0"
        prefix-icon="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      <FormInput v-model="notes" label="Notas" placeholder="Opcional"
        prefix-icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ModalBase } from '../common'
import { FormInput, FormDropdown } from '../forms'
import { useBusinessStore } from '../../store/business'
import type { Producto } from '../../types/producto'

const props = defineProps<{
  isOpen: boolean
  product: Producto | null
  isLoading?: boolean
}>()

defineEmits<{
  close: []
  confirm: []
}>()

const businessStore = useBusinessStore()

const fromBranchId = defineModel<string>('fromBranchId', { default: '' })
const toBranchId = defineModel<string>('toBranchId', { default: '' })
const quantity = defineModel<number>('quantity', { default: 0 })
const notes = defineModel<string>('notes', { default: '' })

const branchOptions = computed(() =>
  businessStore.branches.map(b => ({ value: b.id, label: b.name }))
)

const toBranchOptions = computed(() =>
  branchOptions.value.filter(o => o.value !== fromBranchId.value)
)

const isValid = computed(() =>
  !!fromBranchId.value && !!toBranchId.value && fromBranchId.value !== toBranchId.value && Number(quantity.value) > 0
)
</script>
