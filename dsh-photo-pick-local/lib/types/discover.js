/**
 * Discover image files under a workspace root for the photo-pick UI.
 * @module dsh-photo-pick-local/discover
 */
import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { toRelativePosix } from "./paths.js";
/** Image extensions listed in the photo-pick workspace panel. */
const IMAGE_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.webp', '.gif',
]);
/**
 * Recursively list image files under `root`.
 * @param root - canonical workspace directory.
 * @param signal - cancellation.
 * @param limit - soft cap on returned rows.
 */
export async function walkImages(root, signal, limit = 500) {
    const out = [];
    async function walk(dir) {
        signal?.throwIfAborted();
        if (out.length >= limit)
            return;
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            signal?.throwIfAborted();
            if (out.length >= limit)
                return;
            if (entry.name.startsWith('.'))
                continue;
            const absolute = join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolute);
                continue;
            }
            if (!entry.isFile())
                continue;
            if (!IMAGE_EXT.has(extname(entry.name).toLowerCase()))
                continue;
            const info = await stat(absolute);
            out.push({
                absolutePath: absolute,
                relativePath: toRelativePosix(root, absolute),
                size: info.size,
                mtimeMs: info.mtimeMs,
            });
        }
    }
    await walk(root);
    out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return out;
}
//# sourceMappingURL=discover.js.map