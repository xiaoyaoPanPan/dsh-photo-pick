/**
 * Built-in per-batch criteria chips for the photo-pick workspace.
 * Chip labels / insert text live in locales; this module owns ids and toggle math.
 * @module dsh-photo-pick-ui/client/criteria-presets
 */

/** Stable id for one built-in criteria chip. */
export type CriteriaPresetId =
  | 'noLegs'
  | 'halfBody'
  | 'headUpperThird'
  | 'eyesOpen'
  | 'naturalSmile'
  | 'frontFacing'
  | 'cleanBackground'
  | 'noHeadCrop'

/** Built-in chip catalog (order = UI order). */
export const CRITERIA_PRESET_IDS: readonly CriteriaPresetId[] = [
  'noLegs',
  'halfBody',
  'headUpperThird',
  'eyesOpen',
  'naturalSmile',
  'frontFacing',
  'cleanBackground',
  'noHeadCrop',
] as const

/**
 * Split criteria text into comparable clauses.
 * Accepts Chinese fullwidth `；`, ASCII `;`, and newlines as separators.
 * @param text - raw criteria draft.
 */
export function splitCriteriaClauses(text: string): string[] {
  return text
    .split(/[；;\n]+/u)
    .map(part => part.trim())
    .filter(part => part.length > 0)
}

/**
 * Join clauses with a Chinese fullwidth semicolon (readable in both locales).
 * @param clauses - trimmed non-empty clauses.
 */
export function joinCriteriaClauses(clauses: readonly string[]): string {
  return clauses.join('；')
}

/**
 * Whether the draft already contains this preset clause (exact clause match).
 * @param draft - current criteria text.
 * @param clause - preset insert text.
 */
export function criteriaHasClause(draft: string, clause: string): boolean {
  const want = clause.trim()
  if (want.length === 0) return false
  return splitCriteriaClauses(draft).includes(want)
}

/**
 * Toggle one preset clause in/out of the draft (multi-select).
 * @param draft - current criteria text.
 * @param clause - preset insert text to add or remove.
 * @returns updated draft.
 */
export function toggleCriteriaClause(draft: string, clause: string): string {
  const want = clause.trim()
  if (want.length === 0) return draft.trim()
  const parts = splitCriteriaClauses(draft)
  const index = parts.indexOf(want)
  if (index >= 0) {
    return joinCriteriaClauses(parts.filter((_, i) => i !== index))
  }
  return joinCriteriaClauses([...parts, want])
}

/**
 * Build the composer draft for Confirm-to-chat.
 * When criteria is non-empty, uses {@link opts.leadWithCriteria} and inserts a
 * labeled criteria line; otherwise uses {@link opts.lead} with no criteria talk.
 * @param opts - lead copy, paths, and optional per-batch criteria.
 */
export function buildConfirmDraft(opts: {
  readonly lead: string
  readonly leadWithCriteria: string
  readonly paths: readonly string[]
  readonly criteriaLead?: string
  readonly criteria?: string
}): string {
  const criteria = opts.criteria?.trim() ?? ''
  const criteriaLead = opts.criteriaLead?.trim() ?? ''
  const hasCriteria = criteria.length > 0 && criteriaLead.length > 0
  const lines: string[] = [hasCriteria ? opts.leadWithCriteria : opts.lead]
  if (hasCriteria) {
    lines.push(`${criteriaLead}${criteria}`)
  }
  for (const path of opts.paths) lines.push(`- ${path}`)
  return lines.join('\n')
}
