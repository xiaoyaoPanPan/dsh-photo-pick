/**
 * Service Definition for the photo-pick capability seam (`ctx.photoPick`).
 * Concrete backends such as `dsh-photo-pick-local` extend this class and
 * populate `ctx.photoPick` when loaded as a Cordis plugin.
 * @module dsh-photo-pick
 */
import { Service } from '@deepseek-ai/cordis';
export { PhotoPickError } from "./types.js";
/**
 * Abstract photo ranker over one mounted workspace root at a time.
 * Callers pass the session cwd as `root`; the backend canonicalizes and
 * confines every candidate path under that root.
 */
export class PhotoPick extends Service {
    /**
     * @param ctx - Cordis context that receives `ctx.photoPick`.
     */
    constructor(ctx) {
        super(ctx, 'photoPick');
    }
}
//# sourceMappingURL=index.js.map