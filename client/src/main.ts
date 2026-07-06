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
  let lastVisibleAt = Date.now()
  let visibilityCooldown = false
  const handleVisibilityChange = () => {
    if (document.hidden) {
      lastVisibleAt = Date.now()
      return
    }
    if (visibilityCooldown) return
    const idleMs = Date.now() - lastVisibleAt
    if (idleMs > 60_000) {
      visibilityCooldown = true
      const auth = useAuthStore()
      if (auth.isAuthenticated) {
        auth.refreshSession().finally(() => {
          queryClient.invalidateQueries()
          setTimeout(() => { visibilityCooldown = false }, 5000)
        })
      } else {
        queryClient.invalidateQueries()
        setTimeout(() => { visibilityCooldown = false }, 5000)
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })

  const handleOnline = () => {
    queryClient.invalidateQueries()
  }
  window.addEventListener('online', handleOnline, { passive: true })
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
