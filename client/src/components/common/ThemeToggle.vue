<template>
  <div class="relative">
    <!-- Boton Principal -->
    <button
      @click="toggle"
      class="flex items-center justify-center rounded-lg p-2 transition-theme hover:bg-bg-secondary"
      :title="tooltipText"
      :aria-label="tooltipText"
    >
      <!-- Sol (modo claro) -->
      <svg
        v-if="isLight"
        class="h-5 w-5 text-warning"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      <!-- Luna (modo oscuro) -->
      <svg
        v-else-if="isDark"
        class="h-5 w-5 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      <!-- Monitor (modo sistema) -->
      <svg
        v-else
        class="h-5 w-5 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </button>

    <!-- Menu desplegable de opciones -->
    <div
      v-if="showOptions"
      v-click-outside="closeOptions"
      class="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
    >
      <button
        v-for="option in themeOptions"
        :key="option.value"
        @click="selectMode(option.value)"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-theme"
        :class="[
          mode === option.value
            ? 'bg-primary-light text-primary'
            : 'text-text-secondary hover:bg-bg-secondary'
        ]"
      >
        <component :is="option.icon" class="h-4 w-4" />
        <span>{{ option.label }}</span>
        <svg
          v-if="mode === option.value"
          class="ml-auto h-4 w-4 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useThemeStore, type ThemeMode } from '../../store/theme'

// Iconos como componentes funcionales
const SunIcon = () =>
  h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    }),
  ])

const MoonIcon = () =>
  h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    }),
  ])

const MonitorIcon = () =>
  h('svg', { class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    }),
  ])

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
