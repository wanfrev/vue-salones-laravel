import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/api', () => ({ apiRequest: vi.fn() }))
vi.mock('./inventarioService', () => ({ getDefaultLocation: vi.fn() }))

import { groupPendingAppointments } from './posService'

const appt = (id: string, over: Record<string, unknown> = {}) => ({
  id, start_time: `2026-10-${10 + Number(id.replace('a', ''))}T15:00:00Z`, price_override: 15, employee_id: 'd1',
  service: { name: 'Estimulación' }, employee_profile: { full_name: 'dra soto' }, ...over,
})

describe('groupPendingAppointments — programas de sesiones', () => {
  const program = { enrollment_id: 'e1', name: 'Estimulación temprana', used: 3, total: 4 }
  const sessions = ['a1', 'a2', 'a3', 'a4'].map(id => appt(id, { group_id: 'e1-0000-0000-0000-000000000000', program }))

  it('turns the sessions of a program into ONE charge named after the program, priced as the sum of its slices', () => {
    const [group] = groupPendingAppointments(sessions)

    expect(group.isGroup).toBe(true)
    expect(group.groupIds).toEqual(['a1', 'a2', 'a3', 'a4'])
    expect(group.groupPrice).toBe(60)
    expect(group.services.name).toBe('Estimulación temprana')
    expect(group.program).toEqual(program)
    expect(group.members).toHaveLength(4)
    expect(group.members.every((m: any) => m.employeeName === 'Dra Soto' && m.price === 15)).toBe(true)
  })

  it('an ordinary group keeps its "A + B" name and has no program', () => {
    const [group] = groupPendingAppointments([
      appt('a1', { group_id: 'g-0000-0000-0000-000000000000', service: { name: 'Corte' } }),
      appt('a2', { group_id: 'g-0000-0000-0000-000000000000', service: { name: 'Barba' } }),
    ])

    expect(group.services.name).toBe('Corte + Barba')
    expect(group.program).toBeUndefined()
  })

  it('a program charge sits next to ordinary appointments without mixing with them', () => {
    const result = groupPendingAppointments([appt('a9', { start_time: '2026-10-09T10:00:00Z' }), ...sessions])

    expect(result).toHaveLength(2)
    expect(result.filter((r: any) => r.isGroup)).toHaveLength(1)
  })
})
