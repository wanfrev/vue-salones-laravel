import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import GiftCardPaymentFields from './GiftCardPaymentFields.vue'
import GiftCardPaymentModal from './GiftCardPaymentModal.vue'
import GiftCardPaymentBadge from './GiftCardPaymentBadge.vue'
import GiftCards from '../../views/GiftCards.vue'
import { giftCardsKeys } from '../../services/giftCardsService'
import { banksKeys } from '../../services/banksService'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import type { GiftCard } from '../../types/giftCard'
import type { PaymentLine } from '../../lib/giftCardPayment'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal<typeof import('../../lib/api')>()), apiRequest: vi.fn() }))
import { apiRequest } from '../../lib/api'

// La búsqueda de clientes al escribir un nombre no es lo que se prueba aquí.
vi.mock('../../services/clientesService', async importOriginal => ({
  ...(await importOriginal<typeof import('../../services/clientesService')>()),
  searchClients: vi.fn().mockResolvedValue([]),
  findOrCreateClientByPhone: vi.fn().mockResolvedValue(null),
}))

const api = vi.mocked(apiRequest)
const banks = [{ id: 'b-banesco', name: 'Banesco' }]

const card = (over: Partial<GiftCard> = {}): GiftCard => ({
  id: 'gc1', businessId: 'b1', branchId: null, code: 'GC-37T76E', buyerName: 'Veronica Valbuena', buyerPhone: null,
  recipientName: 'Carmen de Borrego', recipientPhone: null, amount: 50, status: 'active', notes: null, redeemedAt: null,
  createdBy: 'u1', createdAt: '2026-11-04T15:00:00Z', updatedAt: '2026-11-04T15:00:00Z', payment: null, ...over,
})
const paid = (): GiftCard['payment'] => ({
  amount: 50, paidAt: '2026-11-04T15:00:00Z', exchangeRate: null,
  splits: [{ method: 'cash', currency: 'USD', inputAmount: 50, amount: 50, bankId: null, bankName: null }],
})

const line = (method: PaymentLine['method'], amount: number | null, bankId: string | null = null): PaymentLine => ({ method, amount, bankId })

// Sin servidor: cualquier petición que no se simule se queda esperando en vez de fallar con ruido.
beforeAll(() => { vi.stubGlobal('fetch', () => new Promise(() => {})) })
afterEach(() => { document.body.innerHTML = '' })

describe('GiftCardPaymentFields', () => {
  const mountIt = (props: Record<string, unknown> = {}) =>
    mount(GiftCardPaymentFields, { props: { lines: [line('cash', 50)], rate: 100, banks, target: 50, ...props } })

  it('muestra la línea, lo que se recibe y que no es ingreso todavía', () => {
    const w = mountIt()
    expect((w.get('[data-testid="gc-line-amount"]').element as HTMLInputElement).value).toBe('50')
    const summary = w.get('[data-testid="gc-payment-summary"]').text()
    expect(summary).toContain('$50.00')
    expect(summary).toContain('no cuenta como ingreso')
  })

  it('avisa cuando lo pagado no coincide con el monto de la gift card', () => {
    const w = mountIt({ lines: [line('cash', 40)] })
    expect(w.get('[data-testid="gc-payment-summary"]').text()).toContain('no coincide')
  })

  it('al cambiar a un método en bolívares reconvierte el monto y pide la tasa', async () => {
    const w = mountIt()
    await w.get('[data-testid="gc-line-method"]').setValue('pago_movil')

    const [lines] = w.emitted('update:lines')![0] as [PaymentLine[]]
    expect(lines).toEqual([line('pago_movil', 5000)]) // $50 × 100 Bs
  })

  it('cambiar un dato emite una lista nueva y nunca modifica la del padre', async () => {
    const original = [line('cash', 50)]
    const w = mountIt({ lines: original })

    await w.get('[data-testid="gc-line-method"]').setValue('pago_movil')
    await w.get('[data-testid="gc-line-amount"]').setValue('123')

    expect(original).toEqual([line('cash', 50)])
    const emitted = w.emitted('update:lines')!.map(e => (e[0] as PaymentLine[]))
    expect(emitted.every(list => list !== original)).toBe(true)
  })

  it('con un método de banco ofrece elegir el banco; sin banco, no', async () => {
    expect(mountIt().find('[data-testid="gc-line-bank"]').exists()).toBe(false)
    const w = mountIt({ lines: [line('pago_movil', 5000)] })
    expect(w.find('[data-testid="gc-line-bank"]').exists()).toBe(true)
    await w.get('[data-testid="gc-line-bank"]').setValue('b-banesco')
    expect((w.emitted('update:lines')![0] as [PaymentLine[]])[0][0].bankId).toBe('b-banesco')
  })

  it('la tasa solo aparece con líneas en bolívares', () => {
    expect(mountIt().find('[data-testid="gc-rate"]').exists()).toBe(false)
    expect(mountIt({ lines: [line('cash_ves', 5000)] }).find('[data-testid="gc-rate"]').exists()).toBe(true)
  })

  it('agrega otra forma de pago con lo que falta y quita una sin tocar la lista del padre', async () => {
    const original = [line('cash', 20)]
    const w = mountIt({ lines: original })
    await w.get('[data-testid="gc-add-line"]').trigger('click')

    const [added] = w.emitted('update:lines')![0] as [PaymentLine[]]
    expect(added).toEqual([line('cash', 20), line('cash', 30)])
    expect(original).toEqual([line('cash', 20)])

    const two = mountIt({ lines: [line('cash', 20), line('zelle', 30)] })
    await two.findAll('[data-testid="gc-line-remove"]')[0].trigger('click')
    expect((two.emitted('update:lines')![0] as [PaymentLine[]])[0]).toEqual([line('zelle', 30)])
    expect(mountIt().find('[data-testid="gc-line-remove"]').exists()).toBe(false) // una sola línea no se quita
  })
})

describe('GiftCardPaymentBadge', () => {
  it('con cobro dice cómo se pagó y permite cambiarlo o quitarlo', async () => {
    const w = mount(GiftCardPaymentBadge, { props: { giftCard: card({ payment: paid() }) } })
    expect(w.get('[data-testid="gc-payment-text"]').text()).toBe('Efectivo ($) $50.00')
    await w.get('[data-testid="gc-payment-change"]').trigger('click')
    await w.get('[data-testid="gc-payment-remove"]').trigger('click')
    expect(w.emitted('register')).toHaveLength(1)
    expect(w.emitted('remove')).toHaveLength(1)
  })

  it('sin cobro avisa y ofrece registrarlo', async () => {
    const w = mount(GiftCardPaymentBadge, { props: { giftCard: card() } })
    expect(w.get('[data-testid="gc-payment-missing"]').text()).toBe('Sin cobro registrado')
    await w.get('[data-testid="gc-payment-register"]').trigger('click')
    expect(w.emitted('register')![0]).toEqual([card()])
  })
})

describe('GiftCardPaymentModal', () => {
  const mountIt = (props: Record<string, unknown> = {}) =>
    mount(GiftCardPaymentModal, { props: { giftCard: card(), banks, exchangeRate: 100, ...props }, attachTo: document.body })
  const field = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLInputElement | null

  it('empieza con efectivo por el saldo y guarda el cuerpo para el servidor', async () => {
    const w = mountIt()
    expect(field('gc-line-amount')!.value).toBe('50')

    field('gc-payment-save')!.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect(w.emitted('save')![0]).toEqual([{ lines: [{ method: 'cash', input_amount: 50, bank_id: null }] }])
    w.unmount()
  })

  it('si el cobro es inválido, enviar el formulario no emite nada', async () => {
    const w = mountIt()
    field('gc-line-amount')!.value = ''
    field('gc-line-amount')!.dispatchEvent(new Event('input'))
    await flushPromises()

    field('gc-payment-save')!.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect(w.emitted('save')).toBeUndefined()
    w.unmount()
  })

  it('no se puede guardar con un monto vacío', async () => {
    const w = mountIt()
    field('gc-line-amount')!.value = ''
    field('gc-line-amount')!.dispatchEvent(new Event('input'))
    await flushPromises()

    expect((field('gc-payment-save') as unknown as HTMLButtonElement).disabled).toBe(true)
    w.unmount()
  })

  it('la fecha solo se ofrece a quien puede cambiarla y se manda si se elige', async () => {
    const without = mountIt()
    expect(field('gc-paid-date')).toBeNull()
    without.unmount()

    const w = mountIt({ canBackdate: true })
    field('gc-paid-date')!.value = '2026-11-04'
    field('gc-paid-date')!.dispatchEvent(new Event('input'))
    await flushPromises()
    field('gc-payment-save')!.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect((w.emitted('save')![0] as [Record<string, unknown>])[0].paid_date).toBe('2026-11-04')
    w.unmount()
  })

  it('con un cobro ya registrado muestra «Cambiar el cobro» y arranca con ese cobro', () => {
    const w = mountIt({ giftCard: card({ payment: { ...paid()!, splits: [{ method: 'pago_movil', currency: 'VES', inputAmount: 5000, amount: 50, bankId: 'b-banesco', bankName: 'Banesco' }] } }) })
    expect(document.body.textContent).toContain('Cambiar el cobro')
    expect((field('gc-line-method') as unknown as HTMLSelectElement).value).toBe('pago_movil')
    expect(field('gc-line-amount')!.value).toBe('5000')
    w.unmount()
  })
})

describe('Pantalla de Gift Cards: cobro al crear y al registrar después', () => {
  let qc: QueryClient

  function mountView(cards: GiftCard[]) {
    qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
    const pinia = createPinia()
    qc.setQueryData(giftCardsKeys.all('b1', null), cards)
    qc.setQueryData(banksKeys.all('b1'), banks)
    const wrapper = mount(GiftCards, { attachTo: document.body, global: { plugins: [pinia, [VueQueryPlugin, { queryClient: qc }]] } })
    useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } as any })
    ;(useBusinessStore(pinia) as any).business = { id: 'b1', niche_type: 'salon', features: { gift_cards: true }, ves_exchange_rate: 100 }
    return wrapper
  }

  const calls = () => api.mock.calls.map(c => `${c[0]} ${c[1]}`)
  const bodyOf = (i = -1) => api.mock.calls.at(i)![2] as Record<string, any>
  const type = async (selector: string, value: string) => {
    const el = document.body.querySelector(selector) as HTMLInputElement
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
  }
  const submitCreate = async () => {
    ;(document.body.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()
  }
  const fillCard = async () => {
    await type('input[placeholder="Escribe para buscar o ingresar nombre"]', 'Veronica Valbuena')
    const inputs = document.body.querySelectorAll('input[placeholder="Escribe para buscar o ingresar nombre"]')
    ;(inputs[1] as HTMLInputElement).value = 'Carmen de Borrego'
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    await type('#gc-amount', '50')
  }

  beforeEach(() => {
    api.mockReset()
    api.mockResolvedValue({ ...card(), id: 'new', payment: null, recipient_name: 'Carmen de Borrego', amount: 50 } as any)
  })

  it('al crear, el cobro empieza en efectivo y sigue al monto de la gift card', async () => {
    const w = mountView([])
    await flushPromises()
    await w.get('header button').trigger('click')
    await flushPromises()

    expect((document.body.querySelector('[data-testid="gc-line-amount"]') as HTMLInputElement).value).toBe('')
    await type('#gc-amount', '50')
    expect((document.body.querySelector('[data-testid="gc-line-amount"]') as HTMLInputElement).value).toBe('50')
    await type('#gc-amount', '60')
    expect((document.body.querySelector('[data-testid="gc-line-amount"]') as HTMLInputElement).value).toBe('60')
    w.unmount()
  })

  it('guarda la gift card y su cobro en una sola petición', async () => {
    const w = mountView([])
    await flushPromises()
    await w.get('header button').trigger('click')
    await flushPromises()
    await fillCard()

    await submitCreate()

    expect(calls()).toEqual(['POST /gift-cards'])
    expect(bodyOf().amount).toBe(50)
    expect(bodyOf().payment).toEqual({ lines: [{ method: 'cash', input_amount: 50, bank_id: null }] })
    w.unmount()
  })

  it('si lo pagado no coincide con el monto no guarda nada y lo dice', async () => {
    const w = mountView([])
    await flushPromises()
    await w.get('header button').trigger('click')
    await flushPromises()
    await fillCard()
    await type('[data-testid="gc-line-amount"]', '40')

    await submitCreate()

    expect(calls()).toEqual([])
    expect(document.body.textContent).toContain('no coincide')
    w.unmount()
  })

  it('«Registrar el cobro después» crea la gift card sin cobro y avisa que no cuenta en el cuadre', async () => {
    api.mockResolvedValue({ id: 'new', recipient_name: 'Carmen de Borrego', amount: 50, code: 'GC-1', status: 'active' } as any)
    const w = mountView([])
    await flushPromises()
    await w.get('header button').trigger('click')
    await flushPromises()
    await fillCard()
    const skip = document.body.querySelector('[data-testid="gc-skip-payment"]') as HTMLInputElement
    skip.checked = true
    skip.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(document.body.textContent).toContain('no aparece en el Cuadre del Día')

    await submitCreate()

    // Sin cobro se usa la ruta de siempre (sin el campo payment).
    expect(calls().some(c => c.startsWith('POST /gift-cards') && 'payment' in bodyOf())).toBe(false)
    w.unmount()
  })

  it('una gift card sin cobro muestra «Registrar cobro» y lo guarda con su propia ruta', async () => {
    api.mockResolvedValue({ id: 'gc1', recipient_name: 'Carmen', amount: 50, code: 'GC-37T76E', status: 'active', payment: null } as any)
    const w = mountView([card()])
    await flushPromises()

    expect(w.get('[data-testid="gc-payment-missing"]').text()).toBe('Sin cobro registrado')
    await w.get('[data-testid="gc-payment-register"]').trigger('click')
    await flushPromises()
    ;(document.body.querySelector('[data-testid="gc-payment-save"]') as HTMLElement).closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    await flushPromises()

    expect(calls()).toEqual(['PUT /gift-cards/gc1/payment'])
    expect(bodyOf()).toEqual({ lines: [{ method: 'cash', input_amount: 50, bank_id: null }] })
    w.unmount()
  })

  it('quitar el cobro pide confirmación', async () => {
    api.mockResolvedValue(null as any)
    const confirm = vi.fn().mockReturnValue(false)
    const real = window.confirm
    window.confirm = confirm as any
    const w = mountView([card({ payment: paid() })])
    await flushPromises()

    await w.get('[data-testid="gc-payment-remove"]').trigger('click')
    expect(confirm).toHaveBeenCalledOnce()
    expect(calls()).toEqual([])

    confirm.mockReturnValue(true)
    await w.get('[data-testid="gc-payment-remove"]').trigger('click')
    await flushPromises()
    expect(calls()).toEqual(['DELETE /gift-cards/gc1/payment'])
    window.confirm = real
    w.unmount()
  })
})
