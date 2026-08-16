/**
 * Browser-local history + draft for per-batch photo-pick criteria.
 * @module dsh-photo-pick-ui/client/criteria-history
 */

/** localStorage key for recent criteria strings. */
export const CRITERIA_HISTORY_KEY = 'dsh-photo-pick.criteria-history'

/** sessionStorage key for the in-progress criteria draft. */
export const CRITERIA_DRAFT_KEY = 'dsh-photo-pick.criteria-draft'

/** Max remembered free-form criteria entries. */
export const CRITERIA_HISTORY_LIMIT = 20

/**
 * Read the session criteria draft (empty when missing / unavailable).
 */
export function loadCriteriaDraft(): string {
  try {
    const raw = sessionStorage.getItem(CRITERIA_DRAFT_KEY)
    return raw ?? ''
  } catch {
    // Private mode / blocked storage — treat as empty.
    return ''
  }
}

/**
 * Persist the session criteria draft.
 * @param text - current textarea value.
 */
export function saveCriteriaDraft(text: string): void {
  try {
    sessionStorage.setItem(CRITERIA_DRAFT_KEY, text)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/**
 * Load recent criteria strings (newest first).
 */
export function loadCriteriaHistory(): string[] {
  try {
    const raw = localStorage.getItem(CRITERIA_HISTORY_KEY)
    if (raw === null || raw.length === 0) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, CRITERIA_HISTORY_LIMIT)
  } catch {
    return []
  }
}

/**
 * Remember a non-empty criteria string (dedupe, newest first).
 * @param text - criteria used for Confirm-to-chat.
 * @returns updated history list.
 */
export function rememberCriteria(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return loadCriteriaHistory()
  const next = [
    trimmed,
    ...loadCriteriaHistory().filter(item => item !== trimmed),
  ].slice(0, CRITERIA_HISTORY_LIMIT)
  try {
    localStorage.setItem(CRITERIA_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Ignore quota / private-mode failures.
  }
  return next
}
