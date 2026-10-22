import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import GestionTabs from './GestionTabs.vue'

// El store del negocio usa TanStack Query: el montaje necesita su plugin además de Pinia.
const plugins = (): any[] => [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]]

// Miércoles 21 de octubre de 2026, 10:00
const NOW = new Date(2026, 9, 21, 10, 0)

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW) })
afterEach(() => vi.useRealTimers())

const service = (id: string, earnings: number, tip = 0) => ({
  id, employee: 'Lucía Pérez', client: 'Ana Cruz', service: 'Corte', amount: earnings * 2, percentage: 50, earnings, tipAmount: tip,
})
const pay = (id: string, paymentDate: string, amount: number, over: Record<string, unknown> = {}) => ({
  id, paymentDate, employeeName: 'Mario Díaz', type: 'payment', paymentMethod: 'cash', currency: 'USD', originalAmount: amount, amount, ...over,
})
const debt = (id: string, name: string, pending: number) => ({
  employeeId: id, employeeName: name, payType: 'mixed', payPercentage: 40, baseSalary: 100, commissionTotal: 80,
  totalEarned: 180, totalPaid: 60, totalConsumed: 20, pendingBalance: pending,
})
const schedule = (id: string, name: string, over: Record<string, unknown> = {}) => ({ id, name, start: '09:00', end: '18:00', break: '13:00 - 14:00', appointments: 0, available: true, ...over })

function mountTabs(over: Record<string, unknown> = {}) {
  return mount(GestionTabs, {
    props: {
      summaryCtx: { employeePayments: ref([service('s1', 10), service('s2', 12.5, 5)]) },
      paymentsCtx: {
        allPayments: ref([
          pay('p1', '2026-10-05', 100),
          pay('p2', '2026-10-21', 50, { type: 'consumption', concept: 'Productos' }),
          pay('p3', '2026-09-30', 999), // mes anterior: no debe aparecer en octubre
        ]),
      },
      teamSchedule: [schedule('t1', 'Lucía Pérez'), schedule('t2', 'Mario Díaz', { start: '14:00', end: '20:00', break: 'Sin descanso registrado' })],
      totalComisiones: 22.5,
      totalNominaPagada: 100,
      totalConsumido: 50,
      totalDeudaPendiente: 190,
      deudaConSaldo: [debt('e1', 'Lucía Pérez', 100), debt('e2', 'Mario Díaz', 90)],
      selectedMonth: '2026-10',
      selectedPeriod: 'month',
      ...over,
    } as any,
    global: { plugins: plugins() },
  })
}

type W = ReturnType<typeof mountTabs>
const mainTabs = (w: W) => w.get('[aria-label="Secciones de gestión"]').findAll('[role="tab"]')
const modeTabs = (w: W) => w.get('[aria-label="Periodo"]').findAll('[role="tab"]')
const openTab = async (w: W, name: string) => { await mainTabs(w).find(t => t.text().includes(name))!.trigger('click') }
const summary = (w: W) => w.get('[data-testid="summary"]').text().replace(/\s+/g, ' ')
const lastDebtDates = (w: W) => (w.emitted('update:debtDates')!.at(-1) as any[])[0]

describe('pestañas', () => {
  it('muestra las cuatro secciones con su contador y empieza en Servicios', () => {
    const w = mountTabs()
    expect(mainTabs(w).map(t => t.text().replace(/\s+/g, ' '))).toEqual([
      'Servicios RealizadosServicios2', 'Pago de NóminaNómina2', 'Deuda por EmpleadoDeuda2', 'Horarios del EquipoHorarios2',
    ])
    expect(mainTabs(w)[0].attributes('aria-selected')).toBe('true')
    expect(summary(w)).toContain('Comisiones $22.50 · 2 servicios')
  })

  it('Servicios: el botón «Ahora» siempre está, incluso en el mes actual, y vuelve al mes de hoy', async () => {
    const w = mountTabs() // selectedMonth = 2026-10 = el mes actual
    const ahora = w.findAll('button').find(b => b.text() === 'Ahora')!
    expect(ahora).toBeTruthy()
    await ahora.trigger('click')
    expect(w.emitted('resetCurrentMonth')).toHaveLength(1)
  })

  it('Servicios: la comisión conserva su equivalente en la otra moneda aunque haya propina', () => {
    const w = mountTabs({ summaryCtx: { employeePayments: ref([service('s1', 10, 5)]) } })
    const text = w.get('li').text()
    expect(text).toContain('propina $5.00')
    expect(text).toMatch(/Bs/) // el equivalente de la comisión sigue ahí
  })

  it('cada pestaña muestra su panel', async () => {
    const w = mountTabs()
    expect(w.text()).toContain('Corte') // servicios
    await openTab(w, 'Nómina')
    expect(w.text()).toContain('Mario Díaz')
    await openTab(w, 'Deuda')
    expect(w.text()).toContain('Total ganado')
    await openTab(w, 'Horarios')
    expect(w.text()).toContain('Entrada')
  })

  it('un periodo sin datos lo dice', async () => {
    const w = mountTabs({ summaryCtx: { employeePayments: ref([]) }, deudaConSaldo: [], teamSchedule: [], paymentsCtx: { allPayments: ref([]) } })
    expect(w.text()).toContain('No hay comisiones registradas')
    await openTab(w, 'Nómina')
    expect(w.text()).toContain('No hay pagos de nómina registrados')
    await openTab(w, 'Deuda')
    expect(w.text()).toContain('No hay deuda pendiente')
    await openTab(w, 'Horarios')
    expect(w.text()).toContain('No hay horarios registrados')
  })
})

describe('nómina', () => {
  it('solo muestra los pagos del mes elegido y suma pagado y consumo aparte', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    expect(w.findAll('li')).toHaveLength(2) // p1 y p2; p3 es de septiembre
    expect(summary(w)).toBe('Total pagado + consumido $150.00 · 2 registros')
    expect(w.text()).not.toContain('$999')
  })

  it('al cambiar a otro mes, cambia la lista', async () => {
    const w = mountTabs({ selectedMonth: '2026-09' })
    await openTab(w, 'Nómina')
    expect(w.findAll('li')).toHaveLength(1)
    expect(w.text()).toContain('$999.00')
  })

  it('en modo «Día» solo queda lo de hoy', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    await modeTabs(w).find(t => t.text() === 'Día')!.trigger('click')
    expect(w.findAll('li')).toHaveLength(1)
    expect(summary(w)).toContain('Total pagado + consumido $150.00') // el total es el del mes, como siempre
    expect(summary(w)).toContain('1 registro') // los registros sí son los del periodo que se ve
    expect(w.text()).toContain('21 Octubre 2026')
  })

  it('en modo «Semana» incluye de lunes a domingo', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    await modeTabs(w).find(t => t.text() === 'Semana')!.trigger('click')
    expect(w.text()).toContain('19-25 Octubre 2026')
    expect(w.findAll('li')).toHaveLength(1) // solo el del 21; el del 5 queda fuera
  })

  it('en modo mes no hay botón «Este mes» (solo el selector), como antes', async () => {
    const w = mountTabs({ selectedMonth: '2026-08' })
    await openTab(w, 'Nómina')
    expect(w.findAll('button').some(b => b.text() === 'Este mes')).toBe(false)
  })

  it('elegir un mes avisa al padre para que Servicios use el mismo', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    await w.get('input[type="month"]').setValue('2026-08')
    expect(w.emitted('update:selectedMonth')![0]).toEqual(['2026-08'])
    expect(w.emitted('update:selectedPeriod')![0]).toEqual(['month'])
  })

  it('los botones viven DENTRO de la barra de Nómina, no en el encabezado de arriba', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    const [header, toolbar] = Array.from(w.get('section').element.children)
    expect(header.textContent).not.toContain('Registrar pago')
    expect(header.textContent).not.toContain('Debitar consumo')
    expect(toolbar.textContent).toContain('Registrar pago')
    expect(toolbar.textContent).toContain('Debitar consumo')
  })

  it('los botones de registrar pago y debitar consumo solo existen en esta pestaña', async () => {
    const w = mountTabs()
    expect(w.text()).not.toContain('Registrar pago')
    await openTab(w, 'Nómina')
    await w.findAll('button').find(b => b.text() === 'Registrar pago')!.trigger('click')
    await w.findAll('button').find(b => b.text() === 'Debitar consumo')!.trigger('click')
    expect(w.emitted('openPayment')).toHaveLength(1)
    expect(w.emitted('openConsumption')).toHaveLength(1)
    await openTab(w, 'Deuda')
    expect(w.text()).not.toContain('Registrar pago')
  })

  it('editar y eliminar mandan el pago correcto', async () => {
    const w = mountTabs()
    await openTab(w, 'Nómina')
    const first = w.findAll('li')[0]
    await first.get('button[aria-label="Editar pago"]').trigger('click')
    await first.get('button[aria-label="Eliminar pago"]').trigger('click')
    expect((w.emitted('openEditPayment')![0][0] as any).id).toBe('p1') // la lista respeta el orden en que llegan los pagos
    expect(w.emitted('deletePayment')![0]).toEqual(['p1'])
  })
})

describe('deuda', () => {
  it('manda al servidor el rango del mes en curso, que termina hoy', async () => {
    const w = mountTabs()
    expect(lastDebtDates(w)).toEqual({ start: '2026-10-01', end: '2026-10-21' })
  })

  it('«Todo» pide todo el historial', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    await modeTabs(w).find(t => t.text() === 'Todo')!.trigger('click')
    expect(lastDebtDates(w)).toEqual({ start: '2000-01-01', end: '2099-12-31' })
  })

  it('«Rango» arranca desde 7 días antes de hoy hasta hoy, como siempre', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    await modeTabs(w).find(t => t.text() === 'Rango')!.trigger('click')
    const [from, to] = w.findAll('input[type="date"]')
    expect((from.element as HTMLInputElement).value).toBe('2026-10-14')
    expect((to.element as HTMLInputElement).value).toBe('2026-10-21')
    expect(lastDebtDates(w)).toEqual({ start: '2026-10-14', end: '2026-10-21' })
  })

  it('«Rango» usa las fechas escritas y los atajos las cambian', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    await modeTabs(w).find(t => t.text() === 'Rango')!.trigger('click')
    const [from, to] = w.findAll('input[type="date"]')
    await from.setValue('2026-10-03')
    await to.setValue('2026-10-09')
    expect(lastDebtDates(w)).toEqual({ start: '2026-10-03', end: '2026-10-09' })

    await w.findAll('button').find(b => b.text() === 'Esta quincena')!.trigger('click')
    expect(lastDebtDates(w)).toEqual({ start: '2026-10-16', end: '2026-10-31' }) // hoy es 21: segunda quincena
    await w.findAll('button').find(b => b.text() === 'Quincena anterior')!.trigger('click')
    expect(lastDebtDates(w)).toEqual({ start: '2026-10-01', end: '2026-10-15' })
  })

  it('siempre dice qué periodo se evalúa (mes, todo, rango), como antes', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    expect(w.get('[data-testid="debt-period"]').text()).toBe('Período evaluado: Octubre 2026')
    await modeTabs(w).find(t => t.text() === 'Todo')!.trigger('click')
    expect(w.get('[data-testid="debt-period"]').text()).toBe('Período evaluado: Todo el historial')
    await modeTabs(w).find(t => t.text() === 'Rango')!.trigger('click')
    expect(w.get('[data-testid="debt-period"]').text()).toBe('Mostrando deuda del 14 Octubre 2026 al 21 Octubre 2026')
  })

  it('en modo mes, «Este mes» está siempre visible (también en el mes actual)', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    expect(w.findAll('button').some(b => b.text() === 'Este mes')).toBe(true)
  })

  it('el resumen muestra la deuda pendiente y cuántos tienen saldo', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    expect(summary(w)).toBe('Pendiente $190.00 · 2 con saldo')
  })

  it('explica de dónde sale cada total y manda el recibo del empleado correcto', async () => {
    const w = mountTabs()
    await openTab(w, 'Deuda')
    const second = w.findAll('li')[1]
    expect(second.text()).toContain('Sueldo + 40%')
    expect(second.text()).toContain('Sueldo $100.00 + comisión $80.00')
    expect(second.text()).toContain('consumo $20.00')
    expect(second.text()).toMatch(/Bs/) // el pagado conserva su equivalente aunque haya consumo
    await second.findAll('button').find(b => b.text().includes('Recibo'))!.trigger('click')
    expect((w.emitted('openRecibo')![0][0] as any).employeeId).toBe('e2')
  })
})

describe('horarios (igual que siempre)', () => {
  it('muestra entrada, salida, descanso y estado de cada empleado', async () => {
    const w = mountTabs()
    await openTab(w, 'Horarios')
    const rows = w.findAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Lucía Pérez')
    expect(rows[0].text()).toContain('9:00 AM')
    expect(rows[0].text()).toContain('6:00 PM')
    expect(rows[0].text()).toContain('13:00 - 14:00')
    expect(rows[1].text()).toContain('Sin descanso registrado')
  })

  it('el estado es «Disponible» salvo que la fila diga lo contrario', async () => {
    const w = mountTabs({ teamSchedule: [schedule('t1', 'Lucía Pérez'), schedule('t2', 'Mario Díaz', { available: false })] })
    await openTab(w, 'Horarios')
    const rows = w.findAll('li')
    expect(rows[0].text()).toContain('Disponible')
    expect(rows[0].text()).not.toContain('No disponible')
    expect(rows[1].text()).toContain('No disponible')
  })

  it('el resumen cuenta los empleados con horario registrado', async () => {
    const w = mountTabs()
    await openTab(w, 'Horarios')
    expect(summary(w)).toBe('2 empleado(s) con horario registrado')
  })
})
