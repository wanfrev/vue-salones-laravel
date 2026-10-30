import { describe, it, expect } from 'vitest'
import { swipeDirection, type SwipeInput } from './swipe'

// Una grilla que cabe entera (sin desplazamiento horizontal): ancho visible = ancho total.
const fits: Pick<SwipeInput, 'scrollLeft' | 'clientWidth' | 'scrollWidth'> = { scrollLeft: 0, clientWidth: 335, scrollWidth: 335 }
const swipe = (over: Partial<SwipeInput>) => swipeDirection({ dx: 0, dy: 0, ms: 200, ...fits, ...over })

describe('swipeDirection', () => {
  it('deslizar a la derecha va al día anterior, a la izquierda al siguiente', () => {
    expect(swipe({ dx: 120 })).toBe('prev')
    expect(swipe({ dx: -120 })).toBe('next')
  })

  it('un gesto corto, lento o más vertical que horizontal no cambia de día', () => {
    expect(swipe({ dx: 40 })).toBeNull()
    expect(swipe({ dx: 120, ms: 900 })).toBeNull()
    expect(swipe({ dx: 100, dy: 90 })).toBeNull()
  })

  it('tolera un poco de movimiento vertical en un deslizamiento claramente horizontal', () => {
    expect(swipe({ dx: -150, dy: 40 })).toBe('next')
  })

  describe('con más columnas de las que caben (la grilla se desplaza)', () => {
    const scrolling = { clientWidth: 335, scrollWidth: 900 }

    it('en medio, el deslizamiento solo desplaza las columnas: no cambia de día', () => {
      expect(swipe({ ...scrolling, scrollLeft: 200, dx: -150 })).toBeNull()
      expect(swipe({ ...scrolling, scrollLeft: 200, dx: 150 })).toBeNull()
    })

    it('en el borde izquierdo, deslizar a la derecha va al día anterior', () => {
      expect(swipe({ ...scrolling, scrollLeft: 0, dx: 150 })).toBe('prev')
      expect(swipe({ ...scrolling, scrollLeft: 0, dx: -150 })).toBeNull()
    })

    it('en el borde derecho, deslizar a la izquierda va al día siguiente', () => {
      expect(swipe({ ...scrolling, scrollLeft: 565, dx: -150 })).toBe('next')
      expect(swipe({ ...scrolling, scrollLeft: 565, dx: 150 })).toBeNull()
    })
  })
})
