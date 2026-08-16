import { describe, expect, it, beforeEach } from 'vitest'
import {
  CRITERIA_DRAFT_KEY,
  CRITERIA_HISTORY_KEY,
  loadCriteriaDraft,
  loadCriteriaHistory,
  rememberCriteria,
  saveCriteriaDraft,
} from '../src/client/criteria-history.ts'

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()
  get length(): number { return this.map.size }
  clear(): void { this.map.clear() }
  getItem(key: string): string | null { return this.map.get(key) ?? null }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null }
  removeItem(key: string): void { this.map.delete(key) }
  setItem(key: string, value: string): void { this.map.set(key, value) }
}

describe('criteria-history', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MemoryStorage(),
    })
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    })
  })

  it('persists the session draft', () => {
    saveCriteriaDraft('不要露腿')
    expect(loadCriteriaDraft()).toBe('不要露腿')
    expect(sessionStorage.getItem(CRITERIA_DRAFT_KEY)).toBe('不要露腿')
  })

  it('remembers unique criteria newest-first', () => {
    expect(rememberCriteria('a')).toEqual(['a'])
    expect(rememberCriteria('b')).toEqual(['b', 'a'])
    expect(rememberCriteria('a')).toEqual(['a', 'b'])
    expect(loadCriteriaHistory()).toEqual(['a', 'b'])
    expect(localStorage.getItem(CRITERIA_HISTORY_KEY)).toContain('"a"')
  })

  it('ignores empty remember', () => {
    rememberCriteria('keep')
    expect(rememberCriteria('   ')).toEqual(['keep'])
  })
})
