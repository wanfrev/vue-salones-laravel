import { describe, expect, it } from 'vitest'
import { billedEntries } from './staffingInvoicePrint'

describe('billedEntries', () => {
  const e = (name: string, total_hours: number, invoice_total: number) => ({ name, total_hours, invoice_total })

  it('drops people with no hours and nothing billed', () => {
    expect(billedEntries([e('a', 40, 800), e('b', 0, 0), e('c', 12.5, 250)]).map(x => x.name)).toEqual(['a', 'c'])
  })

  it('keeps a row billed without hours (travel only)', () => {
    expect(billedEntries([e('travel', 0, 60)]).map(x => x.name)).toEqual(['travel'])
  })

  it('returns an empty list when nobody worked', () => {
    expect(billedEntries([e('a', 0, 0)])).toEqual([])
  })
})
