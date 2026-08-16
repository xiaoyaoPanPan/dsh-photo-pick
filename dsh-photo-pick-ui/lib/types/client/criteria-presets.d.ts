/**
 * Built-in per-batch criteria chips for the photo-pick workspace.
 * Chip labels / insert text live in locales; this module owns ids and toggle math.
 * @module dsh-photo-pick-ui/client/criteria-presets
 */
/** Stable id for one built-in criteria chip. */
export type CriteriaPresetId = 'noLegs' | 'halfBody' | 'headUpperThird' | 'eyesOpen' | 'naturalSmile' | 'frontFacing' | 'cleanBackground' | 'noHeadCrop';
/** Built-in chip catalog (order = UI order). */
export declare const CRITERIA_PRESET_IDS: readonly CriteriaPresetId[];
/**
 * Split criteria text into comparable clauses.
 * Accepts Chinese fullwidth `；`, ASCII `;`, and newlines as separators.
 * @param text - raw criteria draft.
 */
export declare function splitCriteriaClauses(text: string): string[];
/**
 * Join clauses with a Chinese fullwidth semicolon (readable in both locales).
 * @param clauses - trimmed non-empty clauses.
 */
export declare function joinCriteriaClauses(clauses: readonly string[]): string;
/**
 * Whether the draft already contains this preset clause (exact clause match).
 * @param draft - current criteria text.
 * @param clause - preset insert text.
 */
export declare function criteriaHasClause(draft: string, clause: string): boolean;
/**
 * Toggle one preset clause in/out of the draft (multi-select).
 * @param draft - current criteria text.
 * @param clause - preset insert text to add or remove.
 * @returns updated draft.
 */
export declare function toggleCriteriaClause(draft: string, clause: string): string;
/**
 * Build the composer draft for Confirm-to-chat.
 * When criteria is non-empty, uses {@link opts.leadWithCriteria} and inserts a
 * labeled criteria line; otherwise uses {@link opts.lead} with no criteria talk.
 * @param opts - lead copy, paths, and optional per-batch criteria.
 */
export declare function buildConfirmDraft(opts: {
    readonly lead: string;
    readonly leadWithCriteria: string;
    readonly paths: readonly string[];
    readonly criteriaLead?: string;
    readonly criteria?: string;
}): string;
//# sourceMappingURL=criteria-presets.d.ts.map