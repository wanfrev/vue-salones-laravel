import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '../../store/auth'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import { listBanks, createBank, updateBank, deleteBank, banksKeys, type Bank } from '../../services/banksService'

export function useBanks() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const { success, error: showError } = useNotification()

  const banksQuery = useQuery({
    queryKey: computed(() => banksKeys.all(authStore.businessId)),
    queryFn: listBanks,
    enabled: computed(() => !!authStore.businessId),
    staleTime: 30000,
  })

  const banks = computed<Bank[]>(() => banksQuery.data.value ?? [])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: banksKeys.all(authStore.businessId), exact: false })

  const createMutation = useMutation({
    mutationFn: (name: string) => createBank(name),
    onSuccess: () => {
      invalidate()
      success('Banco agregado')
    },
    onError: (err) => showError(translateError(err, 'Error al agregar el banco')),
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: { name?: string; active?: boolean } }) => updateBank(params.id, params.data),
    onSuccess: () => {
      invalidate()
      success('Banco actualizado')
    },
    onError: (err) => showError(translateError(err, 'Error al actualizar el banco')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBank(id),
    onSuccess: () => {
      invalidate()
      success('Banco eliminado')
    },
    onError: (err) => showError(translateError(err, 'Error al eliminar el banco')),
  })

  return {
    banks,
    isLoading: banksQuery.isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
