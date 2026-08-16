/**
 * Parse vision quality-score JSON from model replies.
 * @module dsh-photo-pick-local/parse-score
 */
/** Parsed quality score from one vision reply. */
export interface ParsedPhotoScore {
    readonly score: number;
    readonly reasons: readonly string[];
    readonly flaws: readonly string[];
}
/** Cap retained response text for diagnostics. */
export declare const MAX_VISION_RESPONSE_CHARS = 4000;
/**
 * Truncate a vision reply for storage / tool output.
 * @param text - raw model text.
 */
export declare function truncateVisionResponse(text: string): string;
/**
 * Extract `{ score, reasons, flaws }` from a model reply.
 * Tolerates fenced JSON and surrounding prose.
 * @param text - raw assistant text.
 * @returns parsed score, or `undefined` when unusable.
 */
export declare function parseVisionScoreJson(text: string): ParsedPhotoScore | undefined;
//# sourceMappingURL=parse-score.d.ts.map