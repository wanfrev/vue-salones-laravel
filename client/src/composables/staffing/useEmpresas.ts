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
  getStaffingProjects,
  createStaffingProject,
  updateStaffingProject,
  deleteStaffingProject,
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
  taxRate: 0.04,
  taxBrackets: null,
  roles: [],
  payoutRounding: 'cent',
  status: 'active',
  notes: '',
  projects: [],
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
      paymentTermsDays: company.paymentTermsDays,
      taxRate: company.taxRate,
      taxBrackets: company.taxBrackets,
      roles: [],
      payoutRounding: company.payoutRounding,
      status: company.status,
      notes: company.notes,
      projects: [],
    }
    showModal.value = true

    try {
      if (businessId.value) {
        const rates = await listStaffingRates(businessId.value, company.id)
        form.value.roles = rates.map(r => ({
          role: r.role,
          shift: r.shift,
          payRate: r.payRate,
          billRate: r.billRate,
          overtimeThresholdHours: r.overtimeThresholdHours ?? 40,
          overtimePayRate: r.overtimePayRate ?? undefined,
          overtimeBillRate: r.overtimeBillRate ?? undefined,
        }))

        const projs = await getStaffingProjects(company.id)
        form.value.projects = projs.map(p => ({
          id: p.id,
          name: p.name,
          active: p.active,
        }))
      }
    } catch (err) {
      console.error('Error al cargar tarifas o proyectos de la empresa:', err)
    }
  }

  const closeModal = () => {
    showModal.value = false
    editingId.value = null
  }

  // Spans the whole save (company + roles), unlike crud.isSaving — that one only tracks the
  // company mutation and would flip back to false while the roles loop below is still running.
  const isSaving = ref(false)

  const handleSave = async () => {
    crud.saveError.value = ''
    isSaving.value = true

    const payload = editingId.value
      ? { ...form.value, id: editingId.value }
      : { ...form.value }

    try {
      // Not crud.handleSave() here: that helper doesn't hand back the saved row, and the roles
      // loop below needs the new company's id. saveMutation is the same TanStack mutation
      // handleSave wraps — mutateAsync resolves to whatever saveStaffingCompany() returns.
      const savedCompany = await crud.saveMutation.mutateAsync(payload)
      // saveFn's generic type allows `void`, but saveStaffingCompany() always resolves to the
      // row — this only guards the type, it isn't expected to trigger.
      if (!savedCompany) {
        throw new Error('No se pudo guardar la empresa.')
      }

      if (form.value.roles && form.value.roles.length > 0) {
        for (const role of form.value.roles) {
          await saveStaffingRate(businessId.value!, {
            companyId: savedCompany.id,
            role: role.role,
            shift: role.shift ?? null,
            payRate: role.payRate,
            billRate: role.billRate,
            overtimeThresholdHours: role.overtimeThresholdHours,
            // No derived multiplier — sending pay_rate * X as a fake "OT rate" here would let
            // the backend re-derive an OT BILL rate from it too (see StaffingPayrollCalculator),
            // silently overriding whatever "Cobra OT ($)" was actually typed below. Overtime
            // multiplier stays null (falls back to the 1.5x federal default) unless the admin
            // explicitly sets both $ rates.
            overtimeMultiplier: null,
            overtimePayRate: role.overtimePayRate || null,
            overtimeBillRate: role.overtimeBillRate || null,
          })
        }
      }

      // Save projects:
      const existingProjects = editingId.value
        ? await getStaffingProjects(editingId.value)
        : []

      const currentProjects = form.value.projects || []

      for (const p of currentProjects) {
        if (!p.id) {
          await createStaffingProject(savedCompany.id, { name: p.name, active: p.active ?? true })
        } else {
          const orig = existingProjects.find(ep => ep.id === p.id)
          if (orig && (orig.name !== p.name || orig.active !== p.active)) {
            await updateStaffingProject(savedCompany.id, p.id, { name: p.name, active: p.active })
          }
        }
      }

      for (const ep of existingProjects) {
        if (!currentProjects.some(cp => cp.id === ep.id)) {
          await deleteStaffingProject(savedCompany.id, ep.id)
        }
      }

      await crud.invalidateAll()
      closeModal()
    } catch (err) {
      // The company mutation's own onError (in useCrud) already sets saveError + shows a toast;
      // this only fires for a failure in the roles loop above, which that handler never sees.
      if (!crud.saveError.value) {
        crud.saveError.value = err instanceof Error ? err.message : String(err)
      }
    } finally {
      isSaving.value = false
    }
  }

  const addRole = () => {
    form.value.roles.push({
      role: '',
      shift: null,
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
