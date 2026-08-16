/**
 * Model-facing photo-pick tools over `ctx.photoPick`.
 * @module dsh-tool-photo-pick
 */
import type { Context } from '@deepseek-ai/cordis';
/** Stable system-prompt section text (pinned by loader-composition tests). */
export declare const PHOTO_PICK_PROMPT: string;
/** One ranked row persisted for the Web compare dialog (presentationMeta). */
export interface PhotoPickRankRowMeta {
    relativePath: string;
    score: number;
    reasons: string[];
    flaws: string[];
    error?: string;
}
/** Durable UI metadata for a successful photo_pick_best call. */
export interface PhotoPickPresentationMeta {
    ranked: PhotoPickRankRowMeta[];
    visionProvider: string;
    visionModel: string;
    visionCalls: number;
}
/** Canonical tool value: model prose + structured ranking. */
export interface PhotoPickToolValue {
    summary: string;
    ranked: PhotoPickRankRowMeta[];
    visionProvider: string;
    visionModel: string;
    visionCalls: number;
}
/** Cordis plugin name. */
export declare const name = "tool-photo-pick";
/** Required services. */
export declare const inject: string[];
/**
 * Register photo_pick_best and a short guidance section.
 * @param ctx - Cordis context with tools, photoPick, and systemPrompt.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map