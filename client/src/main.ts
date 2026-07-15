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

try {
  let updatePrompted = false
  registerSW({
    onNeedRefresh() {
      if (updatePrompted) return
      updatePrompted = true
      const el = document.createElement('div')
      el.className = 'pwa-update-toast'
      el.innerHTML = `
        <span>Nueva versión disponible</span>
        <button id="pwa-update-btn">Actualizar</button>
        <button id="pwa-dismiss-btn">&times;</button>
      `
      document.body.appendChild(el)
      const style = document.createElement('style')
      style.textContent = `
        .pwa-update-toast {
          position: fixed; bottom: 20px; right: 20px; z-index: 99999;
          display: flex; align-items: center; gap: 12px;
          background: #1e1b2e; color: #fff; border: 1px solid #8b5cf6;
          border-radius: 12px; padding: 14px 18px;
          font-family: system-ui, sans-serif; font-size: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: pwa-slide-up 0.3s ease;
        }
        @keyframes pwa-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pwa-update-toast button {
          border: none; border-radius: 8px; padding: 6px 14px;
          font-size: 13px; cursor: pointer; font-weight: 600;
        }
        #pwa-update-btn {
          background: #8b5cf6; color: #fff;
        }
        #pwa-update-btn:hover { background: #7c3aed; }
        #pwa-dismiss-btn {
          background: transparent; color: #999; padding: 4px 8px; font-size: 18px;
        }
        #pwa-dismiss-btn:hover { color: #fff; }
      `
      document.head.appendChild(style)
      el.querySelector('#pwa-update-btn')!.addEventListener('click', async () => {
        el.remove()
        style.remove()
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          await new Promise(r => setTimeout(r, 300))
        }
        window.location.reload()
      })
      el.querySelector('#pwa-dismiss-btn')!.addEventListener('click', () => {
        el.remove()
        style.remove()
      })
    },
    onOfflineReady() {},
    onRegistered(r) {
      if (r) setInterval(() => r.update(), 2 * 60 * 1000)
    },
  })
} catch {
  // PWA no disponible en este entorno
}
