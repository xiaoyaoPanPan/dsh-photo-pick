/**
 * Photo-pick shared types and errors.
 * @module dsh-photo-pick/types
 */

/** One scored candidate after a vision quality pass. */
export interface PhotoPickScore {
  /** Canonical absolute path. */
  readonly path: string
  /** Path relative to the workspace root (`/` separators). */
  readonly relativePath: string
  /** Quality score from 0 (unusable) to 100 (best). */
  readonly score: number
  /** Short reasons the photo ranks well. */
  readonly reasons: readonly string[]
  /** Short defects (blur, blink, overexposure, etc.). */
  readonly flaws: readonly string[]
  /** Human-readable skip/fail detail when scoring did not succeed. */
  readonly error?: string
}

/** Options for {@link PhotoPick.pickBest}. */
export interface PhotoPickOptions {
  /**
   * Explicit image paths (absolute or root-relative).
   * When omitted, {@link query} must be set and `ctx.mediaLibrary` available.
   */
  readonly paths?: readonly string[]
  /**
   * Optional media-library search query used to gather image candidates when
   * `ctx.mediaLibrary` is installed (soft dependency on the media plugin).
   */
  readonly query?: string
  /** Soft cap on candidates scored after path/query resolution. Defaults to 24. */
  readonly maxCandidates?: number
  /** How many top results to return in {@link PhotoPickResult.picks}. Defaults to 3. */
  readonly topK?: number
  /** Optional free-form preference (e.g. "prefer smiling faces"). */
  readonly criteria?: string
  /** Cooperative cancellation. */
  readonly signal?: AbortSignal
}

/** Result of one pick-best job. */
export interface PhotoPickResult {
  /** Top {@link PhotoPickOptions.topK} scores, highest first. */
  readonly picks: readonly PhotoPickScore[]
  /** All scored candidates, highest first (includes failed scores at the end). */
  readonly ranked: readonly PhotoPickScore[]
  /** Vision provider route used for this job. */
  readonly visionProvider: string
  /** Vision model id used for this job. */
  readonly visionModel: string
  /** Count of vision LLM attempts in this job. */
  readonly visionCalls: number
}

/** Structured photo-pick failure. */
export class PhotoPickError extends Error {
  /**
   * @param message - human-readable detail.
   * @param code - stable machine code.
   */
  constructor(
    message: string,
    readonly code:
      | 'INVALID_ROOT'
      | 'ROOT_MISSING'
      | 'BUSY'
      | 'PATH_ESCAPE'
      | 'NOT_FOUND'
      | 'NO_CANDIDATES'
      | 'VISION_DISABLED'
      | 'VISION_UNAVAILABLE',
  ) {
    super(message)
    this.name = 'PhotoPickError'
  }
}
