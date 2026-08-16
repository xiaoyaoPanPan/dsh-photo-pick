/**
 * Serialize vision scoring with concurrency, min start spacing, and 429 retry.
 * Adapted from `dsh-media-local/vision-throttle`.
 * @module dsh-photo-pick-local/vision-throttle
 */

/** Throttle / retry knobs for vision scoring during pickBest. */
export interface VisionThrottleOptions {
  /** Max in-flight vision attempts (`1` = serial). */
  readonly concurrency: number
  /** Minimum ms between vision *starts* (same process job). */
  readonly minIntervalMs: number
  /** Extra attempts after a rate-limit failure (0 = no retry). */
  readonly maxRetries: number
  /** Base backoff ms; attempt n waits `backoff * 2^(n-1)`. */
  readonly retryBackoffMs: number
}

/** One scored attempt outcome used for retry decisions. */
export interface VisionAttemptResult {
  readonly ok: boolean
  readonly rateLimited: boolean
}

/** Per-job throttled runner. */
export interface VisionThrottle {
  /**
   * Run one vision attempt under this job's concurrency + spacing + 429 retry.
   * @param invoke - underlying attempt.
   * @param signal - cancellation.
   */
  run<T extends VisionAttemptResult>(
    invoke: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T>
}

/**
 * Create a throttle scoped to one pickBest job.
 * @param options - concurrency, interval, and retry policy.
 */
export function createVisionThrottle(options: VisionThrottleOptions): VisionThrottle {
  const concurrency = Math.max(1, Math.floor(options.concurrency))
  let active = 0
  let lastStartAt = 0
  const waiters: Array<() => void> = []

  const wake = (): void => {
    const next = waiters.shift()
    if (next !== undefined) next()
  }

  const acquire = async (signal?: AbortSignal): Promise<void> => {
    for (;;) {
      signal?.throwIfAborted()
      if (active < concurrency) {
        const elapsed = Date.now() - lastStartAt
        if (options.minIntervalMs <= 0 || lastStartAt === 0 || elapsed >= options.minIntervalMs) {
          active += 1
          lastStartAt = Date.now()
          return
        }
        await sleep(options.minIntervalMs - elapsed, signal)
        continue
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          const index = waiters.indexOf(resolve)
          if (index >= 0) waiters.splice(index, 1)
          reject(signal?.reason instanceof Error ? signal.reason : new Error('aborted'))
        }
        if (signal?.aborted) {
          onAbort()
          return
        }
        waiters.push(resolve)
        signal?.addEventListener('abort', onAbort, { once: true })
      })
    }
  }

  const release = (): void => {
    active = Math.max(0, active - 1)
    wake()
  }

  return {
    async run<T extends VisionAttemptResult>(
      invoke: () => Promise<T>,
      signal?: AbortSignal,
    ): Promise<T> {
      await acquire(signal)
      try {
        let attempt = 0
        for (;;) {
          signal?.throwIfAborted()
          const result = await invoke()
          if (result.rateLimited && attempt < options.maxRetries) {
            attempt += 1
            const delayMs = options.retryBackoffMs * (2 ** (attempt - 1))
            await sleep(delayMs, signal)
            continue
          }
          return result
        }
      } finally {
        release()
      }
    },
  }
}

/**
 * Whether a failure reason looks like provider rate limiting.
 * @param reason - error message.
 */
export function isRateLimitReason(reason: string | undefined): boolean {
  if (reason === undefined || reason.length === 0) return false
  const text = reason.toLowerCase()
  return text.includes('429')
    || text.includes('rate limit')
    || text.includes('rate_limit')
    || text.includes('too many requests')
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason instanceof Error ? signal.reason : new Error('aborted'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
