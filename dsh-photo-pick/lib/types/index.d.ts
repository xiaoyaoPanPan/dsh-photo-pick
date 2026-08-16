/**
 * Service Definition for the photo-pick capability seam (`ctx.photoPick`).
 * Concrete backends such as `dsh-photo-pick-local` extend this class and
 * populate `ctx.photoPick` when loaded as a Cordis plugin.
 * @module dsh-photo-pick
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { PhotoPickOptions, PhotoPickResult } from './types.ts';
export { PhotoPickError } from './types.ts';
export type { PhotoPickOptions, PhotoPickResult, PhotoPickScore, } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        photoPick: PhotoPick;
    }
}
/**
 * Abstract photo ranker over one mounted workspace root at a time.
 * Callers pass the session cwd as `root`; the backend canonicalizes and
 * confines every candidate path under that root.
 */
export declare abstract class PhotoPick extends Service {
    /**
     * @param ctx - Cordis context that receives `ctx.photoPick`.
     */
    constructor(ctx: Context);
    /**
     * Score a candidate set and return the best photos.
     * @param root - session workspace directory (absolute or relative).
     * @param options - paths and/or media query, topK, and cancellation.
     * @returns ranked picks and full scoring list.
     */
    abstract pickBest(root: string, options: PhotoPickOptions): Promise<PhotoPickResult>;
}
//# sourceMappingURL=index.d.ts.map