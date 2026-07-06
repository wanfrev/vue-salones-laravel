<template>
  <ModalBase
    :is-open="isOpen"
    title="Ajustar stock"
    subtitle="Agrega o reduce la cantidad disponible"
    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    size="sm"
    confirm-text="Guardar ajuste"
    :is-loading="isLoading"
    :is-confirm-disabled="quantity === 0 || isLoading"
    @close="$emit('close')"
    @confirm="$emit('confirm')"
  >
    <div class="space-y-4">
      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-sm font-medium text-text">{{ item?.productName }}</p>
        <p class="text-xs text-text-muted">Actual: {{ item?.quantity ?? 0 }}</p>
      </div>

      <FormInput
        v-model.number="quantity"
        label="Cantidad a ajustar"
        type="number"
        placeholder="Ej: 5 o -3"
        prefix-icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
      <p class="text-xs text-text-muted">Usa valores positivos para agregar stock, negativos para reducir.</p>
      <FormInput
        v-model="notes"
        label="Motivo del ajuste"
        placeholder="Ej: Compra nueva, producto dañado..."
        prefix-icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ModalBase } from '../common'
import { FormInput } from '../forms'
import type { InventarioItem } from '../../types/inventario'

defineProps<{
  isOpen: boolean
  item: InventarioItem | null
  isLoading?: boolean
}>()

const quantity = defineModel<number>('quantity', { default: 0 })
const notes = defineModel<string>('notes', { default: '' })

defineEmits<{
  close: []
  confirm: []
}>()
</script>