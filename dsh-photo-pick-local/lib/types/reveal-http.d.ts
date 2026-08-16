/**
 * Loopback HTTP face: reveal a root-contained photo in the OS file manager.
 * @module dsh-photo-pick-local/reveal-http
 */
import type { Context } from '@deepseek-ai/cordis';
/** POST reveal path. */
export declare const PHOTO_PICK_REVEAL_HTTP_PATH = "/api/photo-pick/reveal";
/**
 * Register POST `/api/photo-pick/reveal` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export declare function registerPhotoPickRevealHttp(ctx: Context): () => void;
//# sourceMappingURL=reveal-http.d.ts.map