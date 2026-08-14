import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  approveTimesheet,
  deleteTimesheet,
  listCompanyEmployees,
  listStaffingTimesheets,
  saveTimesheetWeek,
  staffingTimesheetKeys,
  type TimesheetEntryInput,
} from '../../services/staffing/staffingService'

/**
 * Hours entry for one company: who can be paid (employees pinned to this company), which weeks
 * already exist, and saving/approving a week. Mirrors the NOMINA sheet's "one company, one week,
 * a row per employee" shape.
 */
export function useTimesheets(businessId: Ref<string | null>, companyId: Ref<string | null>) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const saveError = ref('')

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: computed(() => staffingTimesheetKeys.employees(businessId.value, companyId.value)),
    queryFn: () => listCompanyEmployees(businessId.value!, companyId.value!),
    enabled: computed(() => !!businessId.value && !!companyId.value),
  })

  const { data: timesheets, isLoading: timesheetsLoading } = useQuery({
    queryKey: computed(() => staffingTimesheetKeys.byCompany(businessId.value, companyId.value)),
    queryFn: () => listStaffingTimesheets(businessId.value!, companyId.value),
    enabled: computed(() => !!businessId.value && !!companyId.value),
  })

  /** The already-saved week matching this start date, if the sheet for it has been opened before. */
  const findWeek = (weekStart: string) =>
    (timesheets.value ?? []).find(t => t.week_start === weekStart) ?? null

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: staffingTimesheetKeys.byCompany(businessId.value, companyId.value),
      exact: false,
    })

  const saveMutation = useMutation({
    mutationFn: (input: { weekStart: string; weekEnd: string; entries: TimesheetEntryInput[] }) =>
      saveTimesheetWeek(companyId.value!, input.weekStart, input.weekEnd, input.entries),
    onSuccess: async () => {
      await invalidate()
      success('Horas guardadas')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTimesheet(id),
    onSuccess: async () => {
      await invalidate()
      success('Semana aprobada')
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTimesheet(id),
    onSuccess: async () => {
      await invalidate()
      success('Semana eliminada')
    },
    onError: (err) => {
      showError(translateError(err))
    },
  })

  const save = async (weekStart: string, weekEnd: string, entries: TimesheetEntryInput[]) => {
    saveError.value = ''
    try {
      return await saveMutation.mutateAsync({ weekStart, weekEnd, entries })
    } catch {
      return null // reported through saveError + toast
    }
  }

  const approve = async (id: string) => {
    saveError.value = ''
    try {
      await approveMutation.mutateAsync(id)
      return true
    } catch {
      return false
    }
  }

  return {
    employees,
    employeesLoading,
    timesheets,
    timesheetsLoading,
    findWeek,
    saveError,
    saveMutation,
    approveMutation,
    save,
    approve,
    remove: (id: string) => deleteMutation.mutate(id),
  }
}
