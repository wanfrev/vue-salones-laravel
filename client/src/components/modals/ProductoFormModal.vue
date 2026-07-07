<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar producto` : `Nuevo producto`"
    :subtitle="isEditing ? `Editando ${formData.name}` : 'Agrega un nuevo producto al catálogo'"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="lg"
    :is-loading="isSaving"
    :is-confirm-disabled="!isFormValid || isSaving"
    confirm-text="Guardar producto"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          v-model="formData.name"
          label="Nombre del producto"
          placeholder="Ej: Champú Keratina"
          required
          :error="errors.name"
        />
        <FormSelect
          v-if="!showingCustomCategory"
          v-model="formData.categoryId"
          label="Categoría"
          :options="categoryOptions"
          :error="errors.categoryId"
        />
        <div v-else class="flex gap-2">
          <FormInput
            v-model="newCategoryName"
            label="Categoría"
            placeholder="Escribe la categoría..."
            required
            class="flex-1"
          />
          <button
            type="button"
            class="mt-6 shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-text-muted transition-theme hover:bg-bg-secondary"
            @click="cancelCustomCategory"
          >
            Volver
          </button>
        </div>
      </div>

      <FormTextarea
        v-model="formData.description"
        label="Descripción"
        placeholder="Describe el producto..."
        :rows="2"
        :error="errors.description"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          v-model="formData.sku"
          label="SKU"
          placeholder="Ej: CHAMP-KER-001"
          :error="errors.sku"
        />
        <FormInput
          v-model="formData.barcode"
          label="Código de barras"
          placeholder="Ej: 7501234567890"
          :error="errors.barcode"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput
          v-model="formData.unit"
          label="Unidad de medida"
          placeholder="Ej: botella, unidad, litro"
          required
          :error="errors.unit"
        />
        <FormSelect
          v-model="formData.active"
          label="Estado"
          :options="statusOptions"
          required
          :error="errors.active"
        />
      </div>

      <FormToggle
        v-model="formData.isSellable"
        label="Vendible en POS"
        description="Disponible para venta desde el punto de venta"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormInput
          v-model.number="formData.unitCost"
          label="Costo unitario ($)"
          type="number"
          placeholder="0.00"
          required
          :error="errors.unitCost"
        />
        <FormInput
          v-model.number="formData.unitPrice"
          :label="formData.isSellable ? 'Precio de venta ($)' : 'Precio de venta ($) — opcional'"
          type="number"
          placeholder="0.00"
          :error="errors.unitPrice"
        />
        <FormInput
          v-model.number="formData.reorderPoint"
          label="Stock mínimo"
          type="number"
          placeholder="0"
          :error="errors.reorderPoint"
        />
        <FormInput
          v-if="!isEditing"
          v-model.number="formData.initialStock"
          label="Stock inicial"
          type="number"
          min="0"
          placeholder="0"
        />
      </div>
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { listProductCategories, createProductCategory, productosKeys } from '../../services/productosService'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { mapCategoryToOption } from '../../mappers/productosMapper'
import type { Producto, ProductoFormData } from '../../types/producto'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormSelect, FormTextarea, FormToggle } from '../forms'

const MODAL_ID = 'producto-form-modal'

const emit = defineEmits<{
  save: [producto: ProductoFormData & { id?: string }]
}>()

interface Props {
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false,
})

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const authStore = useAuthStore()
const businessStore = useBusinessStore()

const isEditing = computed(() => !!modalData.value?.producto)
const businessId = computed(() => authStore.businessId)
const branchId = computed(() => businessStore.currentBranchId)

const queryClient = useQueryClient?.() || null

const showingCustomCategory = ref(false)
const newCategoryName = ref('')

const { data: categoriesData } = useQuery({
  queryKey: computed(() => productosKeys.categories(businessId.value, branchId.value)),
  queryFn: () => listProductCategories(businessId.value!, branchId.value),
  enabled: computed(() => !!businessId.value),
})

const categoryOptions = computed(() => {
  const cats = categoriesData.value ?? []
  return [
    { value: '', label: 'Sin categoría' },
    ...cats.map(mapCategoryToOption),
    { value: '__new__', label: '+ Agregar nuevo' },
  ]
})

const cancelCustomCategory = () => {
  showingCustomCategory.value = false
  newCategoryName.value = ''
}

const statusOptions = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
]

const defaultFormData: ProductoFormData = {
  name: '',
  description: '',
  categoryId: '',
  sku: '',
  barcode: '',
  unit: 'unidad',
  unitCost: 0,
  unitPrice: 0,
  reorderPoint: 0,
  active: 'Activo',
  isSellable: false,
  initialStock: 0,
}

const formData = ref<ProductoFormData>({ ...defaultFormData })
const errors = ref<Partial<Record<keyof ProductoFormData, string>>>({})

const isFormValid = computed(() => {
  return formData.value.name.trim().length >= 2 &&
         formData.value.unit.trim().length > 0
})

watch(
  [isOpen, () => modalData.value?.producto],
  ([open, producto]) => {
    if (!open) return
    if (producto) {
      formData.value = {
        name: producto.name || '',
        description: producto.description || '',
        categoryId: producto.categoryId || '',
        sku: producto.sku || '',
        barcode: producto.barcode || '',
        unit: producto.unit || 'unidad',
        unitCost: producto.unitCost || 0,
        unitPrice: producto.unitPrice || 0,
        reorderPoint: producto.reorderPoint || 0,
        active: producto.status,
        isSellable: producto.isSellable ?? true,
        initialStock: 0,
      }
    } else {
      const ctx = modalData.value?.context
      const defaultSellable = ctx?.defaultSellable ?? false
      formData.value = { ...defaultFormData, isSellable: defaultSellable }
    }
    errors.value = {}
  },
  { immediate: true }
)

watch(
  () => formData.value.categoryId,
  (cat) => {
    if (cat === '__new__') {
      showingCustomCategory.value = true
      formData.value.categoryId = ''
    }
  }
)

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.name.trim() || formData.value.name.length < 2) {
    errors.value.name = 'El nombre debe tener al menos 2 caracteres'
  }
  if (!formData.value.unit.trim()) {
    errors.value.unit = 'La unidad de medida es requerida'
  }
  if (formData.value.unitPrice < 0) {
    errors.value.unitPrice = 'El precio no puede ser negativo'
  }
  if (formData.value.unitCost < 0) {
    errors.value.unitCost = 'El costo no puede ser negativo'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (props.isSaving) {
    console.warn('[ProductoFormModal] handleSubmit bloqueado: isSaving=true')
    return
  }

  if (!validateForm()) {
    showError('Por favor corrige los errores en el formulario')
    return
  }

  let categoryId = formData.value.categoryId
  if (showingCustomCategory.value && newCategoryName.value.trim()) {
    try {
      const newCat = await createProductCategory(businessId.value!, newCategoryName.value.trim(), branchId.value)
      categoryId = newCat.id
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: productosKeys.categories(businessId.value, branchId.value) }).catch(() => {})
      }
    } catch (err) {
      console.error('Error creating category:', err)
      showError('No se pudo crear la categoria. El producto se guardara sin categoria asignada.')
    }
  }

  const productoData: ProductoFormData & { id?: string } = {
    ...formData.value,
    categoryId,
  }

  if (modalData.value?.producto?.id) {
    productoData.id = modalData.value.producto.id
  }

  emit('save', productoData)
}

const open = (producto?: Producto, opts?: { defaultSellable?: boolean }) => {
  useModal(MODAL_ID).open({ producto, context: opts })
}

defineExpose({
  open,
  close,
  isOpen,
})
</script>
