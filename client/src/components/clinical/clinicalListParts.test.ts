import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ClinicalStatusDot from './ClinicalStatusDot.vue'
import ClinicalListSkeleton from './ClinicalListSkeleton.vue'
import UnderlineTabs from '../common/UnderlineTabs.vue'
import { RISK_TONE } from './sessionNotes'

describe('ClinicalStatusDot', () => {
  it('keeps only the text color of an existing tone map, with no background capsule', () => {
    const w = mount(ClinicalStatusDot, { props: { tone: RISK_TONE.high }, slots: { default: 'Riesgo alto' } })
    expect(w.text()).toBe('Riesgo alto')
    expect(w.classes()).toContain('text-danger')
    expect(w.classes().some(c => c.startsWith('bg-'))).toBe(false)
  })

  it('falls back to a neutral color when the tone has no text color', () => {
    expect(mount(ClinicalStatusDot, { props: { tone: 'bg-primary/10' } }).classes()).toContain('text-text-secondary')
  })
})

describe('ClinicalListSkeleton', () => {
  it('renders the requested number of placeholder rows, hidden from assistive tech', () => {
    const w = mount(ClinicalListSkeleton, { props: { rows: 6 } })
    expect(w.findAll('li')).toHaveLength(6)
    expect(w.attributes('aria-hidden')).toBe('true')
  })
})

describe('UnderlineTabs', () => {
  const tabs = [{ value: 'active', label: 'Activos' }, { value: 'closed', label: 'Cerrados' }]

  it('marks the selected tab and emits the chosen value', async () => {
    const w = mount(UnderlineTabs, { props: { tabs, modelValue: 'active', ariaLabel: 'Estado' } })
    const [a, c] = w.findAll('[role="tab"]')
    expect(a.attributes('aria-selected')).toBe('true')
    expect(c.attributes('aria-selected')).toBe('false')

    await c.trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual(['closed'])
  })

  it('never lets the row scroll vertically', () => {
    const w = mount(UnderlineTabs, { props: { tabs, modelValue: 'active' } })
    expect(w.classes()).toEqual(expect.arrayContaining(['overflow-x-auto', 'overflow-y-hidden']))
  })
})
