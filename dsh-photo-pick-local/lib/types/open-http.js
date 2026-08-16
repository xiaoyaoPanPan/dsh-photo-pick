/**
 * Loopback HTTP face: open a root-contained photo with the OS default app.
 * @module dsh-photo-pick-local/open-http
 */
import { PhotoPickError } from 'dsh-photo-pick';
import { writeJson } from "./http-json.js";
import { openPhotoPickPath } from "./native-open.js";
import { resolveContainedPath, resolveWorkspaceRoot } from "./paths.js";
/** POST open path. */
export const PHOTO_PICK_OPEN_HTTP_PATH = '/api/photo-pick/open';
/**
 * Register POST `/api/photo-pick/open` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export function registerPhotoPickOpenHttp(ctx) {
    return ctx.webServer.register({
        kind: 'exact',
        path: PHOTO_PICK_OPEN_HTTP_PATH,
        handler: (req, res) => {
            void handle(req, res);
        },
    });
}
async function handle(req, res) {
    try {
        if ((req.method ?? 'GET') !== 'POST') {
            writeJson(res, 405, { error: 'method-not-allowed' });
            return;
        }
        const body = await readJsonBody(req);
        const root = typeof body.root === 'string' ? body.root : '';
        const relativePath = typeof body.path === 'string' ? body.path : '';
        if (root.trim().length === 0 || relativePath.trim().length === 0) {
            writeJson(res, 400, { error: 'missing-root-or-path' });
            return;
        }
        const canonical = await resolveWorkspaceRoot(root);
        const absolute = await resolveContainedPath(canonical, relativePath);
        await openPhotoPickPath(absolute, new AbortController().signal);
        writeJson(res, 200, { ok: true });
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
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length === 0)
        return {};
    try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=open-http.js.map