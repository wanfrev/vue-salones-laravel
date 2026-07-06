<template>
  <ModalBase
    :is-open="isOpen"
    title="Registrar venta"
    subtitle="Descuenta del inventario por venta al cliente"
    icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
    size="sm"
    confirm-text="Registrar venta"
    :is-confirm-disabled="saleQuantity <= 0"
    :is-loading="isSaving"
    @close="$emit('close')"
    @confirm="handleConfirm"
  >
    <div class="space-y-4">
      <div class="rounded-lg bg-bg-secondary p-3">
        <p class="text-sm font-medium text-text">{{ item?.productName }}</p>
        <p v-if="item?.variantName" class="text-xs text-text-muted">{{ item.variantName }}</p>
        <p class="text-xs text-text-muted">Disponible: {{ item?.availableQty }}</p>
      </div>
      <FormInput
        v-model.number="saleQuantity"
        label="Cantidad vendida"
        type="number"
        min="1"
        :max="item?.availableQty ?? 1"
        placeholder="1"
        prefix-icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
      <FormInput
        v-model.number="saleUnitPrice"
        label="Precio unitario ($)"
        type="number"
        min="0"
        step="0.01"
        :placeholder="String(item?.unitPrice ?? '0.00')"
        prefix-icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <FormInput
        v-model="saleNotes"
        label="Notas"
        placeholder="Opcional"
        prefix-icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
      <div v-if="saleTotalUsd > 0" class="rounded-lg bg-bg-secondary p-3 text-center">
        <p class="text-sm text-text-muted">Total de la venta</p>
        <p class="text-xl font-bold text-text">{{ formatUSD(saleTotalUsd) }}</p>
        <p class="mt-1 text-sm font-medium text-text-secondary">{{ formatVES(saleTotalUsd) }}</p>
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { ModalBase } from '../common'
import { FormInput } from '../forms'
import { useAuth } from '../../composables/useAuth'
import { useCurrency } from '../../composables/useCurrency'
import { useNotification } from '../../composables/useNotification'
import { sellProduct } from '../../services/inventarioService'
import type { InventarioItem } from '../../types/inventario'

const props = defineProps<{
  isOpen: boolean
  item: InventarioItem | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const { authStore } = useAuth()
const { formatUSD, formatVES, exchangeRate } = useCurrency()
const { success, error: showError } = useNotification()
const businessId = authStore.businessId

const saleQuantity = ref(0)
const saleUnitPrice = ref(0)
const saleNotes = ref('')
const saleTotalUsd = computed(() => {
  if (saleQuantity.value <= 0 || saleUnitPrice.value <= 0) return 0
  return saleQuantity.value * saleUnitPrice.value
})

const saleMutation = useMutation({
  mutationFn: (params: { productId: string; quantity: number; notes: string; unitPrice: number; variantId?: string | null }) =>
    sellProduct(businessId!, params.productId, params.quantity, params.notes, params.variantId, params.unitPrice, exchangeRate.value),
  onSuccess: () => {
    emit('saved')
    doClose()
    success('Venta registrada correctamente')
  },
  onError: (err) => {
    showError(err instanceof Error ? err.message : 'Error al registrar la venta')
  },
})

const isSaving = saleMutation.isPending

const handleConfirm = async () => {
  if (!props.item || saleQuantity.value <= 0) return
  if (saleQuantity.value > props.item.availableQty) {
    showError('Stock insuficiente para esta venta')
    return
  }
  await saleMutation.mutateAsync({
    productId: props.item.productId,
    quantity: saleQuantity.value,
    notes: saleNotes.value,
    unitPrice: saleUnitPrice.value,
    variantId: props.item.variantId,
  })
}

watch(() => props.item, (item) => {
  if (item) {
    saleQuantity.value = 0
    saleUnitPrice.value = item.unitPrice
    saleNotes.value = ''
  }
})

const doClose = () => {
  saleQuantity.value = 0
  saleUnitPrice.value = 0
  saleNotes.value = ''
  emit('close')
}
</script>