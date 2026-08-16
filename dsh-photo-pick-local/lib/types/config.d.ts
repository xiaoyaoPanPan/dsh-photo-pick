/**
 * Photo-pick-local composition / user-settings fields for vision scoring.
 * Adapted from `dsh-media-local/config` (same Host LLM catalog knobs).
 * @module dsh-photo-pick-local/config
 */
import z from '@deepseek-ai/schemastery';
/** Max file bytes sent to vision by default (5 MiB). */
export declare const DEFAULT_MAX_VISION_BYTES: number;
/** Settings namespace for live vision configuration. */
export declare const PHOTO_PICK_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Plugin / settings section for local photo-pick. */
export interface Config {
    /** When true, attempt vision scoring during pickBest. Defaults to true. */
    visionEnabled?: boolean;
    /**
     * Provider route id from the Host LLM catalog (same as「设置 → 模型」).
     * When set with {@link visionModel}, scoring uses `ctx.llm` + that route.
     */
    visionLlmProvider?: string;
    /** Model id on {@link visionLlmProvider}. */
    visionModel?: string;
    /**
     * Optional override for the free-form scoring instruction.
     * Empty keeps the built-in default; the JSON suffix is always appended.
     */
    visionScorePrompt?: string;
    /** Max file bytes sent to vision; larger files are skipped. */
    maxVisionBytes?: number;
    /**
     * Longest edge (px) allowed on vision uploads. Oversized images are downscaled
     * before the request. `0` disables.
     */
    visionMaxEdgePx?: number;
    /** Minimum milliseconds between vision starts in one pick job. */
    visionMinIntervalMs?: number;
    /** Extra vision attempts after a rate-limit (429) failure. `0` disables retry. */
    visionMaxRetries?: number;
    /** Base backoff milliseconds for rate-limit retries. */
    visionRetryBackoffMs?: number;
    /** Max images scored at once (`1` = serial). */
    visionConcurrency?: number;
}
/** Default spacing between vision calls. */
export declare const DEFAULT_VISION_MIN_INTERVAL_MS = 2000;
/** Default extra attempts after a 429. */
export declare const DEFAULT_VISION_MAX_RETRIES = 4;
/** Default base backoff for 429 retries. */
export declare const DEFAULT_VISION_RETRY_BACKOFF_MS = 2000;
/** Default parallel scoring workers. */
export declare const DEFAULT_VISION_CONCURRENCY = 1;
/** Hard cap for {@link Config.visionConcurrency}. */
export declare const MAX_VISION_CONCURRENCY = 8;
/** Default max candidates scored in one job. */
export declare const DEFAULT_MAX_CANDIDATES = 24;
/** Default top-K picks returned. */
export declare const DEFAULT_TOP_K = 3;
/** Schemastery schema for composition entry and user settings. */
export declare const ConfigSchema: z<Config>;
/** Fill omitted fields with the same defaults as the schema. */
export type ResolvedConfig = Required<Config>;
/**
 * Resolve a partial config into required fields.
 * @param config - composition or settings section.
 * @returns fully defaulted config.
 */
export declare function resolveConfig(config?: Config): ResolvedConfig;
/**
 * Clamp concurrency into `[1, {@link MAX_VISION_CONCURRENCY}]`.
 * @param value - raw config number.
 */
export declare function clampVisionConcurrency(value: number): number;
//# sourceMappingURL=config.d.ts.map