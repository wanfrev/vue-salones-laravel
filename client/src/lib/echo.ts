import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: any
  }
}

window.Pusher = Pusher

const token = () => localStorage.getItem('auth_token')

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
      Authorization: `Bearer ${token()}`,
    },
  },
})

export const echoClient = echoInstance
