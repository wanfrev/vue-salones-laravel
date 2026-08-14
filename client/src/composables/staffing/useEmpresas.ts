import { computed, ref, type Ref } from 'vue'
import { useCrud } from '../empleados/useCrud'
import { useBusinessStore } from '../../store/business'
import {
  deleteStaffingCompany,
  listStaffingCompanies,
  saveStaffingCompany,
  saveStaffingRate,
  staffingCompanyKeys,
  type StaffingCompanyFormData,
  type StaffingCompanyRow,
} from '../../services/staffing/staffingService'

const emptyForm = (): StaffingCompanyFormData => ({
  name: '',
  legalName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  workSite: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  paymentTermsDays: 15,
  overtimeThresholdHours: 40,
  overtimeMultiplier: 1.5,
  roles: [],
  payoutRounding: 'cent',
  status: 'active',
  notes: '',
})

export function useEmpresas(businessId: Ref<string | null>) {
  const businessStore = useBusinessStore()
  const branchId = computed(() => businessStore.currentBranchId)

  const showModal = ref(false)
  const editingId = ref<string | null>(null)
  const form = ref<StaffingCompanyFormData>(emptyForm())

  const crud = useCrud<StaffingCompanyRow, StaffingCompanyFormData>({
    businessId,
    branchId,
    queryKey: (id, brId) => staffingCompanyKeys.all(id, brId),
    // 'all' — the status tabs on Empresas.vue filter this same list client-side, rather than
    // refetching per tab.
    queryFn: (id, brId) => listStaffingCompanies(id, brId, 'all'),
    saveFn: (id, data, brId) => saveStaffingCompany(id, data, brId),
    deleteFn: (id) => deleteStaffingCompany(id),
    entityName: 'Empresa',
  })

  const companiesByStatus = computed(() => ({
    active: crud.items.value.filter(c => c.status === 'active'),
    inactive: crud.items.value.filter(c => c.status === 'inactive'),
    on_hold: crud.items.value.filter(c => c.status === 'on_hold'),
  }))

  const openNew = () => {
    editingId.value = null
    form.value = emptyForm()
    showModal.value = true
  }

  const openEdit = (company: StaffingCompanyRow) => {
    editingId.value = company.id
    form.value = {
      name: company.name,
      legalName: company.legalName,
      address: company.address,
      city: company.city,
      state: company.state,
      zip: company.zip,
      workSite: company.workSite,
      contactName: company.contactName,
      contactPhone: company.contactPhone,
      contactEmail: company.contactEmail,
      paymentTermsDays: company.paymentTermsDays,
      overtimeThresholdHours: company.overtimeThresholdHours,
      overtimeMultiplier: company.overtimeMultiplier,
      roles: [], // We could fetch existing rates here, but for now we initialize empty or with existing
      payoutRounding: company.payoutRounding,
      status: company.status,
      notes: company.notes,
    }
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    editingId.value = null
  }

  const handleSave = async () => {
    const payload = editingId.value
      ? { ...form.value, id: editingId.value }
      : { ...form.value }

    try {
      const savedCompany = await crud.saveFn(payload.id || null, payload, branchId.value)
      
      // Save roles if they exist
      if (form.value.roles && form.value.roles.length > 0) {
        for (const role of form.value.roles) {
          await saveStaffingRate(businessId.value!, {
            companyId: savedCompany.id,
            role: role.role,
            payRate: role.payRate,
            billRate: role.billRate,
            overtimeThresholdHours: null,
            overtimeMultiplier: role.overtimePayRate ? Number((role.overtimePayRate / role.payRate).toFixed(2)) : null,
          })
        }
      }

      await crud.queryClient.invalidateQueries({ queryKey: crud.queryKey(null, branchId.value), exact: false })
      closeModal()
    } catch (err) {
      crud.saveError.value = err instanceof Error ? err.message : String(err)
    }
  }

  const addRole = () => {
    form.value.roles.push({ role: '', payRate: 0, billRate: 0 })
  }

  const removeRole = (index: number) => {
    form.value.roles.splice(index, 1)
  }

  return {
    ...crud,
    companies: crud.items,
    companiesByStatus,
    showModal,
    editingId,
    form,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    addRole,
    removeRole,
  }
}
