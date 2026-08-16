/**
 * Serialize vision scoring with concurrency, min start spacing, and 429 retry.
 * Adapted from `dsh-media-local/vision-throttle`.
 * @module dsh-photo-pick-local/vision-throttle
 */
/** Throttle / retry knobs for vision scoring during pickBest. */
export interface VisionThrottleOptions {
    /** Max in-flight vision attempts (`1` = serial). */
    readonly concurrency: number;
    /** Minimum ms between vision *starts* (same process job). */
    readonly minIntervalMs: number;
    /** Extra attempts after a rate-limit failure (0 = no retry). */
    readonly maxRetries: number;
    /** Base backoff ms; attempt n waits `backoff * 2^(n-1)`. */
    readonly retryBackoffMs: number;
}
/** One scored attempt outcome used for retry decisions. */
export interface VisionAttemptResult {
    readonly ok: boolean;
    readonly rateLimited: boolean;
}
/** Per-job throttled runner. */
export interface VisionThrottle {
    /**
     * Run one vision attempt under this job's concurrency + spacing + 429 retry.
     * @param invoke - underlying attempt.
     * @param signal - cancellation.
     */
    run<T extends VisionAttemptResult>(invoke: () => Promise<T>, signal?: AbortSignal): Promise<T>;
}
/**
 * Create a throttle scoped to one pickBest job.
 * @param options - concurrency, interval, and retry policy.
 */
export declare function createVisionThrottle(options: VisionThrottleOptions): VisionThrottle;
/**
 * Whether a failure reason looks like provider rate limiting.
 * @param reason - error message.
 */
export declare function isRateLimitReason(reason: string | undefined): boolean;
//# sourceMappingURL=vision-throttle.d.ts.map