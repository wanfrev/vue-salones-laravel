import { setAuthToken } from '../../lib/api'
import { switchBusiness } from '../../services/authService'

/**
 * El dueño cambia de un negocio suyo a otro (ej. salón → pulilavado) sin volver a loguearse —
 * mismo patrón de token-swap que useImpersonation.ts, pero simétrico: no hay "volver", cambiar
 * de negocio se puede deshacer eligiendo el otro desde el mismo selector. Hard navigation (no
 * cambio de ruta SPA) por la misma razón que la impersonación: Pinia y TanStack Query están
 * llenos de datos atados a "quién está logueado ahora" y solo un reload garantiza que nada de
 * eso se filtre entre negocios.
 */
export async function switchToBusiness(userId: string): Promise<void> {
  const result = await switchBusiness(userId)
  setAuthToken(result.access_token)
  window.location.href = '/'
}
