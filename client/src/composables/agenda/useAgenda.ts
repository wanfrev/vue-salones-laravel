import { ref, computed } from 'vue'
import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { api as supabase } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'
import { APPOINTMENT_SELECT } from '../../services/agendaService'
import { toLocalISO } from '../../lib/formatters'
import type { Profile, Service } from '../../types/database'

function defaultWeekRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  end.setMilliseconds(-1)
  return { start, end }
}

export const useAgenda = () => {
  const authStore = useAuthStore()
  const businessStore = useBusinessStore()
  const businessId = computed(() => authStore.businessId)
  const currentBranchId = computed(() => businessStore.currentBranchId)

  const selectedEmployeeId = ref<string | 'all'>('all')
  const dateRange = ref(defaultWeekRange())

  const setDateRange = (start: Date, end: Date) => {
    dateRange.value = { start, end }
  }

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: computed(() => ['employees', businessId.value, currentBranchId.value]),
    queryFn: async (): Promise<Profile[]> => {
      if (!businessId.value) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('*, employee_schedules(*)')
        .eq('business_id', businessId.value)
        .eq('role', 'empleado')
        .eq('active', true)
        .eq('disable_agenda', false)
      if (error) throw error
      if (currentBranchId.value) {
        return (data as Profile[]).filter(p =>
          (p as any).branch_id === currentBranchId.value ||
          (p as any).employee_schedules?.some((s: any) => s.branch_id === currentBranchId.value)
        )
      }
      return data as Profile[]
    },
    enabled: computed(() => !!businessId.value),
  })

  const { data: services } = useQuery({
    queryKey: computed(() => ['services', businessId.value, currentBranchId.value]),
    queryFn: async (): Promise<Service[]> => {
      if (!businessId.value) return []
      let query = supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId.value)
        .eq('active', true)

      if (currentBranchId.value) {
        query = query.eq('branch_id', currentBranchId.value)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Service[]
    },
    enabled: computed(() => !!businessId.value),
  })

  const { data: schedules } = useQuery({
    queryKey: computed(() => ['schedules', businessId.value, selectedEmployeeId.value, currentBranchId.value]),
    queryFn: async (): Promise<any[]> => {
      if (!businessId.value) return []
      let query = supabase
        .from('employee_schedules')
        .select('*, profiles!inner(business_id)')
        .eq('profiles.business_id', businessId.value)
      if (currentBranchId.value) {
        query = query.eq('branch_id', currentBranchId.value)
      }
      if (selectedEmployeeId.value !== 'all') {
        query = query.eq('employee_id', selectedEmployeeId.value)
      }
      const { data, error } = await query
      if (error) throw error
      return data as any[]
    },
    enabled: computed(() => !!businessId.value),
  })

  const { data: appointments, isLoading: loadingAppointments, error: appointmentsError, refetch: refetchAppointments } = useQuery({
    queryKey: computed(() => ['appointments', businessId.value, selectedEmployeeId.value, currentBranchId.value, dateRange.value] as const),
    queryFn: async ({ queryKey }): Promise<any[]> => {
      const [, bizId, empId, branchId, range] = queryKey
      if (!bizId) return []
      const { start, end } = range as { start: Date; end: Date }
      let query = supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('business_id', bizId)
      if (branchId) {
        query = query.eq('branch_id', branchId)
      }
      query = query.gte('start_date', toLocalISO(start))
        .lte('end_date', toLocalISO(end))
      if (empId !== 'all') {
        query = query.or(`employee_id.eq.${empId},assistant_employee_id.eq.${empId}`)
      }
      const { data, error } = await query
      if (error) throw error
      return data as any[]
    },
    enabled: computed(() => !!businessId.value),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  return {
    selectedEmployeeId,
    dateRange,
    setDateRange,
    employees,
    loadingEmployees,
    services,
    schedules,
    appointments,
    loadingAppointments,
    appointmentsError,
    refetchAppointments,
  }
}
