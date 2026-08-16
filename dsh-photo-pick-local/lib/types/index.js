/**
 * Local photo-pick backend: workspace containment, vision scoring, optional media search.
 * @module dsh-photo-pick-local
 */
import { extname } from 'node:path';
import { installSettingsSection } from '@deepseek-ai/dsh-settings';
import { PhotoPick, PhotoPickError, } from 'dsh-photo-pick';
import { clampVisionConcurrency, ConfigSchema, DEFAULT_MAX_CANDIDATES, DEFAULT_TOP_K, PHOTO_PICK_SETTINGS_NAMESPACE, resolveConfig, } from "./config.js";
import { resolveContainedPath, resolveWorkspaceRoot, toRelativePosix } from "./paths.js";
import { registerPhotoPickCandidatesHttp } from "./candidates-http.js";
import { registerPhotoPickFileHttp } from "./file-http.js";
import { registerPhotoPickOpenHttp } from "./open-http.js";
import { registerPhotoPickRevealHttp } from "./reveal-http.js";
import { registerPhotoPickSettingsHttp } from "./settings-http.js";
import { createVisionThrottle } from "./vision-throttle.js";
import { resolveScorePrompt, scoreImageWithLlm } from "./vision-score.js";
export { clampVisionConcurrency, ConfigSchema, DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_VISION_BYTES, DEFAULT_TOP_K, DEFAULT_VISION_CONCURRENCY, DEFAULT_VISION_MAX_RETRIES, DEFAULT_VISION_MIN_INTERVAL_MS, DEFAULT_VISION_RETRY_BACKOFF_MS, MAX_VISION_CONCURRENCY, PHOTO_PICK_SETTINGS_NAMESPACE, resolveConfig, } from "./config.js";
export { assertAllowedRoot, resolveContainedPath, resolveWorkspaceRoot } from "./paths.js";
export { DEFAULT_VISION_MAX_EDGE_PX, prepareVisionImage } from "./vision-image.js";
export { createVisionThrottle, isRateLimitReason } from "./vision-throttle.js";
export { parseVisionScoreJson, truncateVisionResponse, } from "./parse-score.js";
export { PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT, PHOTO_PICK_SCORE_JSON_SUFFIX, resolveScorePrompt, scoreImageWithLlm, } from "./vision-score.js";
export { PHOTO_PICK_SETTINGS_HTTP_PATH, parsePhotoPickSettingsPatch, registerPhotoPickSettingsHttp, } from "./settings-http.js";
export { PHOTO_PICK_OPEN_HTTP_PATH, registerPhotoPickOpenHttp, } from "./open-http.js";
export { PHOTO_PICK_REVEAL_HTTP_PATH, registerPhotoPickRevealHttp, } from "./reveal-http.js";
export { isWindowsExplorerBogusFailure, openPhotoPickPath, revealPhotoPickPath, } from "./native-open.js";
/** Image extensions accepted for scoring (aligned with media vision rasters). */
const IMAGE_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
]);
/**
 * Host-local {@link PhotoPick} over `ctx.llm` + `ctx.attachments`.
 */
export class LocalPhotoPick extends PhotoPick {
    static Config = ConfigSchema;
    /** Optional override scorer (tests). */
    scoreImage = undefined;
    entry;
    current;
    inflight = new Map();
    /**
     * @param ctx - Cordis context.
     * @param config - optional cordis.yml fields.
     */
    constructor(ctx, config = {}) {
        super(ctx);
        this.entry = resolveConfig(config);
        this.current = () => this.entry;
        installSettingsSection(ctx, PHOTO_PICK_SETTINGS_NAMESPACE, ConfigSchema, this.entry, {
            setSource: (source) => {
                this.current = source;
            },
            onChange: () => { },
        });
        ctx.inject(['webServer', 'settings'], (scoped) => {
            scoped.effect(() => registerPhotoPickSettingsHttp(scoped, PHOTO_PICK_SETTINGS_NAMESPACE), 'photoPick.settingsHttp');
        });
        ctx.inject(['webServer'], (scoped) => {
            scoped.effect(() => registerPhotoPickCandidatesHttp(scoped), 'photoPick.candidatesHttp');
            scoped.effect(() => registerPhotoPickFileHttp(scoped), 'photoPick.fileHttp');
            scoped.effect(() => registerPhotoPickOpenHttp(scoped), 'photoPick.openHttp');
            scoped.effect(() => registerPhotoPickRevealHttp(scoped), 'photoPick.revealHttp');
        });
    }
    /** @inheritdoc */
    async pickBest(root, options) {
        const canonical = await resolveWorkspaceRoot(root);
        const existing = this.inflight.get(canonical);
        if (existing !== undefined) {
            throw new PhotoPickError('a photo-pick job is already running for this root', 'BUSY');
        }
        const job = this.runPick(canonical, options).finally(() => {
            this.inflight.delete(canonical);
        });
        this.inflight.set(canonical, job);
        return job;
    }
    async runPick(root, options) {
        const resolved = resolveConfig(this.current());
        if (!resolved.visionEnabled) {
            throw new PhotoPickError('vision scoring is disabled in photo-pick settings', 'VISION_DISABLED');
        }
        if (resolved.visionLlmProvider.length === 0 || resolved.visionModel.length === 0) {
            throw new PhotoPickError('configure visionLlmProvider and visionModel (Settings → Models route ids)', 'VISION_UNAVAILABLE');
        }
        const llm = this.ctx.get('llm');
        const attachments = this.ctx.get('attachments');
        if (llm === undefined || attachments === undefined) {
            throw new PhotoPickError('ctx.llm and ctx.attachments are required for vision scoring', 'VISION_UNAVAILABLE');
        }
        const maxCandidates = Math.max(1, Math.min(DEFAULT_MAX_CANDIDATES, Math.floor(options.maxCandidates ?? DEFAULT_MAX_CANDIDATES)));
        const topK = Math.max(1, Math.min(maxCandidates, Math.floor(options.topK ?? DEFAULT_TOP_K)));
        const candidates = await this.resolveCandidates(root, options, maxCandidates);
        if (candidates.length === 0) {
            throw new PhotoPickError('no image candidates: pass paths[] or a mediaLibrary query with image hits', 'NO_CANDIDATES');
        }
        const prompt = resolveScorePrompt(resolved.visionScorePrompt, options.criteria);
        const throttle = createVisionThrottle({
            concurrency: clampVisionConcurrency(resolved.visionConcurrency),
            minIntervalMs: Math.max(0, resolved.visionMinIntervalMs),
            maxRetries: Math.max(0, Math.floor(resolved.visionMaxRetries)),
            retryBackoffMs: Math.max(0, resolved.visionRetryBackoffMs),
        });
        const scoreFn = this.scoreImage ?? scoreImageWithLlm;
        const scoreConfig = {
            provider: resolved.visionLlmProvider,
            model: resolved.visionModel,
            maxBytes: resolved.maxVisionBytes,
            maxEdgePx: resolved.visionMaxEdgePx,
            prompt,
            llm,
            attachments,
        };
        const scored = await Promise.all(candidates.map(async (candidate) => {
            const result = await throttle.run(() => scoreFn(candidate.path, candidate.relativePath, scoreConfig, options.signal), options.signal);
            return result.score;
        }));
        const ranked = [...scored].sort((a, b) => {
            const aOk = a.error === undefined;
            const bOk = b.error === undefined;
            if (aOk !== bOk)
                return aOk ? -1 : 1;
            return b.score - a.score;
        });
        return {
            picks: ranked.filter(row => row.error === undefined).slice(0, topK),
            ranked,
            visionProvider: resolved.visionLlmProvider,
            visionModel: resolved.visionModel,
            visionCalls: scored.length,
        };
    }
    async resolveCandidates(root, options, maxCandidates) {
        const out = [];
        const seen = new Set();
        const push = (absolute, relativePath) => {
            if (!isImagePath(absolute))
                return;
            if (seen.has(absolute))
                return;
            seen.add(absolute);
            out.push({ path: absolute, relativePath });
        };
        if (options.paths !== undefined) {
            for (const requested of options.paths) {
                if (out.length >= maxCandidates)
                    break;
                const absolute = await resolveContainedPath(root, requested);
                push(absolute, toRelativePosix(root, absolute));
            }
        }
        const query = options.query?.trim();
        if (query && query.length > 0 && out.length < maxCandidates) {
            const library = this.ctx.get('mediaLibrary');
            if (library === undefined) {
                if (options.paths === undefined || options.paths.length === 0) {
                    throw new PhotoPickError('mediaLibrary query requires the media plugin (ctx.mediaLibrary); pass paths[] instead', 'NO_CANDIDATES');
                }
            }
            else {
                const hits = await library.search(root, {
                    query,
                    limit: maxCandidates,
                });
                for (const hit of hits) {
                    if (out.length >= maxCandidates)
                        break;
                    if (hit.kind !== 'image')
                        continue;
                    const absolute = await resolveContainedPath(root, hit.path);
                    push(absolute, hit.relativePath || toRelativePosix(root, absolute));
                }
            }
        }
        return out.slice(0, maxCandidates);
    }
}
function isImagePath(filePath) {
    return IMAGE_EXT.has(extname(filePath).toLowerCase());
}
export default LocalPhotoPick;
//# sourceMappingURL=index.js.map