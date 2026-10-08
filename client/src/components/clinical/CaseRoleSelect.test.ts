import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CaseRoleSelect from './CaseRoleSelect.vue'
import { BASE_ROLES, normalizeRole, roleChoices } from './cases'
import { useCustomRoles } from '../../composables/clinical/useCustomRoles'

const labels = (w: ReturnType<typeof mount>) => w.findAll('option').map(o => o.text())
const btn = (w: ReturnType<typeof mount>, text: string) => w.findAll('button').find(b => b.text() === text)!

beforeEach(() => {
  useCustomRoles().customRoles.value = []
  localStorage.clear()
})

describe('roleChoices / normalizeRole', () => {
  it('offers pareja, padre and madre by default', () => {
    expect(BASE_ROLES).toEqual(['Pareja', 'Padre', 'Madre'])
    expect(roleChoices([])).toEqual(['Pareja', 'Padre', 'Madre'])
  })

  it('adds custom roles and keeps the current value visible, without duplicates (any case)', () => {
    expect(roleChoices(['Abuela', 'pareja', 'abuela'], 'Tío')).toEqual(['Pareja', 'Padre', 'Madre', 'Abuela', 'Tío'])
  })

  it('collapses spaces, trims and caps the length like the server (60)', () => {
    expect(normalizeRole('  hijo   mayor ')).toBe('hijo mayor')
    expect(normalizeRole('x'.repeat(100))).toHaveLength(60)
    expect(normalizeRole('   ')).toBe('')
  })
})

describe('CaseRoleSelect', () => {
  it('lists «Sin rol», the base roles and the option to add another', () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    expect(labels(w)).toEqual(['Sin rol', 'Pareja', 'Padre', 'Madre', '＋ Agregar otro rol…'])
  })

  it('emits the chosen role, and an empty string for «Sin rol»', async () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    await w.find('select').setValue('Madre')
    await w.find('select').setValue('')
    expect(w.emitted('update:modelValue')).toEqual([['Madre'], ['']])
  })

  it('creates a new role: asks for the name, emits it and offers it afterwards', async () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    await w.find('select').setValue('__new__')

    expect(w.find('select').exists()).toBe(false) // el selector se cambia por el campo de texto
    await w.find('input').setValue('  Hijo   mayor ')
    await btn(w, 'Agregar').trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([['Hijo mayor']])
    expect(w.find('input').exists()).toBe(false)
    expect(labels(w)).toContain('Hijo mayor')
    expect(JSON.parse(localStorage.getItem('luma.clinical.case-roles')!)).toEqual(['Hijo mayor'])
  })

  it('Enter confirms and Escape cancels without emitting anything', async () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    await w.find('select').setValue('__new__')
    await w.find('input').setValue('Tía')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')).toEqual([['Tía']])

    await w.find('select').setValue('__new__')
    await w.find('input').setValue('Descartado')
    await w.find('input').trigger('keydown', { key: 'Escape' })
    expect(w.emitted('update:modelValue')).toHaveLength(1)
    expect(labels(w)).not.toContain('Descartado')
  })

  it('does not create an empty role', async () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    await w.find('select').setValue('__new__')
    await w.find('input').setValue('   ')
    expect(btn(w, 'Agregar').attributes('disabled')).toBeDefined()
    await w.find('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not duplicate a role that already exists (ignoring case) but still selects it', async () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: '' } })
    await w.find('select').setValue('__new__')
    await w.find('input').setValue('MADRE')
    await btn(w, 'Agregar').trigger('click')
    expect(labels(w).filter(l => l.toLowerCase() === 'madre')).toHaveLength(1)
  })

  it('shows an old saved role that is not in any list instead of an empty select', () => {
    const w = mount(CaseRoleSelect, { props: { modelValue: 'Hijo(a)' } })
    expect(labels(w)).toContain('Hijo(a)')
    expect((w.find('select').element as HTMLSelectElement).value).toBe('Hijo(a)')
  })
})
