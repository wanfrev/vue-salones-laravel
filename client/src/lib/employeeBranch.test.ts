import { describe, it, expect } from 'vitest'
import { pickEmployeeBranch } from './employeeBranch'

const PREMIER = 'branch-premier'
const TERRAZA = 'branch-terraza'
const BRANCHES = [PREMIER, TERRAZA]

describe('pickEmployeeBranch', () => {
  it('usa la sucursal de su perfil', () => {
    expect(pickEmployeeBranch(TERRAZA, [], BRANCHES)).toBe(TERRAZA)
    expect(pickEmployeeBranch(TERRAZA, [PREMIER], BRANCHES)).toBe(TERRAZA)
  })

  it('sin sucursal en el perfil, usa la única en la que tiene horarios (aunque haya varios horarios)', () => {
    expect(pickEmployeeBranch(null, [TERRAZA], BRANCHES)).toBe(TERRAZA)
    expect(pickEmployeeBranch(undefined, [TERRAZA, TERRAZA, null], BRANCHES)).toBe(TERRAZA)
  })

  it('con horarios en dos sucursales no elige una al azar', () => {
    expect(pickEmployeeBranch(null, [PREMIER, TERRAZA], BRANCHES)).toBeNull()
    expect(pickEmployeeBranch(null, [TERRAZA, PREMIER], BRANCHES)).toBeNull()
  })

  it('ignora sucursales que ya no existen o están inactivas', () => {
    expect(pickEmployeeBranch('branch-borrada', [TERRAZA], BRANCHES)).toBe(TERRAZA)
    expect(pickEmployeeBranch('branch-borrada', ['otra-borrada'], BRANCHES)).toBeNull()
  })

  it('sin perfil ni horarios no decide', () => {
    expect(pickEmployeeBranch(null, [], BRANCHES)).toBeNull()
  })
})
