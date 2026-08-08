import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import type { Requirement } from '../../types/database'

export function useRequirements() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  
  const getBusinessId = () => {
    const id = authStore.businessId
    if (!id) throw new Error('No business selected')
    return id
  }

  const requirementsQuery = useQuery({
    queryKey: ['requirements', authStore.businessId],
    queryFn: async () => {
      getBusinessId()
      return await apiRequest<Requirement[]>('GET', '/requirements')
    },
    enabled: () => !!authStore.businessId && authStore.profile?.can_access_requirements !== false,
  })

  const createRequirement = useMutation({
    mutationFn: async (payload: Partial<Requirement>) => {
      getBusinessId()
      return await apiRequest<Requirement>('POST', '/requirements', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const updateRequirement = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Requirement> }) => {
      getBusinessId()
      return await apiRequest<Requirement>('PUT', `/requirements/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const updateRequirementStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Requirement['status'] }) => {
      getBusinessId()
      return await apiRequest<Requirement>('PATCH', `/requirements/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      getBusinessId()
      await apiRequest<void>('DELETE', `/requirements/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  return {
    requirementsQuery,
    createRequirement,
    updateRequirement,
    updateRequirementStatus,
    deleteRequirement,
  }
}
