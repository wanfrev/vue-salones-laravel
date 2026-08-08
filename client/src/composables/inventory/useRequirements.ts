import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '../../lib/api'
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
      const { data } = await api.get<Requirement[]>('/requirements')
      return data
    },
    enabled: () => !!authStore.businessId && authStore.profile?.can_access_requirements !== false,
  })

  const createRequirement = useMutation({
    mutationFn: async (payload: Partial<Requirement>) => {
      getBusinessId()
      const { data } = await api.post<Requirement>('/requirements', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const updateRequirement = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Requirement> }) => {
      getBusinessId()
      const { data } = await api.put<Requirement>(`/requirements/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const updateRequirementStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Requirement['status'] }) => {
      getBusinessId()
      const { data } = await api.patch<Requirement>(`/requirements/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false })
    },
  })

  const deleteRequirement = useMutation({
    mutationFn: async (id: string) => {
      getBusinessId()
      await api.delete(`/requirements/${id}`)
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
