import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { db } from '../lib/api'
import { listBranches, branchesKeys } from '../services/branchesService'
import type { Business, Terminology, Branch } from '../types/database'

const DEFAULT_TERMINOLOGY: Terminology = {
  client: 'Cliente',
  employee: 'Empleado',
  service: 'Servicio',
  appointment: 'Cita',
  staff: 'Personal',
  pet: 'Mascota',
  owner: 'Dueño',
  breed: 'Raza',
  weight: 'Peso',
  vaccines: 'Vacunas',
}

  const DEFAULT_FEATURES = {
    pos: true,
    inventario: true,
    productos: true,
    proveedores: true,
    multi_branch: false,
    employees_create_clients: true,
    gift_cards: true,
    disable_manager_inventory_edit: false,
    encargados_change_exchange_rate: false,
    encargados_change_employee_rate: false,
  }

export type FeatureKey = keyof typeof DEFAULT_FEATURES

function branchStorageKey(businessId: string): string {
  return `luma_selected_branch_${businessId}`
}

export const useBusinessStore = defineStore('business', () => {
  const business = ref<Business | null>(null)
  const loading = ref(false)
  const selectedBranchId = ref<string | null>(null)
  const _restoreProfileId = ref<string | null>(null)

  const nicheType = computed(() => business.value?.niche_type ?? 'salon')
  const terminology = computed(() => ({ ...DEFAULT_TERMINOLOGY, ...(business.value?.terminology ?? {}) }))
  const jobTitles = computed(() => business.value?.job_titles ?? [])
  const serviceCategories = computed(() => business.value?.service_categories ?? [])
  const branchServiceCategories = computed(() => {
    if (!isMultiBranch.value || !currentBranch.value) return serviceCategories.value
    return (currentBranch.value as any).service_categories ?? []
  })
  const features = computed(() => ({ ...DEFAULT_FEATURES, ...(business.value as any)?.features }))
  const hasFeature = (key: FeatureKey): boolean => features.value[key]
  const isMultiBranch = computed(() => features.value.multi_branch)
  const employeeExchangeRate = computed(() => {
    const r = (business.value as any)?.employee_ves_rate
    return r != null && r > 0 ? Number(r) : null
  })

  // Branches via TanStack Query — single source of truth
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: computed(() => branchesKeys.all(business.value?.id)),
    queryFn: () => listBranches(business.value!.id),
    enabled: computed(() => !!business.value?.id && isMultiBranch.value),
  })

  const branches = computed<Branch[]>(() => branchesData.value ?? [])

  const currentBranch = computed(() =>
    selectedBranchId.value ? branches.value.find(b => b.id === selectedBranchId.value) ?? null : null
  )

  const currentBranchId = computed(() => {
    if (!isMultiBranch.value) return null
    return selectedBranchId.value ?? null
  })

  const loadBusiness = async (nextBusinessId: string | null, employeeId?: string) => {
    if (!nextBusinessId) {
      business.value = null
      selectedBranchId.value = null
      return
    }

    loading.value = true
    try {
      const { data, error } = await db
        .from('businesses')
        .select('id, name, slug, phone, address, timezone, currency, ves_exchange_rate, employee_ves_rate, niche_type, theme_config, terminology, job_titles, service_categories, features, multi_branch_enabled, active')
        .eq('id', nextBusinessId)
        .single()

      if (error) throw error

      if ((data as any).deleted_at) {
        business.value = null
        throw new Error('El negocio ha sido dado de baja.')
      }

      business.value = data as Business

      _restoreProfileId.value = employeeId ?? null
      restoreBranchSelection(employeeId)
    } finally {
      loading.value = false
    }
  }

  const loadBranches = async (businessId: string, employeeId?: string) => {
    // Branches are managed by TanStack Query. This shim invalidates + refetches.
    const queryClient = useQueryClient()
    await queryClient.invalidateQueries({ queryKey: branchesKeys.all(businessId) })
    await queryClient.refetchQueries({ queryKey: branchesKeys.all(businessId) })
    await restoreBranchSelection(employeeId)
  }

  async function restoreBranchSelection(employeeId?: string) {
    const bizId = business.value?.id
    if (!bizId || !isMultiBranch.value || branches.value.length === 0) return

    if (employeeId) {
      const { data: profile } = await db
        .from('profiles')
        .select('branch_id')
        .eq('id', employeeId)
        .limit(1)
        .maybeSingle()

      if (profile?.branch_id && branches.value.some(b => b.id === profile.branch_id)) {
        selectedBranchId.value = profile.branch_id
        localStorage.setItem(branchStorageKey(bizId), profile.branch_id)
        return
      }

      const { data: schedule } = await db
        .from('employee_schedules')
        .select('branch_id')
        .eq('employee_id', employeeId)
        .limit(1)
        .maybeSingle()

      if (schedule?.branch_id && branches.value.some(b => b.id === schedule.branch_id)) {
        selectedBranchId.value = schedule.branch_id
        localStorage.setItem(branchStorageKey(bizId), schedule.branch_id)
        return
      }
    }

    const saved = localStorage.getItem(branchStorageKey(bizId))
    if (saved && branches.value.some(b => b.id === saved)) {
      selectedBranchId.value = saved
    } else {
      const def = branches.value.find(b => b.is_default) ?? branches.value[0] ?? null
      selectedBranchId.value = def?.id ?? null
    }
  }

  const setBranch = (branchId: string | null) => {
    selectedBranchId.value = branchId
    if (business.value?.id && branchId) {
      localStorage.setItem(branchStorageKey(business.value.id), branchId)
    } else if (business.value?.id) {
      localStorage.removeItem(branchStorageKey(business.value.id))
    }
  }

  const clearBusiness = () => {
    business.value = null
    selectedBranchId.value = null
  }

  // Select default branch when branches load and none is selected
  watch(branches, (list) => {
    if (list.length > 0 && !selectedBranchId.value) {
      restoreBranchSelection(_restoreProfileId.value ?? undefined)
    }
  })

  const updateBusiness = (partial: Partial<Business>) => {
    if (business.value) {
      business.value = { ...business.value, ...partial }
    }
  }

  const updateBranch = (partial: Partial<Branch>) => {
    if (currentBranch.value) {
      Object.assign(currentBranch.value, partial)
    }
  }

  return {
    business,
    loading,
    branches,
    branchesLoading,
    selectedBranchId,
    currentBranch,
    currentBranchId,
    nicheType,
    terminology,
    jobTitles,
    serviceCategories,
    branchServiceCategories,
    isMultiBranch,
    employeeExchangeRate,
    features,
    hasFeature,
    loadBusiness,
    loadBranches,
    setBranch,
    clearBusiness,
    updateBusiness,
    updateBranch,
  }
})
