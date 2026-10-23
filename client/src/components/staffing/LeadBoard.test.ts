import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import LeadBoard from './LeadBoard.vue'
import type { LeadRow } from '../../services/leadsService'

const lead = (i: number, status: LeadRow['status'] = 'new'): LeadRow => ({
  id: `l${i}`, ownerId: 'o1', ownerName: 'Ana', companyName: `Empresa ${i}`, workArea: '', address: '', phone: '', email: '',
  status, visitDate: '', companyCategory: '', priority: '', contactCard: '', state: '', notes: '', updatedAt: '2026-10-01',
})

const leads = ref<LeadRow[]>([...Array.from({ length: 100 }, (_, i) => lead(i)), lead(1000, 'called')])

vi.mock('../../composables/staffing/useLeads', () => ({
  useLeads: () => ({
    leads, isLoading: ref(false), showModal: ref(false), editingId: ref(null), form: ref({}), saveError: ref(''),
    openNew: vi.fn(), openEdit: vi.fn(), closeModal: vi.fn(), handleSave: vi.fn(), handleDelete: vi.fn(), updateStatus: vi.fn(),
  }),
}))

const LeadCardStub = { props: ['lead'], template: '<div data-testid="lead-card">{{ lead.companyName }}</div>' }
const mountBoard = () => mount(LeadBoard, {
  props: { businessId: 'b1' },
  global: { stubs: { LeadCard: LeadCardStub, Teleport: true } },
})

describe('LeadBoard con muchos leads', () => {
  it('dibuja solo las primeras tarjetas de cada columna, pero los contadores siguen mostrando el total', () => {
    const w = mountBoard()
    // 30 de "No Iniciado" + 1 de "Llamado"
    expect(w.findAll('[data-testid="lead-card"]')).toHaveLength(31)
    expect(w.text()).toContain('101') // total leads
    expect(w.text()).toContain('100') // contador de la columna No Iniciado
  })

  it('"Mostrar más" suma otra tanda solo en esa columna', async () => {
    const w = mountBoard()
    const more = w.findAll('button').find(b => b.text().includes('restantes'))!
    expect(more.text()).toContain('Mostrar 30 más (70 restantes)')
    await more.trigger('click')
    expect(w.findAll('[data-testid="lead-card"]')).toHaveLength(61)
  })

  it('la búsqueda vuelve a la primera tanda', async () => {
    const w = mountBoard()
    await w.findAll('button').find(b => b.text().includes('restantes'))!.trigger('click')
    expect(w.findAll('[data-testid="lead-card"]')).toHaveLength(61)
    await w.find('input[type="text"]').setValue('Empresa 5')
    // Empresa 5, 50..59 -> 11 leads, todos caben en la primera tanda
    expect(w.findAll('[data-testid="lead-card"]')).toHaveLength(11)
  })
})
