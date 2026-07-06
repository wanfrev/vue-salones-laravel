import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: any
  }
}

window.Pusher = Pusher

const echoInstance = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || 'salones-reverb-key',
  wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
  wsPort: import.meta.env.VITE_REVERB_PORT || '8080',
  wssPort: import.meta.env.VITE_REVERB_PORT || '8080',
  forceTLS: false,
  enabledTransports: ['ws'],
  disableStats: true,
})

export const echoClient = echoInstance
