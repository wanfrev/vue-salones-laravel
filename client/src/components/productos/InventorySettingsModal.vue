<template>
  <ModalBase
    :is-open="isOpen"
    title="Configuración de Inventario"
    subtitle="Ajusta los porcentajes globales para tu tienda"
    icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    size="sm"
    :is-loading="isSaving"
    confirm-text="Guardar cambios"
    @close="close"
    @confirm="handleSubmit"
  >
    <div class="space-y-4">
      <p class="text-sm text-text-secondary">
        Estos porcentajes se usarán para calcular automáticamente el Precio 1 y Precio 2 cuando ingreses el costo unitario de un nuevo producto. (Ej: 50 = 50% de ganancia)
      </p>
      
      <div class="grid grid-cols-1 gap-4">
        <FormInput
          v-model.number="formData.product_price1_markup"
          label="Porcentaje Precio 1 (%)"
          type="number"
          placeholder="50"
          min="0"
          step="0.01"
        />
        <FormInput
          v-model.number="formData.product_price2_markup"
          label="Porcentaje Precio 2 (%)"
          type="number"
          placeholder="70"
          min="0"
          step="0.01"
        />
      </div>
    </div>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useBusinessStore } from '../../store/business'
import { useAuthStore } from '../../store/auth'
import { apiRequest } from '../../lib/api'
import ModalBase from '../common/ModalBase.vue'
import { FormInput } from '../forms'

const MODAL_ID = 'inventory-settings-modal'
const { isOpen, close } = useModal(MODAL_ID)
const { success, error: showError } = useNotification()
const businessStore = useBusinessStore()
const authStore = useAuthStore()

const isSaving = ref(false)

const formData = ref({
  product_price1_markup: 50,
  product_price2_markup: 70,
})

watch(isOpen, (open) => {
  if (open) {
    formData.value.product_price1_markup = businessStore.business?.product_price1_markup ?? 50
    formData.value.product_price2_markup = businessStore.business?.product_price2_markup ?? 70
  }
})

const handleSubmit = async () => {
  if (isSaving.value) return
  isSaving.value = true
  
  try {
    const payload = {
      product_price1_markup: Number(formData.value.product_price1_markup),
      product_price2_markup: Number(formData.value.product_price2_markup)
    }
    
    await apiRequest('PUT', `/api/businesses/${authStore.businessId}`, payload)
    
    // Update local store
    businessStore.updateBusiness(payload)
    
    success('Configuración guardada exitosamente')
    close()
  } catch (err: any) {
    console.error('Error saving settings', err)
    showError(err.message || 'Error al guardar configuración')
  } finally {
    isSaving.value = false
  }
}

const open = () => {
  useModal(MODAL_ID).open()
}

defineExpose({ open, close, isOpen })
</script>
