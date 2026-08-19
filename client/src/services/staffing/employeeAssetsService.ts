import { apiRequest } from '../../lib/api'

export type AssetType = 'vehiculo' | 'telefono' | 'laptop' | 'otro'

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'vehiculo', label: 'Vehículo' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'otro', label: 'Otro' },
]

export interface EmployeeAsset {
  id: string
  employeeId: string
  assetType: AssetType
  description: string
}

interface EmployeeAssetRow {
  id: string
  employee_id: string
  asset_type: AssetType
  description: string
}

const toEmployeeAsset = (row: EmployeeAssetRow): EmployeeAsset => ({
  id: row.id,
  employeeId: row.employee_id,
  assetType: row.asset_type,
  description: row.description,
})

/** Material items (vehicle, phone, laptop, etc.) assigned to one employee. */
export const listEmployeeAssets = async (employeeId: string): Promise<EmployeeAsset[]> => {
  const rows = await apiRequest<EmployeeAssetRow[]>('GET', `/employee-assets?employee_id=${employeeId}`)
  return rows.map(toEmployeeAsset)
}

export const createEmployeeAsset = async (
  employeeId: string,
  assetType: AssetType,
  description: string,
): Promise<EmployeeAsset> => {
  const row = await apiRequest<EmployeeAssetRow>('POST', '/employee-assets', {
    employee_id: employeeId,
    asset_type: assetType,
    description,
  })
  return toEmployeeAsset(row)
}

export const updateEmployeeAsset = async (
  id: string,
  assetType: AssetType,
  description: string,
): Promise<EmployeeAsset> => {
  const row = await apiRequest<EmployeeAssetRow>('PUT', `/employee-assets/${id}`, {
    asset_type: assetType,
    description,
  })
  return toEmployeeAsset(row)
}

export const deleteEmployeeAsset = (id: string): Promise<void> =>
  apiRequest<void>('DELETE', `/employee-assets/${id}`)
