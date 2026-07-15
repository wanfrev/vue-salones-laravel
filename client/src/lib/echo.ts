import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: any
  }
}

window.Pusher = Pusher

const getToken = () => localStorage.getItem('auth_token')

const echoInstance = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || 'salones-reverb-key',
  wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
  wsPort: import.meta.env.VITE_REVERB_PORT || '8080',
  wssPort: import.meta.env.VITE_REVERB_PORT || '8080',
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
  disableStats: true,
  authEndpoint: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/broadcasting/auth`
    : 'http://localhost:8000/api/broadcasting/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  },
  authorizer: (channel: any, _options: any) => {
    return {
      authorize: (socketId: string, callback: (err: Error | null, auth: any) => void) => {
        const token = getToken()
        fetch(
          import.meta.env.VITE_API_URL
            ? `${import.meta.env.VITE_API_URL}/broadcasting/auth`
            : 'http://localhost:8000/api/broadcasting/auth',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          }
        )
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text().catch(() => '')
              throw new Error(`Broadcasting auth failed: ${res.status} ${text}`)
            }
            return res.json()
          })
          .then((data) => {
            callback(null, data)
          })
          .catch((err) => {
            console.warn('[Echo] Broadcasting auth error, skipping realtime:', err.message)
            callback(new Error('Broadcasting auth failed'), null)
          })
      },
    }
  },
})

export const echoClient = echoInstance
