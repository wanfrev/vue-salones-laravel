import { watchEffect, onScopeDispose } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { echoClient } from '../lib/echo'

interface TableSyncConfig {
  table: string
  keys: string[][]
}

const SYNC_TABLES: TableSyncConfig[] = [
  { table: 'appointments', keys: [['appointments'], ['pos-pending'], ['financial-summary'], ['finanzas-transactions']] },
  { table: 'clients', keys: [['clientes'], ['clients']] },
  { table: 'profiles', keys: [['employees'], ['equipo']] },
  { table: 'services', keys: [['servicios'], ['services']] },
  { table: 'products', keys: [['productos'], ['products'], ['inventario']] },
  { table: 'product_categories', keys: [['productos'], ['product-categories']] },
  { table: 'transactions', keys: [['finanzas-transactions'], ['financial-summary'], ['employee-earnings'], ['employee-history'], ['finanzas-product-sales']] },
  { table: 'expenses', keys: [['expenses'], ['financial-summary']] },
  { table: 'employee_payments', keys: [['employee-payments'], ['financial-summary']] },
  { table: 'branches', keys: [['branches']] },
  { table: 'suppliers', keys: [['suppliers'], ['proveedores']] },
  { table: 'supplier_payments', keys: [['supplier-payments'], ['financial-summary']] },
  { table: 'inventory_stock', keys: [['inventario']] },
  { table: 'inventory_movements', keys: [['inventario']] },
  { table: 'notifications', keys: [['notifications']] },
  { table: 'employee_schedules', keys: [['employees'], ['equipo'], ['schedules']] },
  { table: 'businesses', keys: [['businessess']] },
  { table: 'branches', keys: [['branches']] },
]

export function useRealtimeSync(businessId: () => string | null | undefined) {
  const queryClient = useQueryClient()

  const getConfig = (entity: string) => {
    return SYNC_TABLES.find(c => c.table === entity)
  }

  const invalidateEntity = (entity: string) => {
    const config = getConfig(entity)
    if (!config) return

    Promise.allSettled(
      config.keys.map(key =>
        queryClient.invalidateQueries({ queryKey: key as any, refetchType: 'active' })
      )
    )
  }

  const subscribe = (bizId: string) => {
    echoClient.private(`business.${bizId}`).listen('.entity.changed', (e: { entity: string; action: string; entityId?: string }) => {
      invalidateEntity(e.entity)
    })
  }

  const unsubscribe = (bizId: string) => {
    echoClient.leave(`business.${bizId}`)
  }

  let currentBizId: string | null = null

  watchEffect((onCleanup) => {
    const bizId = businessId()
    if (bizId === currentBizId) return

    if (currentBizId) {
      unsubscribe(currentBizId)
    }

    currentBizId = bizId ?? null

    if (currentBizId) {
      subscribe(currentBizId)
    }

    onCleanup(() => {
      if (currentBizId) {
        unsubscribe(currentBizId)
        currentBizId = null
      }
    })
  })

  onScopeDispose(() => {
    if (currentBizId) {
      unsubscribe(currentBizId)
      currentBizId = null
    }
  })
}
