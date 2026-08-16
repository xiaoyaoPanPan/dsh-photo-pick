/**
 * Photo-pick-local composition / user-settings fields for vision scoring.
 * Adapted from `dsh-media-local/config` (same Host LLM catalog knobs).
 * @module dsh-photo-pick-local/config
 */
import z from '@deepseek-ai/schemastery';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { DEFAULT_VISION_MAX_EDGE_PX } from "./vision-image.js";
/** Max file bytes sent to vision by default (5 MiB). */
export const DEFAULT_MAX_VISION_BYTES = 5 * 1024 * 1024;
/** Settings namespace for live vision configuration. */
export const PHOTO_PICK_SETTINGS_NAMESPACE = settingsNamespace('photo-pick-local');
/** Default spacing between vision calls. */
export const DEFAULT_VISION_MIN_INTERVAL_MS = 2_000;
/** Default extra attempts after a 429. */
export const DEFAULT_VISION_MAX_RETRIES = 4;
/** Default base backoff for 429 retries. */
export const DEFAULT_VISION_RETRY_BACKOFF_MS = 2_000;
/** Default parallel scoring workers. */
export const DEFAULT_VISION_CONCURRENCY = 1;
/** Hard cap for {@link Config.visionConcurrency}. */
export const MAX_VISION_CONCURRENCY = 8;
/** Default max candidates scored in one job. */
export const DEFAULT_MAX_CANDIDATES = 24;
/** Default top-K picks returned. */
export const DEFAULT_TOP_K = 3;
/** Schemastery schema for composition entry and user settings. */
export const ConfigSchema = z.object({
    visionEnabled: z.boolean().default(true),
    visionLlmProvider: z.string().default(''),
    visionModel: z.string().default(''),
    visionScorePrompt: z.string().default(''),
    maxVisionBytes: z.number().default(DEFAULT_MAX_VISION_BYTES),
    visionMaxEdgePx: z.number().default(DEFAULT_VISION_MAX_EDGE_PX),
    visionMinIntervalMs: z.number().default(DEFAULT_VISION_MIN_INTERVAL_MS),
    visionMaxRetries: z.number().default(DEFAULT_VISION_MAX_RETRIES),
    visionRetryBackoffMs: z.number().default(DEFAULT_VISION_RETRY_BACKOFF_MS),
    visionConcurrency: z.number().default(DEFAULT_VISION_CONCURRENCY),
});
/**
 * Resolve a partial config into required fields.
 * @param config - composition or settings section.
 * @returns fully defaulted config.
 */
export function resolveConfig(config = {}) {
    return {
        visionEnabled: config.visionEnabled ?? true,
        visionLlmProvider: config.visionLlmProvider ?? '',
        visionModel: config.visionModel ?? '',
        visionScorePrompt: config.visionScorePrompt ?? '',
        maxVisionBytes: config.maxVisionBytes ?? DEFAULT_MAX_VISION_BYTES,
        visionMaxEdgePx: config.visionMaxEdgePx ?? DEFAULT_VISION_MAX_EDGE_PX,
        visionMinIntervalMs: config.visionMinIntervalMs ?? DEFAULT_VISION_MIN_INTERVAL_MS,
        visionMaxRetries: config.visionMaxRetries ?? DEFAULT_VISION_MAX_RETRIES,
        visionRetryBackoffMs: config.visionRetryBackoffMs ?? DEFAULT_VISION_RETRY_BACKOFF_MS,
        visionConcurrency: clampVisionConcurrency(config.visionConcurrency ?? DEFAULT_VISION_CONCURRENCY),
    };
}
/**
 * Clamp concurrency into `[1, {@link MAX_VISION_CONCURRENCY}]`.
 * @param value - raw config number.
 */
export function clampVisionConcurrency(value) {
    if (!Number.isFinite(value))
        return DEFAULT_VISION_CONCURRENCY;
    return Math.min(MAX_VISION_CONCURRENCY, Math.max(1, Math.floor(value)));
}
//# sourceMappingURL=config.js.map