import { onMounted, onUnmounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { echoClient } from '../lib/echo'
import { useAuthStore } from '../store/auth'

type EntityChangedPayload = {
  businessId: string
  entity: string
  action: 'created' | 'updated' | 'deleted'
  entityId?: string | null
}

/**
 * Listens for real-time entity changes from Laravel Reverb.
 * Invalidates TanStack Query caches automatically.
 */
export function useRealtime() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const handleEntityChange = (payload: EntityChangedPayload) => {
    const businessId = authStore.businessId
    if (!businessId || payload.businessId !== businessId) return

    // Map entity names to query key prefixes for invalidation
    const queryKeyMap: Record<string, string[]> = {
      profile: ['equipo', 'profiles', 'employee-payments', 'employee-earnings', 'finanzas-transactions'],
      employee_payment: ['employee-payments', 'employee-earnings', 'finanzas-transactions', 'finanzas-employee-payments', 'employee-balance'],
      branch: ['branches'],
      business: ['businesses'],
      appointment: ['appointments', 'finanzas-transactions', 'finanzas-summary', 'employee-earnings', 'dashboard-services'],
      transaction: ['finanzas-transactions', 'finanzas-summary', 'employee-earnings', 'employee-balance', 'finanzas-employee-payments'],
    }

    const prefixes = queryKeyMap[payload.entity] || [payload.entity]

    Promise.allSettled(
      prefixes.map(prefix =>
        queryClient.invalidateQueries({ queryKey: [prefix, businessId], exact: false })
      )
    )
  }

  let channel: any = null

  onMounted(() => {
    const businessId = authStore.businessId
    if (!businessId) return

    channel = echoClient
      .channel(`business.${businessId}`)
      .listen('.entity.changed', (payload: EntityChangedPayload) => {
        handleEntityChange(payload)
      })
  })

  onUnmounted(() => {
    if (channel) {
      echoClient.leaveChannel(`business.${authStore.businessId}`)
      channel = null
    }
  })

  return { handleEntityChange }
}
