import type { Ref } from 'vue'
import { useCrud } from '../empleados/useCrud'
import {
  deleteStaffingTaxEntity,
  listStaffingTaxEntities,
  saveStaffingTaxEntity,
  staffingTaxEntityKeys,
  type StaffingTaxEntityFormData,
  type StaffingTaxEntityRow,
} from '../../services/staffing/staffingService'

/** The configurable $-columns of the annual taxes report — plain list+save+delete. */
export function useStaffingTaxEntities(businessId: Ref<string | null>) {
  const crud = useCrud<StaffingTaxEntityRow, StaffingTaxEntityFormData>({
    businessId,
    queryKey: (id) => staffingTaxEntityKeys.all(id),
    queryFn: (id) => listStaffingTaxEntities(id),
    saveFn: (id, data) => saveStaffingTaxEntity(id, data),
    deleteFn: (id) => deleteStaffingTaxEntity(id),
    entityName: 'Entidad de tax',
  })

  return {
    ...crud,
    entities: crud.items,
  }
}
