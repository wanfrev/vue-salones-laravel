import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { SolarIconsPlugin } from '@solar-icons/vue/lib'
import './style.css'
import App from './App.vue'
import router from './router'
import { initPwaUpdate } from './composables/common/usePwaUpdate'
import { queryClient } from './queryClient'
import { useAuthStore } from './store/auth'
import { useThemeStore } from './store/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const themeStore = useThemeStore()
themeStore.initialize()

app.use(SolarIconsPlugin, {
  color: 'currentColor',
  size: 24,
  strokeWidth: 2,
})

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

initPwaUpdate()
