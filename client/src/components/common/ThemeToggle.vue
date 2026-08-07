<template>
  <div class="relative">
    <!-- Boton Principal -->
    <button @click="toggle"
      class="flex items-center justify-center rounded-lg p-2 transition-theme hover:bg-bg-secondary"
      :title="tooltipText" :aria-label="tooltipText">
      <SunIcon v-if="isLight" :size="20" class="text-warning" />
      <MoonIcon v-else-if="isDark" :size="20" class="text-primary" />
      <MonitorIcon v-else :size="20" class="text-text-muted" />
    </button>

    <!-- Menu desplegable de opciones -->
    <div v-if="showOptions" v-click-outside="closeOptions"
      class="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg">
      <button v-for="option in themeOptions" :key="option.value" @click="selectMode(option.value)"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-theme" :class="[
          mode === option.value
            ? 'bg-primary-light text-primary'
            : 'text-text-secondary hover:bg-bg-secondary'
        ]">
        <component :is="option.icon" class="h-4 w-4" />
        <span>{{ option.label }}</span>
        <CheckReadIcon v-if="mode === option.value" :size="16" class="ml-auto text-primary" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SunIcon, MoonIcon, MonitorIcon, CheckReadIcon } from '@solar-icons/vue/linear'
import { useThemeStore, type ThemeMode } from '../../store/theme'

const themeStore = useThemeStore()
const showOptions = ref(false)

const mode = computed(() => themeStore.mode)
const isLight = computed(() => mode.value === 'light')
const isDark = computed(() => mode.value === 'dark')

const themeOptions = [
  { value: 'light' as ThemeMode, label: 'Claro', icon: SunIcon },
  { value: 'dark' as ThemeMode, label: 'Oscuro', icon: MoonIcon },
  { value: 'system' as ThemeMode, label: 'Sistema', icon: MonitorIcon },
]

const SunIconComponent = SunIcon
const MoonIconComponent = MoonIcon
const MonitorIconComponent = MonitorIcon

const tooltipText = computed(() => {
  const map: Record<ThemeMode, string> = {
    light: 'Modo claro',
    dark: 'Modo oscuro',
    system: 'Tema del sistema',
  }
  return map[mode.value] || 'Cambiar tema'
})

const toggle = () => {
  // Alternar entre modos ciclicamente
  if (mode.value === 'light') {
    themeStore.setMode('dark')
  } else if (mode.value === 'dark') {
    themeStore.setMode('system')
  } else {
    themeStore.setMode('light')
  }
}

const selectMode = (newMode: ThemeMode) => {
  themeStore.setMode(newMode)
  showOptions.value = false
}

const closeOptions = () => {
  showOptions.value = false
}

// Directiva personalizada para click outside
type ClickOutsideElement = HTMLElement & {
  _clickOutside?: (event: Event) => void
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: { value: () => void }) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: ClickOutsideElement) {
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside)
    }
  },
}
</script>

<style scoped>
/* Transiciones suaves para cambios de tema */
button {
  transition: background-color 0.2s ease, color 0.2s ease;
}
</style>
