import { onMounted, onUnmounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { echoClient } from '../../lib/echo'
import { useAuthStore } from '../../store/auth'

type EntityChangedPayload = {
  businessId: string
  entity: string
  action: 'created' | 'updated' | 'deleted'
  entityId?: string | null
}

export function useRealtime() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const pendingPrefixes = new Set<string>()

  const flushInvalidations = () => {
    const prefixes = Array.from(pendingPrefixes)
    pendingPrefixes.clear()
    const businessId = authStore.businessId
    if (!businessId) return
    Promise.allSettled(
      prefixes.map(prefix =>
        queryClient.invalidateQueries({ queryKey: [prefix, businessId], exact: false })
      )
    )
  }

  const handleEntityChange = (payload: EntityChangedPayload) => {
    const businessId = authStore.businessId
    if (!businessId || payload.businessId !== businessId) return

    const queryKeyMap: Record<string, string[]> = {
      profile: ['equipo', 'profiles', 'appointments', 'employee-payments', 'employee-earnings', 'finanzas-transactions'],
      employee_payment: ['employee-payments', 'employee-earnings', 'finanzas-transactions', 'financial-summary'],
      branch: ['branches'],
      business: ['businesses'],
      appointment: ['appointments', 'finanzas-transactions', 'financial-summary', 'employee-earnings', 'pos-pending'],
      transaction: ['finanzas-transactions', 'financial-summary', 'employee-earnings', 'pos-pending'],
      client: ['clientes', 'clients', 'appointments'],
      service: ['servicios', 'services', 'appointments', 'financial-summary'],
      product: ['productos', 'products', 'inventario', 'pos-products'],
      product_category: ['productos', 'product-categories'],
      expense: ['expenses', 'financial-summary'],
      supplier: ['suppliers', 'proveedores'],
      supplier_payment: ['supplier-payments', 'financial-summary'],
      inventory_stock: ['inventario'],
      inventory_movement: ['inventario', 'finanzas-product-sales'],
      notification: ['notifications'],
      gift_card: ['gift-cards'],
      employee_schedule: ['equipo', 'schedules'],
      employee_balance: ['employee-balance', 'employee-earnings'],
    }

    const prefixes = queryKeyMap[payload.entity] || [payload.entity]
    prefixes.forEach(p => pendingPrefixes.add(p + '|' + businessId))

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(flushInvalidations, 500)
  }

  let channel: any = null

  onMounted(() => {
    const bizId = authStore.businessId
    if (!bizId) return

    channel = echoClient
      .private(`business.${bizId}`)
      .listen('.entity.changed', (payload: EntityChangedPayload) => {
        handleEntityChange(payload)
      })
  })

  onUnmounted(() => {
    if (channel) {
      echoClient.leave(`business.${authStore.businessId}`)
      channel = null
    }
  })

  return { handleEntityChange }
}
