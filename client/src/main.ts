import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './style.css'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'
import { queryClient } from './queryClient'
import { useAuthStore } from './store/auth'
import { useThemeStore } from './store/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const themeStore = useThemeStore()
themeStore.initialize()

app.use(VueQueryPlugin, { queryClient })
app.use(router)
app.mount('#app')

if (typeof document !== 'undefined') {
  setInterval(() => {
    const auth = useAuthStore()
    if (auth.isAuthenticated) {
      auth.refreshSession().catch(() => {})
    }
  }, 30 * 60 * 1000)
}

let _swUpdateInterval: ReturnType<typeof setInterval> | undefined
try {
  registerSW({
    onRegistered(r: { update: () => unknown } | undefined) {
      if (r) {
        if (_swUpdateInterval) clearInterval(_swUpdateInterval)
        _swUpdateInterval = setInterval(() => r.update(), 60 * 60 * 1000)
      }
    },
  })
} catch {
  // En entornos sin el plugin PWA virtual, ignorar silenciosamente.
}
