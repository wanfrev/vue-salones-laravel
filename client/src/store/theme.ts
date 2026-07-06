import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'salonapp-theme-mode'

export const useThemeStore = defineStore('theme', () => {
  // Estado
  const mode = ref<ThemeMode>('system')
  const systemPrefersDark = ref(false)
  const isInitialized = ref(false)

  // Computed: tema efectivo (light o dark)
  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light'
    }
    return mode.value
  })

  const isDark = computed(() => effectiveTheme.value === 'dark')
  const isLight = computed(() => effectiveTheme.value === 'light')

  // Metodos
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
    saveToStorage()
    applyTheme()
  }

  const toggle = () => {
    if (mode.value === 'light') {
      setMode('dark')
    } else if (mode.value === 'dark') {
      setMode('system')
    } else {
      // Si es system, alternar segun el tema actual efectivo
      setMode(effectiveTheme.value === 'dark' ? 'light' : 'dark')
    }
  }

  const applyTheme = () => {
    const html = document.documentElement
    const isDarkMode = effectiveTheme.value === 'dark'

    if (isDarkMode) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }

    // Meta tag para color de barra en moviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#121212' : '#ffffff')
    }
  }

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, mode.value)
    } catch {
      // Ignorar errores de localStorage
    }
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        mode.value = saved
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }

  // Detectar preferencia del sistema
  const setupSystemListener = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    systemPrefersDark.value = mediaQuery.matches

    // Listener para cambios en tiempo real
    const handler = (event: MediaQueryListEvent) => {
      systemPrefersDark.value = event.matches
      if (mode.value === 'system') {
        applyTheme()
      }
    }

    // Navegadores modernos
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback para navegadores antiguos
      mediaQuery.addListener(handler)
    }
  }

  // Inicializacion
  const initialize = () => {
    if (isInitialized.value) return

    loadFromStorage()
    setupSystemListener()
    applyTheme()

    isInitialized.value = true
  }

  // Inicializar automaticamente cuando se usa el store
  initialize()

  // Watch para cambios en modo o preferencia del sistema
  watch([mode, systemPrefersDark], () => {
    applyTheme()
  }, { immediate: true })

  return {
    // Estado
    mode,
    isInitialized,

    // Computed
    effectiveTheme,
    isDark,
    isLight,

    // Metodos
    setMode,
    toggle,
    initialize,
  }
})

// Composable para uso fuera de componentes Vue
export function useTheme() {
  const store = useThemeStore()
  return {
    mode: store.mode,
    isDark: store.isDark,
    isLight: store.isLight,
    setMode: store.setMode,
    toggle: store.toggle,
  }
}
