<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? 'Editar Requerimiento' : 'Nuevo Requerimiento'"
    :subtitle="isEditing ? 'Modificar el requerimiento seleccionado' : 'Registrar un producto faltante'"
    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    size="md"
    :is-loading="isLoading"
    :is-confirm-disabled="!isFormValid"
    :confirm-text="isEditing ? 'Guardar Cambios' : 'Crear Requerimiento'"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent class="space-y-4">
      <FormInput
        v-model="formData.name"
        label="Nombre del producto"
        placeholder="Ej. Tinte negro #1"
        required
      />
      <FormInput
        v-model="formData.recommended_quantity"
        label="Cantidad recomendada"
        placeholder="Ej. 10 cajas, 5 kg"
        required
      />
      <FormInput
        v-model="formData.recommended_brands"
        label="Marcas recomendadas (Opcional)"
        placeholder="Ej. L'Oreal, Wella"
      />
      <FormInput
        v-model.number="formData.guide_price"
        type="number"
        step="0.01"
        label="Precio Guía (Opcional)"
        placeholder="Ej. 15.50"
      />
      <div v-if="isEditing">
        <label class="block text-sm font-medium text-text-secondary mb-2">Estado</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            @click="formData.status = 'pending'"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition-all"
            :class="formData.status === 'pending' 
              ? 'border-warning bg-warning/20 text-warning shadow-sm' 
              : 'border-border bg-bg-secondary text-text hover:border-border-strong hover:bg-bg-secondary/80'"
          >
            Pendiente
          </button>
          <button
            type="button"
            @click="formData.status = 'purchased'"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition-all"
            :class="formData.status === 'purchased' 
              ? 'border-success bg-success/20 text-success shadow-sm' 
              : 'border-border bg-bg-secondary text-text hover:border-border-strong hover:bg-bg-secondary/80'"
          >
            Comprado
          </button>
          <button
            type="button"
            @click="formData.status = 'cancelled'"
            class="rounded-lg border px-3 py-2 text-sm font-semibold transition-all"
            :class="formData.status === 'cancelled' 
              ? 'border-danger bg-danger/20 text-danger shadow-sm' 
              : 'border-border bg-bg-secondary text-text hover:border-border-strong hover:bg-bg-secondary/80'"
          >
            Cancelado
          </button>
        </div>
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useRequirements } from '../../composables/inventory/useRequirements'
import type { Requirement } from '../../types/database'
import ModalBase from '../common/ModalBase.vue'
import { FormInput } from '../forms'

const MODAL_ID = 'requirement-form-modal'
const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const { createRequirement, updateRequirement } = useRequirements()

const isSubmitting = ref(false)
const isLoading = computed(() => isSubmitting.value || createRequirement.isPending.value || updateRequirement.isPending.value)
const isEditing = computed(() => !!modalData.value?.requirement)

const defaultFormData = {
  name: '',
  recommended_quantity: '',
  recommended_brands: '',
  guide_price: null as number | null,
  status: 'pending' as Requirement['status']
}

const formData = ref({ ...defaultFormData })

const isFormValid = computed(() => {
  return formData.value.name.trim().length > 0 && formData.value.recommended_quantity.trim().length > 0
})

watch(
  [isOpen, () => modalData.value?.requirement],
  ([open, requirement]) => {
    if (!open) return
    if (requirement) {
      formData.value = {
        name: requirement.name,
        recommended_quantity: requirement.recommended_quantity,
        recommended_brands: requirement.recommended_brands || '',
        guide_price: requirement.guide_price,
        status: requirement.status
      }
    } else {
      formData.value = { ...defaultFormData }
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  if (isLoading.value || !isFormValid.value) return
  isSubmitting.value = true
  
  try {
    const payload = { ...formData.value }
    if (payload.guide_price === null || payload.guide_price === undefined || (payload.guide_price as any) === '') {
      payload.guide_price = null
    }

    if (isEditing.value) {
      await updateRequirement.mutateAsync({ id: modalData.value.requirement.id, payload })
    } else {
      await createRequirement.mutateAsync(payload)
    }
    close()
  } catch (err) {
    showError(isEditing.value ? 'Error al actualizar el requerimiento' : 'Error al crear el requerimiento')
    console.error(err)
  } finally {
    isSubmitting.value = false
  }
}
</script>
