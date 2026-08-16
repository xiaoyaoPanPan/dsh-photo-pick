/**
 * Built-in per-batch criteria chips for the photo-pick workspace.
 * Chip labels / insert text live in locales; this module owns ids and toggle math.
 * @module dsh-photo-pick-ui/client/criteria-presets
 */
/** Built-in chip catalog (order = UI order). */
export const CRITERIA_PRESET_IDS = [
    'noLegs',
    'halfBody',
    'headUpperThird',
    'eyesOpen',
    'naturalSmile',
    'frontFacing',
    'cleanBackground',
    'noHeadCrop',
];
/**
 * Split criteria text into comparable clauses.
 * Accepts Chinese fullwidth `；`, ASCII `;`, and newlines as separators.
 * @param text - raw criteria draft.
 */
export function splitCriteriaClauses(text) {
    return text
        .split(/[；;\n]+/u)
        .map(part => part.trim())
        .filter(part => part.length > 0);
}
/**
 * Join clauses with a Chinese fullwidth semicolon (readable in both locales).
 * @param clauses - trimmed non-empty clauses.
 */
export function joinCriteriaClauses(clauses) {
    return clauses.join('；');
}
/**
 * Whether the draft already contains this preset clause (exact clause match).
 * @param draft - current criteria text.
 * @param clause - preset insert text.
 */
export function criteriaHasClause(draft, clause) {
    const want = clause.trim();
    if (want.length === 0)
        return false;
    return splitCriteriaClauses(draft).includes(want);
}
/**
 * Toggle one preset clause in/out of the draft (multi-select).
 * @param draft - current criteria text.
 * @param clause - preset insert text to add or remove.
 * @returns updated draft.
 */
export function toggleCriteriaClause(draft, clause) {
    const want = clause.trim();
    if (want.length === 0)
        return draft.trim();
    const parts = splitCriteriaClauses(draft);
    const index = parts.indexOf(want);
    if (index >= 0) {
        return joinCriteriaClauses(parts.filter((_, i) => i !== index));
    }
    return joinCriteriaClauses([...parts, want]);
}
/**
 * Build the composer draft for Confirm-to-chat.
 * When criteria is non-empty, uses {@link opts.leadWithCriteria} and inserts a
 * labeled criteria line; otherwise uses {@link opts.lead} with no criteria talk.
 * @param opts - lead copy, paths, and optional per-batch criteria.
 */
export function buildConfirmDraft(opts) {
    const criteria = opts.criteria?.trim() ?? '';
    const criteriaLead = opts.criteriaLead?.trim() ?? '';
    const hasCriteria = criteria.length > 0 && criteriaLead.length > 0;
    const lines = [hasCriteria ? opts.leadWithCriteria : opts.lead];
    if (hasCriteria) {
        lines.push(`${criteriaLead}${criteria}`);
    }
    for (const path of opts.paths)
        lines.push(`- ${path}`);
    return lines.join('\n');
}
//# sourceMappingURL=criteria-presets.js.map