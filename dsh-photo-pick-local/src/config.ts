/**
 * Photo-pick-local composition / user-settings fields for vision scoring.
 * Adapted from `dsh-media-local/config` (same Host LLM catalog knobs).
 * @module dsh-photo-pick-local/config
 */

import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { DEFAULT_VISION_MAX_EDGE_PX } from './vision-image.ts'

/** Max file bytes sent to vision by default (5 MiB). */
export const DEFAULT_MAX_VISION_BYTES = 5 * 1024 * 1024

/** Settings namespace for live vision configuration. */
export const PHOTO_PICK_SETTINGS_NAMESPACE = settingsNamespace('photo-pick-local')

/** Plugin / settings section for local photo-pick. */
export interface Config {
  /** When true, attempt vision scoring during pickBest. Defaults to true. */
  visionEnabled?: boolean
  /**
   * Provider route id from the Host LLM catalog (same as「设置 → 模型」).
   * When set with {@link visionModel}, scoring uses `ctx.llm` + that route.
   */
  visionLlmProvider?: string
  /** Model id on {@link visionLlmProvider}. */
  visionModel?: string
  /**
   * Optional override for the free-form scoring instruction.
   * Empty keeps the built-in default; the JSON suffix is always appended.
   */
  visionScorePrompt?: string
  /** Max file bytes sent to vision; larger files are skipped. */
  maxVisionBytes?: number
  /**
   * Longest edge (px) allowed on vision uploads. Oversized images are downscaled
   * before the request. `0` disables.
   */
  visionMaxEdgePx?: number
  /** Minimum milliseconds between vision starts in one pick job. */
  visionMinIntervalMs?: number
  /** Extra vision attempts after a rate-limit (429) failure. `0` disables retry. */
  visionMaxRetries?: number
  /** Base backoff milliseconds for rate-limit retries. */
  visionRetryBackoffMs?: number
  /** Max images scored at once (`1` = serial). */
  visionConcurrency?: number
}

/** Default spacing between vision calls. */
export const DEFAULT_VISION_MIN_INTERVAL_MS = 2_000

/** Default extra attempts after a 429. */
export const DEFAULT_VISION_MAX_RETRIES = 4

/** Default base backoff for 429 retries. */
export const DEFAULT_VISION_RETRY_BACKOFF_MS = 2_000

/** Default parallel scoring workers. */
export const DEFAULT_VISION_CONCURRENCY = 1

/** Hard cap for {@link Config.visionConcurrency}. */
export const MAX_VISION_CONCURRENCY = 8

/** Default max candidates scored in one job. */
export const DEFAULT_MAX_CANDIDATES = 24

/** Default top-K picks returned. */
export const DEFAULT_TOP_K = 3

/** Schemastery schema for composition entry and user settings. */
export const ConfigSchema: z<Config> = z.object({
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
})

/** Fill omitted fields with the same defaults as the schema. */
export type ResolvedConfig = Required<Config>

/**
 * Resolve a partial config into required fields.
 * @param config - composition or settings section.
 * @returns fully defaulted config.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
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
    visionConcurrency: clampVisionConcurrency(
      config.visionConcurrency ?? DEFAULT_VISION_CONCURRENCY,
    ),
  }
}

/**
 * Clamp concurrency into `[1, {@link MAX_VISION_CONCURRENCY}]`.
 * @param value - raw config number.
 */
export function clampVisionConcurrency(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VISION_CONCURRENCY
  return Math.min(MAX_VISION_CONCURRENCY, Math.max(1, Math.floor(value)))
}
