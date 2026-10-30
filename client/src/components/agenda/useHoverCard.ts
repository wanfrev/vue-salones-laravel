import { shallowRef, onBeforeUnmount } from 'vue'
import { hoverSummary, type HoverSource, type HoverSummary } from './hoverCard'

export interface HoverAnchor { left: number; right: number; top: number; bottom: number }
export interface HoverState { key: string; summary: HoverSummary; anchor: HoverAnchor }

interface Options {
  /** Mientras devuelva true no se muestra nada (p. ej. con el detalle abierto o arrastrando una cita). */
  suppressed?: () => boolean
  /** Por defecto solo con ratón: en pantallas táctiles no hay «pasar por encima» y el toque abre el detalle. */
  canHover?: boolean
  showDelay?: number
  hideDelay?: number
}

const detectHover = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Estado de la tarjeta flotante que resume una cita al pasar el cursor por encima. Con un pequeño retraso al entrar
 * (para no parpadear al cruzar el calendario) y otro al salir (para no cerrar y reabrir entre dos citas pegadas).
 */
export function useHoverCard(opts: Options = {}) {
  const { suppressed = () => false, canHover = detectHover(), showDelay = 140, hideDelay = 60 } = opts
  const state = shallowRef<HoverState | null>(null)
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    showTimer = hideTimer = null
  }

  function enter(key: string, source: () => HoverSource, el: Element | null) {
    if (!canHover || !el) return
    clear()
    showTimer = setTimeout(() => {
      showTimer = null
      if (suppressed()) return
      const r = el.getBoundingClientRect()
      state.value = { key, summary: hoverSummary(source()), anchor: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
    }, state.value ? 0 : showDelay)
  }

  function leave() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null }
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { hideTimer = null; state.value = null }, hideDelay)
  }

  /** Cierra ya (clic, scroll, arrastre). */
  function hide() {
    clear()
    state.value = null
  }

  onBeforeUnmount(clear)
  return { state, enter, leave, hide }
}
