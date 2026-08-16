/**
 * Browser-local history + draft for per-batch photo-pick criteria.
 * @module dsh-photo-pick-ui/client/criteria-history
 */
/** localStorage key for recent criteria strings. */
export declare const CRITERIA_HISTORY_KEY = "dsh-photo-pick.criteria-history";
/** sessionStorage key for the in-progress criteria draft. */
export declare const CRITERIA_DRAFT_KEY = "dsh-photo-pick.criteria-draft";
/** Max remembered free-form criteria entries. */
export declare const CRITERIA_HISTORY_LIMIT = 20;
/**
 * Read the session criteria draft (empty when missing / unavailable).
 */
export declare function loadCriteriaDraft(): string;
/**
 * Persist the session criteria draft.
 * @param text - current textarea value.
 */
export declare function saveCriteriaDraft(text: string): void;
/**
 * Load recent criteria strings (newest first).
 */
export declare function loadCriteriaHistory(): string[];
/**
 * Remember a non-empty criteria string (dedupe, newest first).
 * @param text - criteria used for Confirm-to-chat.
 * @returns updated history list.
 */
export declare function rememberCriteria(text: string): string[];
//# sourceMappingURL=criteria-history.d.ts.map