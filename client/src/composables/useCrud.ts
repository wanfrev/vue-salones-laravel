import { computed, ref, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from './useNotification'
import { api as supabase } from '../lib/api'
import { translateError } from '../lib/errors'

export interface UseCrudOptions<TData, TForm, TId = string> {
  businessId: Ref<string | null>
  branchId?: Ref<string | null>
  queryKey: (businessId: string, branchId?: string | null) => readonly any[]
  queryFn: (businessId: string, branchId?: string | null) => Promise<TData[]>
  saveFn: (businessId: string, data: TForm & { id?: TId }, branchId?: string | null) => Promise<TData | void>
  entityName?: string
  deleteFn?: (id: TId) => Promise<void>
  extraInvalidations?: ((businessId: string, branchId?: string | null) => readonly any[])[]
  modalRef?: Ref<{ close: () => void } | null>
  deleteConfirmMessage?: (entity: TData) => string
}

export function useCrud<TData, TForm, TId = string>(options: UseCrudOptions<TData, TForm, TId>) {
  const {
    businessId,
    branchId,
    queryKey,
    queryFn,
    saveFn,
    entityName = 'registro',
    deleteFn,
    extraInvalidations = [],
    modalRef,
  } = options

  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const currentBranchId = computed(() => branchId?.value ?? null)

  const { data, isLoading } = useQuery({
    queryKey: computed(() => queryKey(businessId.value ?? '', currentBranchId.value)),
    queryFn: () => queryFn(businessId.value!, currentBranchId.value),
    enabled: computed(() => !!businessId.value),
  })

  const items = computed<TData[]>(() => data.value ?? [])

  const invalidateAll = () => {
    if (!businessId.value) return
    const keys = [queryClient.invalidateQueries({ exact: false, queryKey: queryKey(businessId.value, currentBranchId.value) })]
    for (const extra of extraInvalidations) {
      keys.push(queryClient.invalidateQueries({ exact: false, queryKey: extra(businessId.value, currentBranchId.value) }))
    }
    Promise.allSettled(keys)
  }

  const saveMutation = useMutation({
    mutationFn: (formData: TForm & { id?: TId }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveFn(businessId.value, formData, currentBranchId.value)
    },
    onSuccess: () => {
      saveError.value = ''
      invalidateAll()
      modalRef?.value?.close()
      success(`${entityName} guardado correctamente`)
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = deleteFn
    ? useMutation({
        mutationFn: (id: TId) => deleteFn(id),
        onSuccess: () => {
          invalidateAll()
          modalRef?.value?.close()
          success(`${entityName} eliminado correctamente`)
        },
        onError: (err) => {
          saveError.value = translateError(err)
          showError(saveError.value)
        },
      })
    : null

  const handleSave = async (formData: TForm & { id?: TId }) => {
    saveError.value = ''
    try {
      await supabase.auth.getSession()
    } catch {
      // Proceed anyway — the mutation will trigger its own token check
    }
    try {
      await saveMutation.mutateAsync(formData)
    } catch {
      // Error handled by onError callback + saveError ref
    }
  }

  const handleDelete = (id: TId) => {
    if (!deleteMutation) return
    deleteMutation.mutate(id)
  }

  return {
    items,
    isLoading,
    saveMutation,
    saveError,
    deleteMutation,
    handleSave,
    handleDelete,
    isSaving: computed(() => saveMutation.isPending.value),
    invalidateAll,
  }
}
