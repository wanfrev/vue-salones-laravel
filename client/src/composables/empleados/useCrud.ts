import { computed, ref, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { api as supabase } from '../../lib/api'
import { translateError } from '../../lib/errors'

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

  const invalidateAll = async () => {
    if (!businessId.value) return
    const key = queryKey(businessId.value, currentBranchId.value)
    const keys = [queryClient.invalidateQueries({ exact: false, queryKey: key })]
    for (const extra of extraInvalidations) {
      keys.push(queryClient.invalidateQueries({ exact: false, queryKey: extra(businessId.value, currentBranchId.value) }))
    }
    await Promise.allSettled(keys)
    await queryClient.refetchQueries({ exact: false, queryKey: key })
  }

  const saveMutation = useMutation({
    mutationFn: (formData: TForm & { id?: TId }) => {
      if (!businessId.value) throw new Error('No hay negocio activo')
      return saveFn(businessId.value, formData, currentBranchId.value)
    },
    onMutate: async (formData) => {
      const qKey = queryKey(businessId.value ?? '', currentBranchId.value)
      await queryClient.cancelQueries({ queryKey: qKey, exact: false })
      const previousQueries = queryClient.getQueriesData({ queryKey: qKey, exact: false })

      const { id, ...rest } = formData as any
      const optimistic = { ...rest, id: id ?? `temp-${Date.now()}` } as TData

      for (const [key, data] of previousQueries) {
        if (!Array.isArray(data)) continue
        if (id) {
          queryClient.setQueryData(key, data.map((item: any) =>
            item.id === id ? { ...item, ...rest } : item
          ))
        } else {
          queryClient.setQueryData(key, [optimistic, ...data])
        }
      }
      return { previousQueries }
    },
    onError: (err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      saveError.value = translateError(err)
      showError(saveError.value)
    },
    onSettled: async (_data, error) => {
      saveError.value = ''
      modalRef?.value?.close()
      if (!error) {
        success(`${entityName} guardado correctamente`)
      }
      await invalidateAll()
    },
  })

  const deleteMutation = deleteFn
    ? useMutation({
        mutationFn: (id: TId) => deleteFn(id),
        onSuccess: async () => {
          await invalidateAll()
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
