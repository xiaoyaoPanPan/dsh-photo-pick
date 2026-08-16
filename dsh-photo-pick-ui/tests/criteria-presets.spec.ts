import { describe, expect, it } from 'vitest'
import {
  buildConfirmDraft,
  criteriaHasClause,
  joinCriteriaClauses,
  splitCriteriaClauses,
  toggleCriteriaClause,
} from '../src/client/criteria-presets.ts'

describe('criteria-presets', () => {
  it('splits on fullwidth and ascii separators', () => {
    expect(splitCriteriaClauses('a；b; c\nd')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('toggles a clause in and out without duplicating', () => {
    const clause = '不要出现裸露的腿部，露出腿部应明显减分'
    const once = toggleCriteriaClause('', clause)
    expect(once).toBe(clause)
    expect(criteriaHasClause(once, clause)).toBe(true)
    const twice = toggleCriteriaClause(once, clause)
    expect(twice).toBe('')
    const withOther = toggleCriteriaClause('头在上三分', clause)
    expect(splitCriteriaClauses(withOther)).toEqual(['头在上三分', clause])
  })

  it('joins with fullwidth semicolons', () => {
    expect(joinCriteriaClauses(['a', 'b'])).toBe('a；b')
  })

  it('builds confirm draft with optional criteria', () => {
    expect(buildConfirmDraft({
      lead: 'LEAD',
      leadWithCriteria: 'LEAD_WITH',
      paths: ['a.jpg', 'b.jpg'],
      criteriaLead: '择优要求：',
      criteria: '不要露腿',
    })).toBe([
      'LEAD_WITH',
      '择优要求：不要露腿',
      '- a.jpg',
      '- b.jpg',
    ].join('\n'))

    expect(buildConfirmDraft({
      lead: 'LEAD',
      leadWithCriteria: 'LEAD_WITH',
      paths: ['a.jpg'],
    })).toBe('LEAD\n- a.jpg')
  })
})
