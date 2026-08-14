import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { db } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { APPOINTMENT_SELECT } from '../../services/agendaService'

export function usePendingInvitations() {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const queryClient = useQueryClient()

  const businessId = computed(() => authStore.businessId)
  const branchId = computed(() => businessStore.currentBranchId)

  const { data: rawInvitations, refetch } = useQuery({
    queryKey: computed(() => ['invitaciones-pendientes', businessId.value, branchId.value] as const),
    queryFn: async () => {
      if (!businessId.value) return []
      let query = db.from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('business_id', businessId.value)
        .eq('source', 'public')
        .is('client_id', null)
        .in('status', ['pending', 'confirmed'])
        .order('start_time')
      if (branchId.value) query = query.eq('branch_id', branchId.value)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as any[]
    },
    enabled: computed(() => !!businessId.value),
    staleTime: 0,
    refetchInterval: 60 * 1000,
  })

  const invitations = computed(() => rawInvitations.value ?? [])
  const count = computed(() => invitations.value.length)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['invitaciones-pendientes'], exact: false })
  }

  return { invitations, count, refetch, invalidate }
}
