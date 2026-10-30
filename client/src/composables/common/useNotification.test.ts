import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../lib/audioPlayer', () => ({ playSound: vi.fn() }))

import { UNDO_WINDOW_MS, useNotification } from './useNotification'

describe('aviso con «Deshacer»', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 0 })
    useNotification().notifications.value.splice(0)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('muestra el botón, lo ejecuta una vez y cierra el aviso', async () => {
    const { withUndo, runAction, notifications } = useNotification()
    const undo = vi.fn()

    const id = withUndo('Cita reagendada', undo)
    expect(notifications.value[0].action?.label).toBe('Deshacer')

    await runAction(id)
    await runAction(id)

    expect(undo).toHaveBeenCalledOnce()
    expect(notifications.value).toHaveLength(0)
  })

  it('dura el plazo de deshacer y luego desaparece solo, sin ejecutar nada', () => {
    const { withUndo, notifications } = useNotification()
    const undo = vi.fn()

    withUndo('Cita eliminada', undo)
    vi.advanceTimersByTime(UNDO_WINDOW_MS + 100)

    expect(notifications.value).toHaveLength(0)
    expect(undo).not.toHaveBeenCalled()
  })

  it('los avisos normales no llevan botón', () => {
    const { success, notifications } = useNotification()

    success('Guardado')

    expect(notifications.value[0].action).toBeUndefined()
  })
})
