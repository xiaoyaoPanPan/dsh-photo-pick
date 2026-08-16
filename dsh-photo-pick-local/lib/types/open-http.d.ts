/**
 * Loopback HTTP face: open a root-contained photo with the OS default app.
 * @module dsh-photo-pick-local/open-http
 */
import type { Context } from '@deepseek-ai/cordis';
/** POST open path. */
export declare const PHOTO_PICK_OPEN_HTTP_PATH = "/api/photo-pick/open";
/**
 * Register POST `/api/photo-pick/open` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export declare function registerPhotoPickOpenHttp(ctx: Context): () => void;
//# sourceMappingURL=open-http.d.ts.map