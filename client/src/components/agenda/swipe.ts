export interface SwipeInput {
  /** Desplazamiento horizontal y vertical del dedo (px). Positivo hacia la derecha / hacia abajo. */
  dx: number
  dy: number
  /** Duración del gesto (ms). */
  ms: number
  /** Estado del desplazamiento horizontal de la grilla en el momento de soltar. */
  scrollLeft: number
  clientWidth: number
  scrollWidth: number
}

export interface SwipeOptions {
  minDistance?: number
  maxMs?: number
  /** Cuánto más horizontal que vertical debe ser el gesto. */
  ratio?: number
  /** Margen (px) para considerar que la grilla está en un borde. */
  edge?: number
}

/**
 * ¿Un deslizamiento de dedo sobre la grilla del calendario debe cambiar de día/semana?
 *  - «prev»: deslizar hacia la derecha (con la grilla ya en su borde izquierdo).
 *  - «next»: deslizar hacia la izquierda (con la grilla ya en su borde derecho).
 *
 * Si la grilla tiene más columnas de las que caben, el deslizamiento primero la desplaza (para ver al siguiente
 * profesional) y solo cambia de día cuando ya está en el borde: nunca se pelean ambas cosas. Gestos cortos, lentos
 * o más verticales que horizontales (desplazarse hacia abajo por las horas) no cuentan.
 */
export function swipeDirection(input: SwipeInput, opts: SwipeOptions = {}): 'prev' | 'next' | null {
  const { minDistance = 60, maxMs = 700, ratio = 1.8, edge = 4 } = opts
  const { dx, dy, ms, scrollLeft, clientWidth, scrollWidth } = input

  if (ms > maxMs) return null
  if (Math.abs(dx) < minDistance) return null
  if (Math.abs(dx) < ratio * Math.abs(dy)) return null

  if (dx > 0) return scrollLeft <= edge ? 'prev' : null

  return scrollLeft + clientWidth >= scrollWidth - edge ? 'next' : null
}
