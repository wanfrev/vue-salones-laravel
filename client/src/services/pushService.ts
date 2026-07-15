import { apiRequest } from '../lib/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      await sendSubscriptionToServer(existingSubscription)
      return existingSubscription
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await sendSubscriptionToServer(subscription)
    return subscription
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      console.debug('Push notifications not allowed by user')
    } else {
      console.error('Push subscription failed:', err)
    }
    return null
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await apiRequest('DELETE', '/push-subscriptions', {
        endpoint: subscription.endpoint,
      })
      await subscription.unsubscribe()
    }
  } catch (err) {
    console.error('Push unsubscription failed:', err)
  }
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  const payload = {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
  }
  await apiRequest('POST', '/push-subscriptions', payload)
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
