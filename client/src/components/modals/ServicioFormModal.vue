<template>
  <ModalBase
    :is-open="isOpen"
    :title="isEditing ? `Editar ${t.service}` : `Nuevo ${t.service}`"
    :subtitle="isEditing ? `Editando ${formData.name}` : `Agrega un nuevo ${t.service.toLowerCase()} al catálogo`"
    :icon="isEditing ? 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' : 'M12 6v6m0 0v6m0-6h6m-6 0H6'"
    size="md"
    :is-loading="isSaving"
    :is-confirm-disabled="!isFormValid || isSaving"
    :confirm-text="`Guardar ${t.service}`"
    @close="close"
    @confirm="handleSubmit"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Nombre -->
      <FormInput
        v-model="formData.name"
        label="Nombre del servicio"
        :placeholder="serviceNamePlaceholder"
        required
        prefix-icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        :error="errors.name"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Categoría -->
        <FormSelect
          v-if="!showingCustomCategory"
          v-model="formData.category"
          label="Categoría"
          :options="categoryOptions"
          required
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
        <FormSelect
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
    </form>
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useModal } from '../../composables/common/useModal'
import { useNotification } from '../../composables/common/useNotification'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { addBusinessCategory } from '../../services/equipoService'
import type { Servicio, ServicioFormData } from '../../types/servicio'
import ModalBase from '../common/ModalBase.vue'
import { FormInput, FormSelect, FormTextarea } from '../forms'

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
const authStore = useAuthStore()
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

const NICHE_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  salon: [
    { value: 'corte', label: 'Corte de Cabello' },
    { value: 'color', label: 'Coloración' },
    { value: 'manos', label: 'Manos & Pies' },
    { value: 'tratamientos', label: 'Tratamientos' },
    { value: 'barberia', label: 'Barbería' },
    { value: 'maquillaje', label: 'Maquillaje' },
    { value: 'otros', label: 'Otros' },
  ],
  barberia: [
    { value: 'corte', label: 'Corte de Cabello' },
    { value: 'barba', label: 'Barba & Bigote' },
    { value: 'arreglo', label: 'Arreglo de Cabello' },
    { value: 'tratamientos', label: 'Tratamientos' },
    { value: 'otros', label: 'Otros' },
  ],
  spa: [
    { value: 'masajes', label: 'Masajes' },
    { value: 'faciales', label: 'Faciales' },
    { value: 'corporales', label: 'Tratamientos Corporales' },
    { value: 'depilacion', label: 'Depilación' },
    { value: 'otros', label: 'Otros' },
  ],
  dog_spa: [
    { value: 'baño', label: 'Baño & Peluquería' },
    { value: 'corte', label: 'Corte & Estilo' },
    { value: 'veterinario', label: 'Servicios Veterinarios' },
    { value: 'spa', label: 'Spa & Relax' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'otros', label: 'Otros' },
  ],
  spa_perros: [
    { value: 'baño', label: 'Baño & Peluquería' },
    { value: 'corte', label: 'Corte & Estilo' },
    { value: 'veterinario', label: 'Servicios Veterinarios' },
    { value: 'spa', label: 'Spa & Relax' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'otros', label: 'Otros' },
  ],
  vet: [
    { value: 'baño', label: 'Baño & Peluquería' },
    { value: 'corte', label: 'Corte & Estilo' },
    { value: 'veterinario', label: 'Servicios Veterinarios' },
    { value: 'spa', label: 'Spa & Relax' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'otros', label: 'Otros' },
  ],
  nail_bar: [
    { value: 'manos', label: 'Manos' },
    { value: 'pies', label: 'Pies' },
    { value: 'disenos', label: 'Diseños' },
    { value: 'tratamientos', label: 'Tratamientos' },
    { value: 'otros', label: 'Otros' },
  ],
  centro_estetico: [
    { value: 'faciales', label: 'Faciales' },
    { value: 'corporales', label: 'Tratamientos Corporales' },
    { value: 'depilacion', label: 'Depilación' },
    { value: 'maquillaje', label: 'Maquillaje' },
    { value: 'otros', label: 'Otros' },
  ],
}

const showingCustomCategory = ref(false)
const categoriesVersion = ref(0)

watch(isOpen, (open) => {
  if (open) categoriesVersion.value++
})

const categoryOptions = computed(() => {
  categoriesVersion.value
  const bizCats = businessStore.serviceCategories
  const items = bizCats.length > 0
    ? bizCats.map((c: string) => ({ value: c, label: c }))
    : (NICHE_CATEGORIES[nicheType.value] || NICHE_CATEGORIES.salon)
  items.push({ value: '__new__', label: '+ Agregar nuevo' })
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

const defaultCategory = computed(() => {
  const cats = categoryOptions.value
  return cats.length > 0 ? cats[0].value : 'corte'
})

const defaultFormData: ServicioFormData = {
  name: '',
  description: '',
  price: 0,
  duration: 30,
  status: 'Activo',
  category: 'corte',
}

const formData = ref<ServicioFormData>({ ...defaultFormData })
const errors = ref<Partial<Record<keyof ServicioFormData, string>>>({})

const isFormValid = computed(() => {
  return formData.value.name.trim().length >= 2 && 
         formData.value.price > 0 && 
         formData.value.duration > 0
})

watch(isOpen, (open) => {
  if (open) errors.value = {}
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

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.name.trim() || formData.value.name.length < 2) {
    errors.value.name = 'El nombre debe tener al menos 2 caracteres'
  }

  if (formData.value.price <= 0) {
    errors.value.price = 'El precio debe ser mayor a 0'
  }

  if (formData.value.duration <= 0) {
    errors.value.duration = 'La duración debe ser mayor a 0 minutos'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (props.isSaving) return

  if (!validateForm()) {
    showError('Por favor corrige los errores en el formulario')
    return
  }

  const category = formData.value.category.trim()

  const businessId = authStore.businessId
  const bizCats = businessStore.serviceCategories
  if (businessId && category && !bizCats.includes(category)) {
    try {
      const updated = await addBusinessCategory(businessId, category)
      businessStore.updateBusiness({ service_categories: updated })
    } catch (err) {
      console.error('Error persisting category:', err)
    }
  }

  const servicioData: ServicioFormData & { id?: string } = {
    ...formData.value,
    category,
  }

  if (modalData.value?.servicio?.id) {
    servicioData.id = modalData.value.servicio.id
  }

  emit('save', servicioData)
}

const open = (servicio?: Servicio) => {
  useModal(MODAL_ID).open({ servicio })
  if (servicio) {
    formData.value = {
      name: servicio.name || '',
      description: servicio.description || '',
      price: servicio.price || 0,
      duration: servicio.duration || 30,
      status: servicio.status || 'Activo',
      category: servicio.category || 'corte',
    }
  } else {
    formData.value = { ...defaultFormData, category: defaultCategory.value }
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
