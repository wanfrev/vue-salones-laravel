<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.service}` : `Nuevo ${t.service}`"
    :subtitle="isEditing ? `Editando ${formData.name}` : `Agrega un nuevo ${t.service.toLowerCase()} al catálogo`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="lg"
    :is-loading="isSaving"
    :is-confirm-disabled="!isFormValid || isSaving"
    :confirm-text="`Guardar ${t.service}`"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent class="space-y-4">
      <!-- Nombre -->
      <FormInput
        v-model="formData.name"
        label="Nombre del servicio"
        :placeholder="serviceNamePlaceholder"
        required
        prefix-icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
         :error="errors.name"
          @blur="handleBlur('name')"
       />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Categoría -->
        <FormDropdown
          v-if="!showingCustomCategory"
          v-model="formData.category"
          label="Categoría"
          placeholder="Seleccionar categoría..."
          :options="categoryOptions"
          required
          searchable
          :error="errors.category"
        />
        <div v-else class="flex gap-2">
          <FormInput
            v-model="formData.category"
            label="Categoría"
            placeholder="Escribe la categoría..."
            required
            :error="errors.category"
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

        <!-- Estado -->
        <FormDropdown
          v-model="formData.status"
          label="Estado"
          :options="statusOptions"
          required
          :error="errors.status"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Precio -->
        <FormInput
          v-model.number="formData.price"
          label="Precio ($)"
          type="number"
          placeholder="0.00"
          required
          prefix-icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          :error="errors.price"
          @blur="handleBlur('price')"
        />

        <!-- Duración -->
        <FormInput
          v-model.number="formData.duration"
          label="Duración (minutos)"
          type="number"
          placeholder="30"
          required
          prefix-icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          :error="errors.duration"
          @blur="handleBlur('duration')"
        />
      </div>

      <!-- Descripción -->
      <FormTextarea
        v-model="formData.description"
        label="Descripción"
        :placeholder="descriptionPlaceholder"
        :rows="3"
        :error="errors.description"
      />

      <!-- Comisión Fija -->
      <div class="rounded-lg border border-border p-4">
        <label class="flex items-center space-x-2 text-sm font-medium text-text-primary cursor-pointer">
          <input type="checkbox" v-model="formData.is_fixed_commission" class="rounded border-border text-primary focus:ring-primary" />
          <span>Comisión fija por servicio (Monto en vez de porcentaje)</span>
        </label>
        <p class="mt-1 text-xs text-text-muted ml-6">
          Al activar esta opción, los empleados y asistentes que realicen este servicio ganarán un monto de dinero exacto, ignorando su porcentaje de comisión habitual.
        </p>
        
        <div v-if="formData.is_fixed_commission" class="mt-4 ml-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            v-model.number="formData.fixed_commission_amount"
            label="Monto para el empleado ($)"
            type="number"
            placeholder="0.00"
            prefix-icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <FormInput
            v-model.number="formData.fixed_commission_assistant_amount"
            label="Monto para el asistente ($)"
            type="number"
            placeholder="0.00"
            prefix-icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </div>
      </div>

      <!-- Insumos Consumibles del Inventario (Múltiples Productos) -->
      <div class="rounded-lg border border-border p-4 space-y-3">
        <label class="flex items-center space-x-2 text-sm font-medium text-text-primary cursor-pointer">
          <input type="checkbox" v-model="hasLinkedProduct" @change="onToggleHasLinkedProduct" class="rounded border-border text-primary focus:ring-primary" />
          <span>Vincular a productos de inventario (Insumos consumibles)</span>
        </label>
        <p class="text-xs text-text-muted ml-6">
          Al cobrar este servicio en el punto de venta, se descontará automáticamente del inventario la cantidad especificada de cada producto.
        </p>
        
        <div v-if="hasLinkedProduct" class="mt-4 space-y-3">
          <div
            v-for="(item, index) in linkedProductsList"
            :key="index"
            class="p-3 rounded-xl border border-border/70 bg-bg-secondary/30 space-y-3 relative"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-text-secondary">Insumo #{{ index + 1 }}</span>
              <button
                type="button"
                @click="removeLinkedProductRow(index)"
                class="text-text-muted hover:text-danger p-1 rounded transition-colors"
                title="Eliminar insumo"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div :class="getProductVariants(item.product_id).length > 0 ? 'sm:col-span-5' : 'sm:col-span-8'">
                <FormDropdown
                  v-model="item.product_id"
                  label="Producto"
                  placeholder="Seleccionar producto..."
                  :options="productOptions"
                  searchable
                />
              </div>

              <div v-if="getProductVariants(item.product_id).length > 0" class="sm:col-span-4">
                <FormDropdown
                  v-model="item.variant_id"
                  label="Variante"
                  placeholder="Sin variante"
                  :options="getVariantOptions(item.product_id)"
                />
              </div>

              <div :class="getProductVariants(item.product_id).length > 0 ? 'sm:col-span-3' : 'sm:col-span-4'">
                <FormInput
                  v-model.number="item.quantity"
                  label="Cantidad"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="addLinkedProductRow"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-light hover:bg-primary-hover/20 rounded-lg transition-colors"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar otro insumo
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
import { useBusinessStore } from '../../store/business'
import { getEntityServiceCategories } from '../../services/serviciosService'
import { listProductos } from '../../services/productosService'
import { useFormValidation } from '../../composables/common/useFormValidation'
import { servicioFormSchema } from '../../lib/validation'
import type { Servicio, ServicioFormData, LinkedProductItem } from '../../types/servicio'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormDropdown, FormTextarea } from '../forms'

const MODAL_ID = 'servicio-form-modal'

const emit = defineEmits<{
  save: [servicio: ServicioFormData & { id?: string }]
}>()

interface Props {
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false,
})

const { isOpen, modalData, close } = useModal(MODAL_ID)
const { error: showError } = useNotification()
const businessStore = useBusinessStore()

const t = computed(() => businessStore.terminology)
const nicheType = computed(() => businessStore.nicheType)

const isEditing = computed(() => !!modalData.value?.servicio)

const serviceNamePlaceholder = computed(() => {
  const map: Record<string, string> = {
    salon: 'Ej: Corte de mujer',
    barberia: 'Ej: Corte de hombre',
    spa: 'Ej: Masaje corporal',
    dog_spa: 'Ej: Baño para perro',
    spa_perros: 'Ej: Baño para perro',
    vet: 'Ej: Consulta general',
    nail_bar: 'Ej: Manicure',
    centro_estetico: 'Ej: Limpieza facial',
  }
  return map[nicheType.value] || 'Ej: Corte Mujer'
})

const descriptionPlaceholder = computed(() => {
  const map: Record<string, string> = {
    salon: 'Técnicas, productos y duración del servicio...',
    barberia: 'Técnicas, productos y detalles del corte...',
    spa: 'Beneficios, productos y duración del tratamiento...',
    dog_spa: 'Productos, cuidados y raza recomendada...',
    spa_perros: 'Productos, cuidados y raza recomendada...',
    vet: 'Procedimiento, medicación y recomendaciones...',
    nail_bar: 'Diseños, productos y técnicas utilizadas...',
    centro_estetico: 'Productos, cuidados y beneficios del tratamiento...',
  }
  return map[nicheType.value] || 'Describe el servicio, incluye detalles importantes...'
})

const showingCustomCategory = ref(false)
const categoriesVersion = ref(0)
const dbCategories = ref<string[]>([])

const hasLinkedProduct = ref(false)
const availableProducts = ref<any[]>([])
const linkedProductsList = ref<{ product_id: string; variant_id: string | null; quantity: number }[]>([])

const productOptions = computed(() => {
  return availableProducts.value.map(p => ({
    value: p.id,
    label: p.name
  }))
})

const onToggleHasLinkedProduct = () => {
  if (hasLinkedProduct.value && linkedProductsList.value.length === 0) {
    addLinkedProductRow()
  }
}

const addLinkedProductRow = () => {
  linkedProductsList.value.push({ product_id: '', variant_id: null, quantity: 1 })
}

const removeLinkedProductRow = (index: number) => {
  linkedProductsList.value.splice(index, 1)
  if (linkedProductsList.value.length === 0) {
    hasLinkedProduct.value = false
  }
}

const getProductVariants = (productId: string) => {
  if (!productId) return []
  const prod = availableProducts.value.find(p => p.id === productId)
  return prod?.variants || prod?.product_variants || []
}

const getVariantOptions = (productId: string) => {
  const variants = getProductVariants(productId)
  return [
    { value: '', label: 'Sin variante' },
    ...variants.map((v: any) => ({
      value: v.id,
      label: v.name || v.sku || 'Variante'
    }))
  ]
}

watch(isOpen, async (open) => {
  if (open) {
    categoriesVersion.value++
    const bizId = businessStore.business?.id
    const branchId = businessStore.currentBranchId
    if (bizId) {
      try {
        const [cats, prods] = await Promise.all([
          getEntityServiceCategories(bizId, branchId ?? null),
          listProductos(bizId, branchId ?? null)
        ])
        dbCategories.value = cats
        availableProducts.value = prods.filter(p => p.status === 'Activo')
      } catch {
        dbCategories.value = []
        availableProducts.value = []
      }
    }
  }
})

const categoryOptions = computed(() => {
  categoriesVersion.value
  const rawBizCats = dbCategories.value.length > 0
    ? dbCategories.value
    : businessStore.serviceCategories
  const items: { value: string; label: string }[] = [{ value: '__new__', label: '+ Crear nueva categoría' }]
  for (const c of rawBizCats) {
    const name = typeof c === 'string' ? c : (c as any)?.name ?? ''
    if (name) items.push({ value: name, label: name })
  }
  return items
})

const cancelCustomCategory = () => {
  showingCustomCategory.value = false
  formData.value.category = ''
}

const statusOptions = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
]

const defaultFormData: ServicioFormData = {
  name: '',
  description: '',
  price: 0,
  duration: 30,
  status: 'Activo',
  category: '',
  is_fixed_commission: false,
  fixed_commission_amount: 0,
  fixed_commission_assistant_amount: 0,
  linked_product_id: null,
  linked_variant_id: null,
  linked_products: [],
}

const formData = ref<ServicioFormData>({ ...defaultFormData })
const { errors, isValid, validate, clearErrors, handleBlur } = useFormValidation(servicioFormSchema as any, formData) as any as ReturnType<typeof useFormValidation>

const isFormValid = computed(() => isValid.value && formData.value.name.trim().length >= 2 && formData.value.price > 0 && formData.value.duration > 0)

watch(isOpen, (open) => {
  if (open) clearErrors()
})

watch(
  () => formData.value.category,
  (cat) => {
    if (cat === '__new__') {
      showingCustomCategory.value = true
      formData.value.category = ''
    }
  }
)

const handleSubmit = async () => {
  if (props.isSaving) return

  if (!validate()) return

  const category = formData.value.category.trim()

  const validLinkedProducts: LinkedProductItem[] = hasLinkedProduct.value
    ? linkedProductsList.value
        .filter(item => !!item.product_id)
        .map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: Math.max(0.01, Number(item.quantity) || 1),
        }))
    : []

  const firstLinked = validLinkedProducts.length > 0 ? validLinkedProducts[0] : null

  const servicioData: ServicioFormData & { id?: string } = {
    ...formData.value,
    category,
    linked_products: validLinkedProducts,
    linked_product_id: firstLinked ? firstLinked.product_id : null,
    linked_variant_id: firstLinked ? firstLinked.variant_id : null,
  }

  if (modalData.value?.servicio?.id) {
    servicioData.id = modalData.value.servicio.id
  }

  emit('save', servicioData)
}

const open = (servicio?: Servicio, branchId?: string) => {
  useModal(MODAL_ID).open({ servicio, branchId })
  if (servicio) {
    const s = servicio as any
    formData.value = {
      name: s.name || '',
      description: s.description || '',
      price: s.price || 0,
      duration: s.duration || 30,
      status: s.status || 'Activo',
      category: s.category || '',
      linked_product_id: s.linked_product_id ?? null,
      linked_variant_id: s.linked_variant_id ?? null,
      linked_products: s.linked_products ?? [],
      is_fixed_commission: s.is_fixed_commission ?? false,
      fixed_commission_amount: s.fixed_commission_amount ?? 0,
      fixed_commission_assistant_amount: s.fixed_commission_assistant_amount ?? 0,
    }

    const rawLinked = s.linked_products ?? []
    if (Array.isArray(rawLinked) && rawLinked.length > 0) {
      linkedProductsList.value = rawLinked.map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: Number(item.quantity ?? 1),
      }))
      hasLinkedProduct.value = true
    } else if (s.linked_product_id) {
      linkedProductsList.value = [{
        product_id: s.linked_product_id,
        variant_id: s.linked_variant_id ?? null,
        quantity: 1,
      }]
      hasLinkedProduct.value = true
    } else {
      linkedProductsList.value = []
      hasLinkedProduct.value = false
    }
  } else {
    const firstRealCategory = categoryOptions.value.find(c => c.value !== '__new__')?.value ?? ''
    formData.value = { ...defaultFormData, category: firstRealCategory }
    linkedProductsList.value = []
    hasLinkedProduct.value = false
    showingCustomCategory.value = false
  }
  errors.value = {}
}

defineExpose({
  open,
  close,
  isOpen,
})
</script>
