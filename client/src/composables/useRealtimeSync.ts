import { watchEffect, onScopeDispose } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
]

export function useRealtimeSync(businessId: () => string | null | undefined) {
  const queryClient = useQueryClient()
  let channel: RealtimeChannel | null = null

  const subscribe = (bizId: string) => {
    if (!bizId) return

    const ch = supabase.channel(`realtime-sync-${bizId}`)

    for (const config of SYNC_TABLES) {
      ch.on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: `business_id=eq.${bizId}`,
        },
        () => {
          for (const key of config.keys) {
            queryClient.invalidateQueries({ queryKey: key as any, refetchType: 'active' })
          }
        }
      )
    }

    ch.subscribe((status: string) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setTimeout(() => {
          if (channel === ch) subscribe(bizId)
        }, 5000)
      }
    })

    channel = ch
  }

  const unsubscribe = () => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  watchEffect((onCleanup) => {
    const bizId = businessId()
    unsubscribe()
    if (bizId) {
      subscribe(bizId)
    }
    onCleanup(() => unsubscribe())
  })

  onScopeDispose(() => unsubscribe())
}
