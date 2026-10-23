import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'

// 120 empleados falsos: más de las 50 filas que se dibujan por tanda.
const N = 120
const employees = Array.from({ length: N }, (_, i) => ({
  employeeId: `e${i}`, name: `Empleado ${i}`, active: true, companies: [], paymentMethod: 'Cash', weeklyHours: {},
  companyId: null, companyName: null, phone: null, address: null, ssnLast4: null, status: 'BLANK',
  globalFilePath: null, globalFileName: null, globalFileDate: null, entriesByEntity: {},
}))

vi.mock('../../composables/staffing/useEmployeeHoursMatrix', () => ({
  useEmployeeHoursMatrix: () => ({ weeks: ref([{ week_start: '2026-01-04', label: '4 ene' }]), employees: ref(employees), isLoading: ref(false) }),
}))
vi.mock('../../composables/staffing/useCompanyHoursSummary', () => ({
  useCompanyHoursSummary: () => ({ rows: ref([]), isLoading: ref(false) }),
}))
vi.mock('../../composables/staffing/useAnnualTaxReport', () => ({
  useAnnualTaxReport: () => ({
    entities: computed(() => []), employees: computed(() => employees), isLoading: ref(false), saveError: ref(''),
    saveMutation: { isPending: ref(false) }, deleteMutation: {}, saveEntry: vi.fn(), saveGlobalEntry: vi.fn(), updateEmployee: vi.fn(),
    removeEntry: vi.fn(), viewFile: vi.fn(), removeFile: vi.fn(), viewGlobalFile: vi.fn(), removeGlobalFile: vi.fn(),
  }),
}))
vi.mock('../../composables/staffing/useStaffingTaxEntities', () => ({
  useStaffingTaxEntities: () => ({ entities: ref([]), isSaving: ref(false), add: vi.fn(), remove: vi.fn() }),
}))
vi.mock('../../composables/staffing/useEmpresas', () => ({
  useEmpresas: () => ({ companies: ref([]) }),
}))
vi.mock('../../services/equipoService', async (orig) => ({ ...(await orig<any>()), listEquipo: vi.fn().mockResolvedValue([]) }))

import EmployeeHoursMatrix from './EmployeeHoursMatrix.vue'
import StaffingTaxes from '../../views/StaffingTaxes.vue'
import { useAuthStore } from '../../store/auth'
import { useBusinessStore } from '../../store/business'

const plugins = () => {
  const pinia = createPinia()
  return { pinia, list: [pinia, [VueQueryPlugin, { queryClient: new QueryClient() }]] as any[] }
}

describe('Horas trabajadas por empleado con muchos empleados', () => {
  it('dibuja las primeras 50 filas y "Mostrar más" suma otras 50', async () => {
    const w = mount(EmployeeHoursMatrix, { props: { businessId: 'b1' }, global: { plugins: plugins().list } })
    expect(w.findAll('tbody tr')).toHaveLength(50)
    const more = w.findAll('button').find(b => b.text().includes('restantes'))!
    expect(more.text()).toContain('Mostrar 50 más (70 restantes)')
    await more.trigger('click')
    expect(w.findAll('tbody tr')).toHaveLength(100)
    await w.findAll('button').find(b => b.text().includes('restantes'))!.trigger('click')
    expect(w.findAll('tbody tr')).toHaveLength(120)
    expect(w.findAll('button').some(b => b.text().includes('restantes'))).toBe(false)
  })

  it('buscar vuelve a la primera tanda y filtra sobre todos los empleados, no solo los dibujados', async () => {
    const w = mount(EmployeeHoursMatrix, { props: { businessId: 'b1' }, global: { plugins: plugins().list } })
    await w.findAll('button').find(b => b.text().includes('restantes'))!.trigger('click')
    await w.find('input[type="text"]').setValue('Empleado 119')
    expect(w.findAll('tbody tr')).toHaveLength(1)
    expect(w.text()).toContain('Empleado 119')
  })
})

describe('Taxes con muchos empleados', () => {
  it('dibuja las primeras 50 filas y "Mostrar más" suma el resto', async () => {
    const { pinia, list } = plugins()
    const w = mount(StaffingTaxes, {
      global: { plugins: list, stubs: { Teleport: true, FeatureGate: { template: '<div><slot /></div>' } } },
    })
    useAuthStore(pinia).$patch({ profile: { business_id: 'b1', role: 'admin' } } as any)
    useBusinessStore(pinia).$patch({ business: { id: 'b1', niche_type: 'staffing' } } as any)
    await w.vm.$nextTick()
    expect(w.findAll('tbody tr')).toHaveLength(50)
    const more = w.findAll('button').find(b => b.text().includes('restantes'))!
    expect(more.text()).toContain('Mostrar 50 más (70 restantes)')
    await more.trigger('click')
    await w.findAll('button').find(b => b.text().includes('restantes'))!.trigger('click')
    expect(w.findAll('tbody tr')).toHaveLength(120)
  })
})
