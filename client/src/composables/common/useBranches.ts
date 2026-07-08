import { ref, computed, type Ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { useBusinessStore } from '../../store/business'
import {
  branchesKeys,
  saveBranch,
  deleteBranch,
  type Branch,
  type BranchFormData,
} from '../../services/branchesService'

export function useBranches(businessId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const businessStore = useBusinessStore()

  const branches = computed(() => businessStore.branches)
  const isLoading = computed(() => businessStore.branchesLoading)

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const saveError = ref('')

  const form = ref<BranchFormData>({
    name: '',
    address: '',
    phone: '',
    isDefault: false,
  })

  const resetForm = () => {
    form.value = { name: '', address: '', phone: '', isDefault: false }
    editingId.value = null
    saveError.value = ''
  }

  const openNew = () => {
    resetForm()
    showModal.value = true
  }

  const openEdit = (branch: Branch) => {
    editingId.value = branch.id
    form.value = {
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      isDefault: branch.is_default,
    }
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    resetForm()
  }

  const saveMutation = useMutation({
    mutationFn: (params: BranchFormData & { id?: string }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveBranch(businessId.value, params)
    },
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: branchesKeys.all(businessId.value), exact: false }),
        businessId.value ? businessStore.loadBranches(businessId.value) : Promise.resolve(),
      ])
      success('Sucursal guardada correctamente')
      closeModal()
    },
    onError: (err) => {
      showError(translateError(err, 'Error al guardar la sucursal'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: branchesKeys.all(businessId.value), exact: false }),
        businessId.value ? businessStore.loadBranches(businessId.value) : Promise.resolve(),
      ])
      success('Sucursal eliminada')
    },
    onError: (err) => {
      showError(translateError(err, 'Error al eliminar la sucursal'))
    },
  })

  const handleSave = () => {
    if (!form.value.name.trim()) {
      saveError.value = 'El nombre es obligatorio'
      return
    }
    saveError.value = ''
    saveMutation.mutate({ ...form.value, id: editingId.value ?? undefined })
  }

  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id)
  }

  return {
    branches,
    isLoading,
    showModal,
    editingId,
    form,
    saveError,
    saveMutation,
    deleteMutation,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  }
}
