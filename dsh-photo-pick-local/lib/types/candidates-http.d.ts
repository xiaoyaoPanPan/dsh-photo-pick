/**
 * Loopback HTTP face for listing workspace images for the photo-pick UI.
 * @module dsh-photo-pick-local/candidates-http
 */
import type { Context } from '@deepseek-ai/cordis';
/** Stable path for candidate listing (`?root=`). */
export declare const PHOTO_PICK_CANDIDATES_HTTP_PATH = "/api/photo-pick/candidates";
/** JSON list body returned to the workspace panel. */
export interface PhotoPickCandidatesHttpView {
    readonly root: string;
    readonly images: readonly {
        readonly relativePath: string;
        readonly size: number;
        readonly mtimeMs: number;
    }[];
}
/**
 * Register GET `/api/photo-pick/candidates` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export declare function registerPhotoPickCandidatesHttp(ctx: Context): () => void;
//# sourceMappingURL=candidates-http.d.ts.map