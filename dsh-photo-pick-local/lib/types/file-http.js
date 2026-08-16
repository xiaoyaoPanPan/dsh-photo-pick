/**
 * Loopback HTTP face for serving a root-contained image for photo-pick UI preview.
 * @module dsh-photo-pick-local/file-http
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { PhotoPickError } from 'dsh-photo-pick';
import { writeJson } from "./http-json.js";
import { resolveContainedPath, resolveWorkspaceRoot } from "./paths.js";
/** GET preview path (`?root=` + `&path=` relative). */
export const PHOTO_PICK_FILE_HTTP_PATH = '/api/photo-pick/file';
const MAX_PREVIEW_BYTES = 40 * 1024 * 1024;
const IMAGE_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
/**
 * Register GET `/api/photo-pick/file` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export function registerPhotoPickFileHttp(ctx) {
    return ctx.webServer.register({
        kind: 'exact',
        path: PHOTO_PICK_FILE_HTTP_PATH,
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
        const parsed = parseQuery(req.url);
        if (parsed === undefined) {
            writeJson(res, 400, { error: 'missing-root-or-path' });
            return;
        }
        const canonical = await resolveWorkspaceRoot(parsed.root);
        const absolute = await resolveContainedPath(canonical, parsed.relativePath);
        const ext = extname(absolute).toLowerCase();
        const type = IMAGE_TYPES[ext];
        if (type === undefined) {
            writeJson(res, 415, { error: 'unsupported-media-type' });
            return;
        }
        const info = await stat(absolute);
        if (info.size > MAX_PREVIEW_BYTES) {
            writeJson(res, 413, { error: 'preview-too-large' });
            return;
        }
        res.writeHead(200, {
            'content-type': type,
            'content-length': info.size,
            'cache-control': 'private, max-age=60',
        });
        createReadStream(absolute).pipe(res);
    }
    catch (error) {
        if (error instanceof PhotoPickError) {
            const status = error.code === 'NOT_FOUND' || error.code === 'PATH_ESCAPE' ? 404
                : error.code === 'ROOT_MISSING' || error.code === 'INVALID_ROOT' ? 400
                    : 500;
            writeJson(res, status, { error: error.message, code: error.code });
            return;
        }
        const message = error instanceof Error ? error.message : String(error);
        writeJson(res, 500, { error: message.slice(0, 300) });
    }
}
function parseQuery(url) {
    if (url === undefined)
        return undefined;
    const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(q);
    const root = params.get('root');
    const relativePath = params.get('path');
    if (root === null || root.trim().length === 0)
        return undefined;
    if (relativePath === null || relativePath.trim().length === 0)
        return undefined;
    return { root, relativePath };
}
//# sourceMappingURL=file-http.js.map