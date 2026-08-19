import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  createEmployeeAsset,
  deleteEmployeeAsset,
  listEmployeeAssets,
  updateEmployeeAsset,
  type AssetType,
} from '../../services/staffing/employeeAssetsService'

export function useEmployeeAssets(employeeId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()

  const queryKey = computed(() => ['employee-assets', employeeId.value] as const)
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listEmployeeAssets(employeeId.value as string),
    enabled: computed(() => !!employeeId.value),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey.value, exact: false })

  const createMutation = useMutation({
    mutationFn: ({ assetType, description }: { assetType: AssetType; description: string }) =>
      createEmployeeAsset(employeeId.value as string, assetType, description),
    onSuccess: async () => {
      await invalidate()
      success('Bien asignado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, assetType, description }: { id: string; assetType: AssetType; description: string }) =>
      updateEmployeeAsset(id, assetType, description),
    onSuccess: async () => {
      await invalidate()
      success('Bien actualizado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployeeAsset(id),
    onSuccess: async () => {
      await invalidate()
      success('Bien eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  return {
    assets: computed(() => data.value ?? []),
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
