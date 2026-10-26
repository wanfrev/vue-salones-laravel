/**
 * Sucursal en la que debe abrir una empleada o encargada multi-sucursal:
 *  1. la de su perfil, si es una sucursal vigente del negocio;
 *  2. si el perfil no tiene sucursal, la ÚNICA en la que tiene horarios;
 *  3. si trabaja en varias (o en ninguna), no se decide aquí (devuelve null) y el store usa la
 *     última elegida o la predeterminada. Antes se tomaba un horario cualquiera, sin orden, y una
 *     empleada de Terraza 77 podía abrir en Premier y no ver ninguna de sus citas ni ganancias.
 */
export function pickEmployeeBranch(
  profileBranchId: string | null | undefined,
  scheduleBranchIds: ReadonlyArray<string | null | undefined>,
  validBranchIds: ReadonlyArray<string>,
): string | null {
  if (profileBranchId && validBranchIds.includes(profileBranchId)) return profileBranchId

  const fromSchedules = [...new Set(scheduleBranchIds.filter((id): id is string => !!id && validBranchIds.includes(id)))]

  return fromSchedules.length === 1 ? fromSchedules[0] : null
}
