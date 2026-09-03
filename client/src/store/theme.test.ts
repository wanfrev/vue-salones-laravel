import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from './theme'

describe('useThemeStore — Mejorar visibilidad (highVisibility)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.className = ''
    vi.restoreAllMocks()
  })

  it('starts with highVisibility = false by default and does not have high-visibility class', () => {
    const store = useThemeStore()
    expect(store.highVisibility).toBe(false)
    expect(document.documentElement.classList.contains('high-visibility')).toBe(false)
  })

  it('enables highVisibility, adds class to documentElement and saves to localStorage', () => {
    const store = useThemeStore()
    store.setHighVisibility(true)

    expect(store.highVisibility).toBe(true)
    expect(document.documentElement.classList.contains('high-visibility')).toBe(true)
    expect(localStorage.getItem('salonapp-high-visibility')).toBe('true')
  })

  it('toggles highVisibility on and off', () => {
    const store = useThemeStore()
    expect(store.highVisibility).toBe(false)

    store.toggleHighVisibility()
    expect(store.highVisibility).toBe(true)
    expect(document.documentElement.classList.contains('high-visibility')).toBe(true)

    store.toggleHighVisibility()
    expect(store.highVisibility).toBe(false)
    expect(document.documentElement.classList.contains('high-visibility')).toBe(false)
    expect(localStorage.getItem('salonapp-high-visibility')).toBe('false')
  })

  it('loads saved highVisibility from localStorage on initialization', () => {
    localStorage.setItem('salonapp-high-visibility', 'true')
    const store = useThemeStore()

    expect(store.highVisibility).toBe(true)
    expect(document.documentElement.classList.contains('high-visibility')).toBe(true)
  })
})
