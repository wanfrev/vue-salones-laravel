/**
 * Qué opción del menú corresponde a la ruta actual.
 *
 * Una opción está activa en su ruta exacta y en sus pantallas internas (`/admin/clientes/123`,
 * `/admin/finanzas/registros/cobros`). Ganan el prefijo más largo, y una ruta "raíz" -- que es
 * prefijo de otras opciones del menú, como `/admin` (Agenda) -- solo cuenta con coincidencia
 * exacta: si no, Agenda se marcaría en cualquier pantalla que no tenga opción propia.
 */
export function matchNavPath(path: string, navPaths: string[]): string | null {
  let best: string | null = null
  for (const to of navPaths) {
    const isRoot = navPaths.some(p => p !== to && p.startsWith(`${to}/`))
    const matches = path === to || (!isRoot && path.startsWith(`${to}/`))
    if (matches && (!best || to.length > best.length)) best = to
  }
  return best
}
