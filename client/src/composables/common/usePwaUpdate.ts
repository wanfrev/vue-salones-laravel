import { ref, readonly } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/**
 * Estado del service worker a nivel de módulo: hay un único SW por pestaña, así
 * que el estado se comparte entre todos los componentes que lo consulten.
 */
const needRefresh = ref(false)
const offlineReady = ref(false)
const updating = ref(false)
const checking = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | null = null
let initialized = false

const UPDATE_CHECK_MS = 15_000

// Justo después de aplicar una actualización, el primer pedido de sw.js tras el
// reload puede caer en un servidor/nodo de CDN que todavía no terminó de
// propagar el deploy y devuelve otra build distinta a la que acabamos de
// instalar. Eso dispara el aviso de nuevo un segundo después de haber
// actualizado. Durante esta ventana, cualquier "hay actualización" se trata
// como ruido de propagación: se reintenta más tarde en vez de molestar al
// usuario con el mismo aviso dos veces seguidas.
const JUST_UPDATED_KEY = 'luma_pwa_just_updated'
const PROPAGATION_GRACE_MS = 20_000

/** Se llama una sola vez desde main.ts, antes de montar la app. */
export function initPwaUpdate(): void {
  if (initialized) return
  initialized = true

  try {
    updateSW = registerSW({
      onNeedRefresh() {
        const justUpdatedAt = Number(sessionStorage.getItem(JUST_UPDATED_KEY) || 0)
        const elapsed = Date.now() - justUpdatedAt
        if (justUpdatedAt && elapsed < PROPAGATION_GRACE_MS) {
          window.setTimeout(() => {
            sessionStorage.removeItem(JUST_UPDATED_KEY)
            // El worker ya quedó en estado "waiting" — ese evento no vuelve a
            // dispararse solo porque se llame a update() de nuevo sobre el
            // mismo worker sin cambios, así que se comprueba el registro
            // directamente en vez de esperar un evento que no va a llegar.
            if (registration?.waiting) {
              needRefresh.value = true
            }
          }, PROPAGATION_GRACE_MS - elapsed)
          return
        }
        sessionStorage.removeItem(JUST_UPDATED_KEY)
        needRefresh.value = true
      },
      onOfflineReady() {
        offlineReady.value = true
      },
      onRegisteredSW(_swUrl: string, r: ServiceWorkerRegistration | undefined) {
        registration = r ?? null
        if (!r) return

        const check = () => { r.update().catch(() => {}) }

        // No esperar al primer tick del intervalo: si el deploy ya está listo,
        // que el aviso salga apenas se registra el SW en vez de hasta 15s después.
        check()
        setInterval(check, UPDATE_CHECK_MS)

        // En el móvil la PWA queda suspendida en segundo plano durante días sin
        // ejecutar el intervalo. Volver al foco es el momento real de mirar si
        // hay una build nueva.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          check()
        })

        window.addEventListener('online', check)
      },
      onRegisterError(err: unknown) {
        console.error('Fallo al registrar el service worker:', err)
      },
    })
  } catch (err) {
    console.warn('PWA no disponible en este entorno:', err)
  }
}

/**
 * Equivalente a un Ctrl+Shift+R dentro de la PWA: le ordena al service worker en
 * espera que tome el control (descartando el precache viejo) y recarga.
 */
export async function applyUpdate(): Promise<void> {
  if (updating.value) return
  updating.value = true

  // sessionStorage (no una variable JS) porque el reload que sigue destruye
  // este módulo entero; tiene que sobrevivir a la recarga en la misma pestaña.
  sessionStorage.setItem(JUST_UPDATED_KEY, String(Date.now()))

  // Si el SW nuevo no llega a tomar el control, el evento `controlling` que
  // dispara la recarga nunca se emite. Recargamos igual para no dejar el botón
  // colgado en "Actualizando".
  const fallback = window.setTimeout(() => window.location.reload(), 4000)

  try {
    await updateSW?.()
  } catch {
    window.clearTimeout(fallback)
    window.location.reload()
  }
}

/** Chequeo manual. Devuelve true si quedó una actualización pendiente de aplicar. */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return needRefresh.value
  checking.value = true
  try {
    await registration.update()
  } catch { /* sin red o SW no disponible */ } finally {
    checking.value = false
  }
  return needRefresh.value
}

/**
 * Último recurso cuando la app quedó con assets corruptos: borra todo el caché,
 * desregistra el service worker y recarga desde red.
 */
export async function hardReset(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
  } catch { /* seguimos igual: la recarga es lo importante */ }
  window.location.reload()
}

export function usePwaUpdate() {
  return {
    needRefresh: readonly(needRefresh),
    offlineReady: readonly(offlineReady),
    updating: readonly(updating),
    checking: readonly(checking),
    applyUpdate,
    checkForUpdate,
    hardReset,
  }
}
