/**
 * Loopback HTTP face for listing workspace images for the photo-pick UI.
 * @module dsh-photo-pick-local/candidates-http
 */
import { PhotoPickError } from 'dsh-photo-pick';
import { walkImages } from "./discover.js";
import { rootFromUrl, writeJson } from "./http-json.js";
import { resolveWorkspaceRoot } from "./paths.js";
/** Stable path for candidate listing (`?root=`). */
export const PHOTO_PICK_CANDIDATES_HTTP_PATH = '/api/photo-pick/candidates';
/**
 * Register GET `/api/photo-pick/candidates` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export function registerPhotoPickCandidatesHttp(ctx) {
    return ctx.webServer.register({
        kind: 'exact',
        path: PHOTO_PICK_CANDIDATES_HTTP_PATH,
        handler: (req, res) => {
            void handle(req, res);
        },
    });
}
async function handle(req, res) {
    try {
        if ((req.method ?? 'GET') !== 'GET') {
            writeJson(res, 405, { error: 'method-not-allowed' });
            return;
        }
        const root = rootFromUrl(req.url);
        if (root === undefined) {
            writeJson(res, 400, { error: 'missing-root' });
            return;
        }
        const canonical = await resolveWorkspaceRoot(root);
        const images = await walkImages(canonical);
        const view = {
            root: canonical,
            images: images.map(row => ({
                relativePath: row.relativePath,
                size: row.size,
                mtimeMs: row.mtimeMs,
            })),
        };
        writeJson(res, 200, view);
    }
    catch (error) {
        writePhotoPickError(res, error);
    }
}
function writePhotoPickError(res, error) {
    if (error instanceof PhotoPickError) {
        const status = error.code === 'ROOT_MISSING' || error.code === 'INVALID_ROOT' ? 400 : 500;
        writeJson(res, status, { error: error.message, code: error.code });
        return;
    }
    const message = error instanceof Error ? error.message : String(error);
    writeJson(res, 500, { error: message.slice(0, 300) });
}
//# sourceMappingURL=candidates-http.js.map