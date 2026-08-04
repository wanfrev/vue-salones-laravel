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
const dismissed = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | null = null
let initialized = false

const UPDATE_CHECK_MS = 60_000

/** Se llama una sola vez desde main.ts, antes de montar la app. */
export function initPwaUpdate(): void {
  if (initialized) return
  initialized = true

  try {
    updateSW = registerSW({
      onNeedRefresh() {
        needRefresh.value = true
        dismissed.value = false
      },
      onOfflineReady() {
        offlineReady.value = true
      },
      onRegisteredSW(_swUrl: string, r: ServiceWorkerRegistration | undefined) {
        registration = r ?? null
        if (!r) return

        const check = () => { r.update().catch(() => {}) }

        setInterval(check, UPDATE_CHECK_MS)

        // En el móvil la PWA queda suspendida en segundo plano durante días sin
        // ejecutar el intervalo. Volver al foco es el momento real de mirar si
        // hay una build nueva.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          dismissed.value = false
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

export function dismissUpdate(): void {
  dismissed.value = true
}

export function usePwaUpdate() {
  return {
    needRefresh: readonly(needRefresh),
    offlineReady: readonly(offlineReady),
    updating: readonly(updating),
    checking: readonly(checking),
    dismissed: readonly(dismissed),
    applyUpdate,
    checkForUpdate,
    hardReset,
    dismissUpdate,
  }
}
