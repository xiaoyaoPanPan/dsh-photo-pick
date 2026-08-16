/**
 * Vision quality scoring via the Host LLM catalog.
 * Adapted from `dsh-media-local/vision-llm` (single-image stream + attachment).
 * @module dsh-photo-pick-local/vision-score
 */
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import type { LlmRuntime } from '@deepseek-ai/dsh-llm';
import type { PhotoPickScore } from 'dsh-photo-pick';
/** Default quality-scoring instruction (JSON suffix appended at request time). */
export declare const PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT: string;
/** Fixed JSON response-format suffix always appended to the scoring prompt. */
export declare const PHOTO_PICK_SCORE_JSON_SUFFIX: string;
/** Inputs for one LLM-backed quality score. */
export interface ScoreImageConfig {
    readonly provider: string;
    readonly model: string;
    readonly maxBytes: number;
    readonly maxEdgePx: number;
    readonly prompt: string;
    readonly llm: Pick<LlmRuntime, 'stream'>;
    readonly attachments: Pick<AttachmentStore, 'saveImage'>;
}
/** Result of scoring one file, including throttle metadata. */
export interface ScoreImageResult {
    readonly ok: boolean;
    readonly rateLimited: boolean;
    readonly score: PhotoPickScore;
}
/**
 * Build the effective scoring prompt.
 * Custom text replaces only the free-form instruction; the JSON suffix is always appended.
 * Optional `criteria` from the tool call is appended as a user preference line.
 * @param custom - settings override; empty keeps the built-in instruction.
 * @param criteria - optional per-call preference text.
 */
export declare function resolveScorePrompt(custom?: string, criteria?: string): string;
/**
 * Score one image via the configured LLM route.
 * @param filePath - absolute image path.
 * @param relativePath - root-relative path for the result row.
 * @param config - LLM vision config.
 * @param signal - cancellation.
 */
export declare function scoreImageWithLlm(filePath: string, relativePath: string, config: ScoreImageConfig, signal?: AbortSignal): Promise<ScoreImageResult>;
//# sourceMappingURL=vision-score.d.ts.map