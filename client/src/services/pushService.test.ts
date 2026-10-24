import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiRequest = vi.fn()
vi.mock('../lib/api', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }))

import { unsubscribeFromPush, isPushDisabledByUser, setPushDisabledByUser } from './pushService'

function stubServiceWorker(subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null) {
  vi.stubGlobal('navigator', {
    serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => subscription } }) },
  })
}

describe('desactivar notificaciones push', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    localStorage.clear()
  })

  it('recuerda que el usuario las apagó y da de baja la suscripción', async () => {
    const unsubscribe = vi.fn(async () => true)
    apiRequest.mockResolvedValue(null)
    stubServiceWorker({ endpoint: 'https://push.example/abc', unsubscribe })

    expect(isPushDisabledByUser()).toBe(false)
    await unsubscribeFromPush()

    expect(apiRequest).toHaveBeenCalledWith('DELETE', '/push-subscriptions', { endpoint: 'https://push.example/abc' })
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(isPushDisabledByUser()).toBe(true)
  })

  it('aunque el servidor falle, igual se da de baja en el navegador y queda desactivado', async () => {
    const unsubscribe = vi.fn(async () => true)
    apiRequest.mockRejectedValue(new Error('HTTP 500'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubServiceWorker({ endpoint: 'https://push.example/abc', unsubscribe })

    await unsubscribeFromPush()

    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(isPushDisabledByUser()).toBe(true)
  })

  it('sin suscripción activa también queda desactivado', async () => {
    stubServiceWorker(null)

    await unsubscribeFromPush()

    expect(apiRequest).not.toHaveBeenCalled()
    expect(isPushDisabledByUser()).toBe(true)
  })

  it('volver a activar borra la marca', () => {
    setPushDisabledByUser(true)
    setPushDisabledByUser(false)

    expect(isPushDisabledByUser()).toBe(false)
  })
})
