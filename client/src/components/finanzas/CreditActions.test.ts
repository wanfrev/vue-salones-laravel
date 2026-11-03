import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import CreditRowMenu from './CreditRowMenu.vue'
import CreditAmountModal from './CreditAmountModal.vue'
import CreditosSection from './CreditosSection.vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

const api = vi.mocked(apiRequest)
const credit = (over: Record<string, unknown> = {}) => ({
  id: 'cr1', client_name: 'EMILIANA', client_phone: '+58692564', amount: 216, paid_amount: 133, remaining: 83, status: 'partial',
  created_at: '2026-10-12T10:00:00Z', paid_at: null, ...over,
})

describe('CreditRowMenu', () => {
  // El menú es flotante (Teleport al body), así que se consulta en el documento.
  const mountMenu = (hasPayments: boolean) => mount(CreditRowMenu, { props: { hasPayments }, attachTo: document.body })
  const menu = () => document.body.querySelector('[role="menu"]') as HTMLElement | null
  const item = (id: string) => document.body.querySelector(`[data-testid="credit-menu-${id}"]`) as HTMLElement | null
  afterEach(() => { document.body.innerHTML = '' })

  it('empieza cerrado y al abrirlo ofrece corregir, cerrar y eliminar', async () => {
    const w = mountMenu(true)
    expect(menu()).toBeNull()
    await w.get('[aria-label="Más acciones"]').trigger('click')
    expect(menu()!.textContent).toContain('Corregir monto')
    expect(menu()!.textContent).toContain('Cerrar crédito')
    expect(menu()!.textContent).toContain('Eliminar crédito')
    w.unmount()
  })

  it('sin abonos no ofrece cerrar (lo que corresponde es eliminar)', async () => {
    const w = mountMenu(false)
    await w.get('[aria-label="Más acciones"]').trigger('click')
    expect(item('close')).toBeNull()
    expect(item('edit')).not.toBeNull()
    w.unmount()
  })

  it('cada opción emite su acción y cierra el menú', async () => {
    const w = mountMenu(true)
    for (const id of ['edit', 'close', 'delete'] as const) {
      await w.get('[aria-label="Más acciones"]').trigger('click')
      item(id)!.click()
      await flushPromises()
      expect(w.emitted(id)).toHaveLength(1)
      expect(menu()).toBeNull()
    }
    w.unmount()
  })

  it('tocar fuera lo cierra y se queda dentro de la pantalla', async () => {
    const w = mountMenu(true)
    await w.get('[aria-label="Más acciones"]').trigger('click')
    const left = parseFloat(menu()!.style.left)
    expect(left).toBeGreaterThanOrEqual(8)
    expect(left + 256).toBeLessThanOrEqual(window.innerWidth)
    ;(document.body.querySelector('.fixed.inset-0') as HTMLElement).click()
    await flushPromises()
    expect(menu()).toBeNull()
    w.unmount()
  })
})

describe('CreditAmountModal', () => {
  const mountIt = (over: Record<string, unknown> = {}) => mount(CreditAmountModal, {
    props: { credit: credit(over) as any },
    attachTo: document.body,
    global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
  const input = () => document.body.querySelector('#cr-new-amount') as HTMLInputElement
  const submit = () => document.body.querySelector('button[type="submit"]') as HTMLButtonElement
  const send = async () => { document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })); await flushPromises() }
  const type = async (value: string) => { input().value = value; input().dispatchEvent(new Event('input')); await flushPromises() }
  afterEach(() => { document.body.innerHTML = '' })

  it('empieza con el monto actual y sin permitir guardar sin cambios', () => {
    const w = mountIt()
    expect(input().value).toBe('216')
    expect(submit().disabled).toBe(true)
    w.unmount()
  })

  it('no deja un monto menor a lo ya abonado', async () => {
    const w = mountIt()
    await type('100')
    expect(document.body.querySelector('[data-testid="credit-amount-error"]')).not.toBeNull()
    expect(submit().disabled).toBe(true)
    w.unmount()
  })

  it('con el monto igual a lo abonado avisa que pasa a Pagados y guarda', async () => {
    const w = mountIt()
    await type('133')
    expect(document.body.querySelector('[data-testid="credit-amount-settles"]')).not.toBeNull()
    expect(submit().disabled).toBe(false)
    await send()
    expect(w.emitted('save')![0]).toEqual([133])
    w.unmount()
  })

  it('un monto mayor al abonado solo cambia lo que falta, sin avisar de pago', async () => {
    const w = mountIt()
    await type('150.456')
    expect(document.body.querySelector('[data-testid="credit-amount-settles"]')).toBeNull()
    await send()
    expect(w.emitted('save')![0]).toEqual([150.46])
    w.unmount()
  })

  it('un monto vacío o cero no se puede guardar', async () => {
    const w = mountIt({ paid_amount: 0, remaining: 216, status: 'pending' })
    await type('')
    expect(submit().disabled).toBe(true)
    await type('0')
    expect(submit().disabled).toBe(true)
    w.unmount()
  })
})

describe('Créditos: corregir, cerrar y eliminar desde la fila', () => {
  const period = { start: '2026-10-01', end: '2026-10-31' }
  const confirmSpy = vi.fn()
  const realConfirm = window.confirm

  function mountSection(list: any[]) {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    const pinia = createPinia()
    qc.setQueryData(['credits', 'b1'], list)
    const wrapper = mount(CreditosSection, { props: { periodDates: period }, attachTo: document.body, global: { plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] } })
    useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
    ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: {} }
    return wrapper
  }
  const calls = () => api.mock.calls.filter(c => String(c[1]).startsWith('/credits/')).map(c => `${c[0]} ${c[1]}${c[2] ? ' ' + JSON.stringify(c[2]) : ''}`)
  const openMenu = async (w: ReturnType<typeof mountSection>, row = 0) => {
    await w.findAll('[data-testid="credit-row"]')[row].get('[aria-label="Más acciones"]').trigger('click')
  }

  beforeEach(() => {
    api.mockReset()
    // Tras guardar se vuelve a pedir la lista: GET devuelve una lista; el resto, el crédito actualizado.
    api.mockImplementation((async (method: string) => (method === 'GET' ? [] : credit({ status: 'paid' }))) as any)
    confirmSpy.mockReset().mockReturnValue(true)
    window.confirm = confirmSpy as any
  })
  afterEach(() => { window.confirm = realConfirm; document.body.innerHTML = '' })

  it('cerrar: pide confirmación explicando que no crea ingreso y llama al servidor', async () => {
    const w = mountSection([credit()])
    await flushPromises()
    await openMenu(w)
    ;(document.body.querySelector('[data-testid="credit-menu-close"]') as HTMLElement).click()
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledOnce()
    const message = String(confirmSpy.mock.calls[0][0])
    expect(message).toContain('$133.00')
    expect(message).toContain('$83.00')
    expect(message).toContain('ningún ingreso')
    expect(calls()).toEqual(['POST /credits/cr1/close'])
    w.unmount()
  })

  it('cerrar: si la persona cancela no se llama al servidor', async () => {
    confirmSpy.mockReturnValue(false)
    const w = mountSection([credit()])
    await flushPromises()
    await openMenu(w)
    ;(document.body.querySelector('[data-testid="credit-menu-close"]') as HTMLElement).click()
    await flushPromises()
    expect(calls()).toEqual([])
    w.unmount()
  })

  it('corregir monto: abre el diálogo, guarda y lo cierra', async () => {
    const w = mountSection([credit()])
    await flushPromises()
    await openMenu(w)
    ;(document.body.querySelector('[data-testid="credit-menu-edit"]') as HTMLElement).click()
    await flushPromises()

    const input = document.body.querySelector('#cr-new-amount') as HTMLInputElement
    input.value = '133'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect(calls()).toEqual(['PUT /credits/cr1 {"amount":133}'])
    expect(document.body.querySelector('#cr-new-amount')).toBeNull()
    w.unmount()
  })

  it('eliminar un crédito con abonos y saldo: avisa que el saldo deja de registrarse y lo cobrado se queda', async () => {
    api.mockImplementation((async (method: string) => (method === 'GET' ? [] : null)) as any)
    const w = mountSection([credit()])
    await flushPromises()
    await openMenu(w)
    ;(document.body.querySelector('[data-testid="credit-menu-delete"]') as HTMLElement).click()
    await flushPromises()

    const message = String(confirmSpy.mock.calls[0][0])
    expect(message).toContain('se queda en Finanzas')
    expect(message).toContain('$83.00')
    expect(calls()).toEqual(['DELETE /credits/cr1'])
    w.unmount()
  })

  it('un crédito sin abonos no ofrece cerrar y su eliminación sigue siendo la de antes', async () => {
    api.mockImplementation((async (method: string) => (method === 'GET' ? [] : null)) as any)
    const w = mountSection([credit({ id: 'cr2', client_name: 'Luis', amount: 45, paid_amount: 0, remaining: 45, status: 'pending' })])
    await flushPromises()
    await openMenu(w)
    expect(document.body.querySelector('[data-testid="credit-menu-close"]')).toBeNull()
    ;(document.body.querySelector('[data-testid="credit-menu-delete"]') as HTMLElement).click()
    await flushPromises()
    expect(String(confirmSpy.mock.calls[0][0])).toContain('Esta acción no se puede deshacer')
    expect(calls()).toEqual(['DELETE /credits/cr2'])
    w.unmount()
  })
})
