import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { apiRequest } from '../../lib/api'
import { billingDismissKey, type BillingNotice } from '../../lib/billing'
import { useAuthStore } from '../../store/auth'

function localToday(): string {
  const d = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

/**
 * Aviso de cobro del servicio para el admin del negocio. Solo se consulta si el rol es admin (el
 * servidor igual responde 204 a cualquier otro). Cerrar el banner lo oculta el resto del día en
 * este navegador; un aviso vencido no se puede cerrar.
 */
export function useBillingNotice() {
  const authStore = useAuthStore()
  const businessId = computed(() => authStore.profile?.business_id ?? '')
  const isAdmin = computed(() => authStore.role === 'admin')

  const query = useQuery({
    queryKey: computed(() => ['billing-notice', businessId.value] as const),
    queryFn: () => apiRequest<BillingNotice | null>('GET', '/billing/notice'),
    enabled: computed(() => isAdmin.value && !!businessId.value),
    // Cambia como mucho una vez al día (o cuando el superadmin marca un pago): no hace falta más.
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  // Claves cerradas en esta sesión: respaldo por si localStorage está bloqueado.
  const closed = ref<string[]>([])

  const notice = computed(() => {
    const n = isAdmin.value ? query.data.value ?? null : null
    if (!n) return null
    if (!n.dismissible) return n
    const key = billingDismissKey(businessId.value, n, localToday())
    return closed.value.includes(key) || readFlag(key) ? null : n
  })

  function dismiss() {
    const n = notice.value
    if (!n?.dismissible) return
    const key = billingDismissKey(businessId.value, n, localToday())
    try { localStorage.setItem(key, '1') } catch { /* se oculta solo en esta sesión */ }
    closed.value = [...closed.value, key]
  }

  return { notice, dismiss }
}
