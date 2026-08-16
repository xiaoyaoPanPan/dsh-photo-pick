/**
 * Loopback HTTP face for serving a root-contained image for photo-pick UI preview.
 * @module dsh-photo-pick-local/file-http
 */
import type { Context } from '@deepseek-ai/cordis';
/** GET preview path (`?root=` + `&path=` relative). */
export declare const PHOTO_PICK_FILE_HTTP_PATH = "/api/photo-pick/file";
/**
 * Register GET `/api/photo-pick/file` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export declare function registerPhotoPickFileHttp(ctx: Context): () => void;
//# sourceMappingURL=file-http.d.ts.map