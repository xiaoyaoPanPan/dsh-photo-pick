/**
 * Local photo-pick backend: workspace containment, vision scoring, optional media search.
 * @module dsh-photo-pick-local
 */
import { Context } from '@deepseek-ai/cordis';
import { PhotoPick, type PhotoPickOptions, type PhotoPickResult } from 'dsh-photo-pick';
import { type Config } from './config.ts';
import { scoreImageWithLlm } from './vision-score.ts';
export { clampVisionConcurrency, ConfigSchema, DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_VISION_BYTES, DEFAULT_TOP_K, DEFAULT_VISION_CONCURRENCY, DEFAULT_VISION_MAX_RETRIES, DEFAULT_VISION_MIN_INTERVAL_MS, DEFAULT_VISION_RETRY_BACKOFF_MS, MAX_VISION_CONCURRENCY, PHOTO_PICK_SETTINGS_NAMESPACE, resolveConfig, } from './config.ts';
export type { Config, ResolvedConfig } from './config.ts';
export { assertAllowedRoot, resolveContainedPath, resolveWorkspaceRoot } from './paths.ts';
export { DEFAULT_VISION_MAX_EDGE_PX, prepareVisionImage } from './vision-image.ts';
export type { PreparedVisionImage } from './vision-image.ts';
export { createVisionThrottle, isRateLimitReason } from './vision-throttle.ts';
export type { VisionThrottle, VisionThrottleOptions } from './vision-throttle.ts';
export { parseVisionScoreJson, truncateVisionResponse, } from './parse-score.ts';
export type { ParsedPhotoScore } from './parse-score.ts';
export { PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT, PHOTO_PICK_SCORE_JSON_SUFFIX, resolveScorePrompt, scoreImageWithLlm, } from './vision-score.ts';
export type { ScoreImageConfig, ScoreImageResult } from './vision-score.ts';
export { PHOTO_PICK_SETTINGS_HTTP_PATH, parsePhotoPickSettingsPatch, registerPhotoPickSettingsHttp, } from './settings-http.ts';
export type { PhotoPickSettingsHttpView, PhotoPickVisionModelOption, } from './settings-http.ts';
export { PHOTO_PICK_OPEN_HTTP_PATH, registerPhotoPickOpenHttp, } from './open-http.ts';
export { PHOTO_PICK_REVEAL_HTTP_PATH, registerPhotoPickRevealHttp, } from './reveal-http.ts';
export { isWindowsExplorerBogusFailure, openPhotoPickPath, revealPhotoPickPath, } from './native-open.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        photoPick: PhotoPick;
    }
}
/**
 * Host-local {@link PhotoPick} over `ctx.llm` + `ctx.attachments`.
 */
export declare class LocalPhotoPick extends PhotoPick {
    static Config: import("@deepseek-ai/schemastery").default<Config>;
    /** Optional override scorer (tests). */
    scoreImage: typeof scoreImageWithLlm | undefined;
    private readonly entry;
    private current;
    private readonly inflight;
    /**
     * @param ctx - Cordis context.
     * @param config - optional cordis.yml fields.
     */
    constructor(ctx: Context, config?: Config);
    /** @inheritdoc */
    pickBest(root: string, options: PhotoPickOptions): Promise<PhotoPickResult>;
    private runPick;
    private resolveCandidates;
}
export default LocalPhotoPick;
//# sourceMappingURL=index.d.ts.map