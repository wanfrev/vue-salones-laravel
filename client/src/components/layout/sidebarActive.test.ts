import { describe, expect, it } from 'vitest'
import { matchNavPath } from './sidebarActive'

const admin = [
  '/admin/calendario', '/admin', '/admin/pos', '/admin/clientes', '/admin/finanzas',
  '/admin/configuracion/general', '/admin/configuracion/permisos',
]

describe('matchNavPath', () => {
  it('coincide con la ruta exacta', () => {
    expect(matchNavPath('/admin/clientes', admin)).toBe('/admin/clientes')
    expect(matchNavPath('/admin', admin)).toBe('/admin')
  })

  it('mantiene activa la opción en sus pantallas internas', () => {
    expect(matchNavPath('/admin/clientes/abc-123', admin)).toBe('/admin/clientes')
    expect(matchNavPath('/admin/clientes/abc-123/expediente-clinico/sesiones', admin)).toBe('/admin/clientes')
    expect(matchNavPath('/admin/finanzas/registros/cobros', admin)).toBe('/admin/finanzas')
  })

  it('una ruta raíz (/admin) solo cuenta exacta: no se marca en pantallas sin opción propia', () => {
    expect(matchNavPath('/admin/mi-perfil', admin)).toBeNull()
    expect(matchNavPath('/admin/algo/profundo', admin)).toBeNull()
  })

  it('no confunde prefijos de texto con prefijos de ruta', () => {
    expect(matchNavPath('/admin/clientes-vip', admin)).toBeNull()
    expect(matchNavPath('/admin/posx', admin)).toBeNull()
  })

  it('en grupos gana el hijo exacto', () => {
    expect(matchNavPath('/admin/configuracion/permisos', admin)).toBe('/admin/configuracion/permisos')
    expect(matchNavPath('/admin/configuracion/general', admin)).toBe('/admin/configuracion/general')
  })

  it('funciona igual con las rutas del empleado', () => {
    const emp = ['/dashboard/agenda', '/dashboard/clientes', '/dashboard/recibo']
    expect(matchNavPath('/dashboard/clientes/xyz', emp)).toBe('/dashboard/clientes')
    expect(matchNavPath('/dashboard/otra', emp)).toBeNull()
  })

  it('sin opciones visibles no marca nada', () => {
    expect(matchNavPath('/admin/clientes', [])).toBeNull()
  })
})
