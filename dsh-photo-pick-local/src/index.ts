/**
 * Local photo-pick backend: workspace containment, vision scoring, optional media search.
 * @module dsh-photo-pick-local
 */

import { extname } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-attachment'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-llm'
import { installSettingsSection } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-settings'
import {
  PhotoPick,
  PhotoPickError,
  type PhotoPickOptions,
  type PhotoPickResult,
  type PhotoPickScore,
} from 'dsh-photo-pick'
import {
  clampVisionConcurrency,
  ConfigSchema,
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_TOP_K,
  PHOTO_PICK_SETTINGS_NAMESPACE,
  resolveConfig,
  type Config,
  type ResolvedConfig,
} from './config.ts'
import { resolveContainedPath, resolveWorkspaceRoot, toRelativePosix } from './paths.ts'
import { registerPhotoPickCandidatesHttp } from './candidates-http.ts'
import { registerPhotoPickFileHttp } from './file-http.ts'
import { registerPhotoPickOpenHttp } from './open-http.ts'
import { registerPhotoPickRevealHttp } from './reveal-http.ts'
import { registerPhotoPickSettingsHttp } from './settings-http.ts'
import { createVisionThrottle } from './vision-throttle.ts'
import { resolveScorePrompt, scoreImageWithLlm } from './vision-score.ts'

export {
  clampVisionConcurrency,
  ConfigSchema,
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_MAX_VISION_BYTES,
  DEFAULT_TOP_K,
  DEFAULT_VISION_CONCURRENCY,
  DEFAULT_VISION_MAX_RETRIES,
  DEFAULT_VISION_MIN_INTERVAL_MS,
  DEFAULT_VISION_RETRY_BACKOFF_MS,
  MAX_VISION_CONCURRENCY,
  PHOTO_PICK_SETTINGS_NAMESPACE,
  resolveConfig,
} from './config.ts'
export type { Config, ResolvedConfig } from './config.ts'
export { assertAllowedRoot, resolveContainedPath, resolveWorkspaceRoot } from './paths.ts'
export { DEFAULT_VISION_MAX_EDGE_PX, prepareVisionImage } from './vision-image.ts'
export type { PreparedVisionImage } from './vision-image.ts'
export { createVisionThrottle, isRateLimitReason } from './vision-throttle.ts'
export type { VisionThrottle, VisionThrottleOptions } from './vision-throttle.ts'
export {
  parseVisionScoreJson,
  truncateVisionResponse,
} from './parse-score.ts'
export type { ParsedPhotoScore } from './parse-score.ts'
export {
  PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT,
  PHOTO_PICK_SCORE_JSON_SUFFIX,
  resolveScorePrompt,
  scoreImageWithLlm,
} from './vision-score.ts'
export type { ScoreImageConfig, ScoreImageResult } from './vision-score.ts'
export {
  PHOTO_PICK_SETTINGS_HTTP_PATH,
  parsePhotoPickSettingsPatch,
  registerPhotoPickSettingsHttp,
} from './settings-http.ts'
export type {
  PhotoPickSettingsHttpView,
  PhotoPickVisionModelOption,
} from './settings-http.ts'
export {
  PHOTO_PICK_OPEN_HTTP_PATH,
  registerPhotoPickOpenHttp,
} from './open-http.ts'
export {
  PHOTO_PICK_REVEAL_HTTP_PATH,
  registerPhotoPickRevealHttp,
} from './reveal-http.ts'
export {
  isWindowsExplorerBogusFailure,
  openPhotoPickPath,
  revealPhotoPickPath,
} from './native-open.ts'

/** Image extensions accepted for scoring (aligned with media vision rasters). */
const IMAGE_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
])

declare module '@deepseek-ai/cordis' {
  interface Context {
    photoPick: PhotoPick
  }
}

/** Soft media-library surface used only when present on the Host. */
interface MediaLibraryLike {
  search(
    root: string,
    options: { query: string; limit?: number },
  ): Promise<readonly { path: string; kind: string; relativePath: string }[]>
}

/**
 * Host-local {@link PhotoPick} over `ctx.llm` + `ctx.attachments`.
 */
export class LocalPhotoPick extends PhotoPick {
  static Config = ConfigSchema

  /** Optional override scorer (tests). */
  scoreImage: typeof scoreImageWithLlm | undefined = undefined

  private readonly entry: ResolvedConfig
  private current: () => Config
  private readonly inflight = new Map<string, Promise<PhotoPickResult>>()

  /**
   * @param ctx - Cordis context.
   * @param config - optional cordis.yml fields.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx)
    this.entry = resolveConfig(config)
    this.current = () => this.entry
    installSettingsSection(ctx, PHOTO_PICK_SETTINGS_NAMESPACE, ConfigSchema, this.entry, {
      setSource: (source) => {
        this.current = source
      },
      onChange: () => {},
    })
    ctx.inject(['webServer', 'settings'], (scoped) => {
      scoped.effect(
        () => registerPhotoPickSettingsHttp(scoped, PHOTO_PICK_SETTINGS_NAMESPACE),
        'photoPick.settingsHttp',
      )
    })
    ctx.inject(['webServer'], (scoped) => {
      scoped.effect(() => registerPhotoPickCandidatesHttp(scoped), 'photoPick.candidatesHttp')
      scoped.effect(() => registerPhotoPickFileHttp(scoped), 'photoPick.fileHttp')
      scoped.effect(() => registerPhotoPickOpenHttp(scoped), 'photoPick.openHttp')
      scoped.effect(() => registerPhotoPickRevealHttp(scoped), 'photoPick.revealHttp')
    })
  }

  /** @inheritdoc */
  async pickBest(root: string, options: PhotoPickOptions): Promise<PhotoPickResult> {
    const canonical = await resolveWorkspaceRoot(root)
    const existing = this.inflight.get(canonical)
    if (existing !== undefined) {
      throw new PhotoPickError('a photo-pick job is already running for this root', 'BUSY')
    }
    const job = this.runPick(canonical, options).finally(() => {
      this.inflight.delete(canonical)
    })
    this.inflight.set(canonical, job)
    return job
  }

  private async runPick(root: string, options: PhotoPickOptions): Promise<PhotoPickResult> {
    const resolved = resolveConfig(this.current())
    if (!resolved.visionEnabled) {
      throw new PhotoPickError('vision scoring is disabled in photo-pick settings', 'VISION_DISABLED')
    }
    if (resolved.visionLlmProvider.length === 0 || resolved.visionModel.length === 0) {
      throw new PhotoPickError(
        'configure visionLlmProvider and visionModel (Settings → Models route ids)',
        'VISION_UNAVAILABLE',
      )
    }
    const llm = this.ctx.get('llm')
    const attachments = this.ctx.get('attachments')
    if (llm === undefined || attachments === undefined) {
      throw new PhotoPickError(
        'ctx.llm and ctx.attachments are required for vision scoring',
        'VISION_UNAVAILABLE',
      )
    }

    const maxCandidates = Math.max(
      1,
      Math.min(DEFAULT_MAX_CANDIDATES, Math.floor(options.maxCandidates ?? DEFAULT_MAX_CANDIDATES)),
    )
    const topK = Math.max(1, Math.min(maxCandidates, Math.floor(options.topK ?? DEFAULT_TOP_K)))
    const candidates = await this.resolveCandidates(root, options, maxCandidates)
    if (candidates.length === 0) {
      throw new PhotoPickError(
        'no image candidates: pass paths[] or a mediaLibrary query with image hits',
        'NO_CANDIDATES',
      )
    }

    const prompt = resolveScorePrompt(resolved.visionScorePrompt, options.criteria)
    const throttle = createVisionThrottle({
      concurrency: clampVisionConcurrency(resolved.visionConcurrency),
      minIntervalMs: Math.max(0, resolved.visionMinIntervalMs),
      maxRetries: Math.max(0, Math.floor(resolved.visionMaxRetries)),
      retryBackoffMs: Math.max(0, resolved.visionRetryBackoffMs),
    })
    const scoreFn = this.scoreImage ?? scoreImageWithLlm
    const scoreConfig = {
      provider: resolved.visionLlmProvider,
      model: resolved.visionModel,
      maxBytes: resolved.maxVisionBytes,
      maxEdgePx: resolved.visionMaxEdgePx,
      prompt,
      llm,
      attachments,
    }

    const scored: PhotoPickScore[] = await Promise.all(
      candidates.map(async (candidate) => {
        const result = await throttle.run(
          () => scoreFn(candidate.path, candidate.relativePath, scoreConfig, options.signal),
          options.signal,
        )
        return result.score
      }),
    )

    const ranked = [...scored].sort((a, b) => {
      const aOk = a.error === undefined
      const bOk = b.error === undefined
      if (aOk !== bOk) return aOk ? -1 : 1
      return b.score - a.score
    })
    return {
      picks: ranked.filter(row => row.error === undefined).slice(0, topK),
      ranked,
      visionProvider: resolved.visionLlmProvider,
      visionModel: resolved.visionModel,
      visionCalls: scored.length,
    }
  }

  private async resolveCandidates(
    root: string,
    options: PhotoPickOptions,
    maxCandidates: number,
  ): Promise<readonly { path: string; relativePath: string }[]> {
    const out: { path: string; relativePath: string }[] = []
    const seen = new Set<string>()

    const push = (absolute: string, relativePath: string): void => {
      if (!isImagePath(absolute)) return
      if (seen.has(absolute)) return
      seen.add(absolute)
      out.push({ path: absolute, relativePath })
    }

    if (options.paths !== undefined) {
      for (const requested of options.paths) {
        if (out.length >= maxCandidates) break
        const absolute = await resolveContainedPath(root, requested)
        push(absolute, toRelativePosix(root, absolute))
      }
    }

    const query = options.query?.trim()
    if (query && query.length > 0 && out.length < maxCandidates) {
      const library = this.ctx.get('mediaLibrary') as MediaLibraryLike | undefined
      if (library === undefined) {
        if (options.paths === undefined || options.paths.length === 0) {
          throw new PhotoPickError(
            'mediaLibrary query requires the media plugin (ctx.mediaLibrary); pass paths[] instead',
            'NO_CANDIDATES',
          )
        }
      } else {
        const hits = await library.search(root, {
          query,
          limit: maxCandidates,
        })
        for (const hit of hits) {
          if (out.length >= maxCandidates) break
          if (hit.kind !== 'image') continue
          const absolute = await resolveContainedPath(root, hit.path)
          push(absolute, hit.relativePath || toRelativePosix(root, absolute))
        }
      }
    }

    return out.slice(0, maxCandidates)
  }
}

function isImagePath(filePath: string): boolean {
  return IMAGE_EXT.has(extname(filePath).toLowerCase())
}

export default LocalPhotoPick
