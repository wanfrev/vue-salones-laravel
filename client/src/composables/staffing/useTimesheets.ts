import { computed, ref, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useNotification } from '../common/useNotification'
import { translateError } from '../../lib/errors'
import {
  approveTimesheet,
  deleteTimesheet,
  listCompanyEmployees,
  listStaffingTimesheets,
  markTimesheetPaid,
  saveTimesheetWeek,
  staffingTimesheetKeys,
  type ApprovalSigner,
  type TimesheetEntryInput,
} from '../../services/staffing/staffingService'
import { previousWeekStart } from '../../lib/staffingCopyWeek'
import { useI18n } from '../../i18n'

/**
 * Hours entry for one company: who can be paid (employees pinned to this company), which weeks
 * already exist, and saving/approving a week. Mirrors the NOMINA sheet's "one company, one week,
 * a row per employee" shape.
 */
export function useTimesheets(
  businessId: Ref<string | null>,
  companyId: Ref<string | null>,
  projectId: Ref<string | null>,
  /**
   * The week being worked on. When given, only that week and the one before it are loaded (the only two
   * the screen reads: the sheet itself and "copiar semana anterior") instead of the company's whole history.
   * Omit it to load everything, as before.
   */
  weekStart?: Ref<string>,
) {
  const queryClient = useQueryClient()
  const { success, error: showError } = useNotification()
  const { t } = useI18n()
  const saveError = ref('')

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: computed(() => ['staffing-company-employees', businessId.value, companyId.value, projectId.value]),
    queryFn: () => listCompanyEmployees(businessId.value!, companyId.value!, projectId.value!),
    enabled: computed(() => !!businessId.value && !!companyId.value),
  })

  const weekWindow = computed(() => {
    const week = weekStart?.value
    return week ? { from: previousWeekStart(week), to: week } : undefined
  })

  const { data: timesheets, isLoading: timesheetsLoading, isError: timesheetsError } = useQuery({
    // Starts with the same prefix as before, so every invalidation by company still reaches it.
    queryKey: computed(() => ['staffing-timesheets', businessId.value, companyId.value, projectId.value, weekWindow.value?.from ?? null, weekWindow.value?.to ?? null]),
    queryFn: () => listStaffingTimesheets(businessId.value!, companyId.value, projectId.value!, weekWindow.value),
    enabled: computed(() => !!businessId.value && !!companyId.value),
  })

  /**
   * The already-saved week matching this start date, if the sheet for it has been opened before.
   * Compares on the first 10 chars, not strict equality — Eloquent's `date` cast serializes
   * week_start as a full ISO datetime ("2026-08-10T00:00:00.000000Z"), not the bare "2026-08-10"
   * the <input type="date"> works with, so a strict `===` here never matched anything and every
   * previously-saved week silently looked empty.
   *
   * Also matches on project_id (null-safe): `timesheets` can hold every project's sheets for
   * this company at once (see listStaffingTimesheets), and saveTimesheetWeek scopes its
   * find-or-create by (company, project, week) — without this check, viewing "General" for a
   * week that only has a project-specific sheet would show that project's hours, and saving
   * would then create a *different* general sheet instead of updating what was actually shown.
   */
  const findWeek = (weekStart: string) =>
    (timesheets.value ?? []).find(t =>
      t.week_start.slice(0, 10) === weekStart && (t.project_id ?? null) === (projectId.value ?? null)
    ) ?? null

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['staffing-timesheets', businessId.value, companyId.value],
      exact: false,
    })

  const saveMutation = useMutation({
    mutationFn: (input: { weekStart: string; weekEnd: string; entries: TimesheetEntryInput[] }) =>
      saveTimesheetWeek(companyId.value!, input.weekStart, input.weekEnd, input.entries, projectId.value!),
    onSuccess: async () => {
      await invalidate()
      success(t('toast.hoursSaved'))
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (input: { id: string; signer?: ApprovalSigner }) => approveTimesheet(input.id, input.signer),
    onSuccess: async () => {
      await invalidate()
      success(t('toast.weekApproved'))
    },
    onError: (err) => {
      saveError.value = translateError(err)
      showError(saveError.value)
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => markTimesheetPaid(id),
    onSuccess: async () => {
      await invalidate()
      success(t('toast.weekPaid'))
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
      success(t('toast.weekDeleted'))
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

  const approve = async (id: string, signer?: ApprovalSigner) => {
    saveError.value = ''
    try {
      await approveMutation.mutateAsync({ id, signer })
      return true
    } catch {
      return false
    }
  }

  const markPaid = async (id: string) => {
    saveError.value = ''
    try {
      await markPaidMutation.mutateAsync(id)
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
    // True when the week could not be loaded: it must not be treated as an empty week to save over.
    timesheetsError,
    findWeek,
    saveError,
    saveMutation,
    approveMutation,
    markPaidMutation,
    save,
    approve,
    markPaid,
    remove: (id: string) => deleteMutation.mutate(id),
  }
}
