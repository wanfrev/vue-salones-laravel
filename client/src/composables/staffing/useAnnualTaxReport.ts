import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  deleteTaxEntry,
  deleteTaxEntryFile,
  viewTaxEntryFile,
  getAnnualTaxReport,
  saveTaxEntry,
  saveAnnualTaxGlobal,
  updateStaffingEmployeeProfile,
  viewGlobalTaxFile,
  deleteGlobalTaxFile,
  type StaffingTaxEntryFormData,
  type StaffingAnnualTaxGlobalFormData,
} from '../../services/staffing/staffingService'

const queryKey = (businessId: string | null, year: number) => ['staffing-annual-tax', businessId, year] as const

/** The annual taxes grid — employees x configurable tax entities — plus the per-cell mutation. */
export function useAnnualTaxReport(businessId: Ref<string | null>, year: Ref<number>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const key = computed(() => queryKey(businessId.value, year.value))

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getAnnualTaxReport(year.value),
    enabled: computed(() => !!businessId.value),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key.value, exact: false })

  const saveMutation = useMutation({
    mutationFn: (form: StaffingTaxEntryFormData) => saveTaxEntry(form),
    onSuccess: async () => {
      await invalidate()
      success('Registro guardado')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxEntry(id),
    onSuccess: async () => {
      await invalidate()
      success('Registro eliminado')
    },
    onError: (err) => showError(translateError(err)),
  })

  const saveEntry = async (form: StaffingTaxEntryFormData) => {
    saveError.value = ''
    try {
      await saveMutation.mutateAsync(form)
      return true
    } catch {
      return false
    }
  }

  const saveGlobalMutation = useMutation({
    mutationFn: (form: StaffingAnnualTaxGlobalFormData) => saveAnnualTaxGlobal(form),
    onSuccess: async () => {
      await invalidate()
      success('Datos globales guardados')
    },
    onError: (err) => showError(translateError(err)),
  })

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) => updateStaffingEmployeeProfile(employeeId, data),
    onSuccess: async () => {
      await invalidate()
      success('Datos del empleado actualizados')
    },
    onError: (err) => showError(translateError(err)),
  })

  const viewFile = async (entryId: string) => {
    try {
      await viewTaxEntryFile(entryId)
    } catch (err) {
      showError(translateError(err))
    }
  }

  const deleteFileMutation = useMutation({
    mutationFn: (entryId: string) => deleteTaxEntryFile(entryId),
    onSuccess: async () => { await invalidate(); success('Archivo eliminado') },
    onError: (err) => showError(translateError(err, 'No se pudo eliminar el archivo.')),
  })

  const viewGlobalFile = async (employeeId: string) => {
    try {
      await viewGlobalTaxFile(employeeId, year.value)
    } catch (err) {
      showError(translateError(err))
    }
  }

  const deleteGlobalFileMutation = useMutation({
    mutationFn: (employeeId: string) => deleteGlobalTaxFile(employeeId, year.value),
    onSuccess: async () => { await invalidate(); success('Archivo eliminado') },
    onError: (err) => showError(translateError(err, 'No se pudo eliminar el archivo.')),
  })

  return {
    entities: computed(() => data.value?.entities ?? []),
    employees: computed(() => data.value?.employees ?? []),
    isLoading,
    saveError,
    saveMutation,
    deleteMutation,
    saveEntry,
    saveGlobalEntry: async (form: any) => saveGlobalMutation.mutateAsync(form),
    updateEmployee: async (employeeId: string, data: any) => updateEmployeeMutation.mutateAsync({ employeeId, data }),
    removeEntry: (id: string) => deleteMutation.mutate(id),
    viewFile,
    removeFile: (entryId: string) => deleteFileMutation.mutate(entryId),
    viewGlobalFile,
    removeGlobalFile: (employeeId: string) => deleteGlobalFileMutation.mutate(employeeId),
  }
}
