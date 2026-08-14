import { computed, ref, type Ref } from 'vue'
import { useCrud } from '../empleados/useCrud'
import { useBusinessStore } from '../../store/business'
import {
  deleteStaffingCompany,
  listStaffingCompanies,
  listStaffingRates,
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
  taxRate: 0.04,
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

  const openEdit = async (company: StaffingCompanyRow) => {
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
      taxRate: company.taxRate,
      roles: [],
      payoutRounding: company.payoutRounding,
      status: company.status,
      notes: company.notes,
    }
    showModal.value = true

    try {
      if (businessId.value) {
        const rates = await listStaffingRates(businessId.value, company.id)
        form.value.roles = rates.map(r => ({
          role: r.role,
          payRate: r.payRate,
          billRate: r.billRate,
          overtimeThresholdHours: r.overtimeThresholdHours ?? 40,
          overtimePayRate: r.overtimePayRate ?? undefined,
          overtimeBillRate: r.overtimeBillRate ?? undefined,
        }))
      }
    } catch (err) {
      console.error('Error al cargar tarifas de la empresa:', err)
    }
  }

  const closeModal = () => {
    showModal.value = false
    editingId.value = null
  }

  const isSaving = ref(false)

  const handleSave = async () => {
    crud.saveError.value = ''
    isSaving.value = true

    const payload = editingId.value
      ? { ...form.value, id: editingId.value }
      : { ...form.value }

    try {
      if (!businessId.value) throw new Error('No hay negocio activo')

      const savedCompany = await saveStaffingCompany(businessId.value, payload, branchId.value)
      
      // Save roles if they exist
      if (form.value.roles && form.value.roles.length > 0) {
        for (const role of form.value.roles) {
          const multiplier = role.overtimePayRate && role.payRate > 0
            ? Number((role.overtimePayRate / role.payRate).toFixed(2))
            : null

          await saveStaffingRate(businessId.value, {
            companyId: savedCompany.id,
            role: role.role,
            payRate: role.payRate,
            billRate: role.billRate,
            overtimeThresholdHours: role.overtimeThresholdHours,
            overtimeMultiplier: multiplier,
            overtimePayRate: role.overtimePayRate || null,
            overtimeBillRate: role.overtimeBillRate || null,
          })
        }
      }

      await crud.invalidateAll()
      closeModal()
    } catch (err) {
      crud.saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }

  const addRole = () => {
    form.value.roles.push({
      role: '',
      payRate: 0,
      billRate: 0,
      overtimeThresholdHours: 40,
      overtimePayRate: 0,
      overtimeBillRate: 0,
    })
  }

  const removeRole = (index: number) => {
    form.value.roles.splice(index, 1)
  }

  return {
    ...crud,
    isSaving: computed(() => isSaving.value || crud.isSaving.value),
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
