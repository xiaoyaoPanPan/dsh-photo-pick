/**
 * Loopback HTTP face: open a root-contained photo with the OS default app.
 * @module dsh-photo-pick-local/open-http
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { PhotoPickError } from 'dsh-photo-pick'
import { writeJson } from './http-json.ts'
import { openPhotoPickPath } from './native-open.ts'
import { resolveContainedPath, resolveWorkspaceRoot } from './paths.ts'

/** POST open path. */
export const PHOTO_PICK_OPEN_HTTP_PATH = '/api/photo-pick/open'

/**
 * Register POST `/api/photo-pick/open` when webServer is present.
 * @param ctx - fiber with webServer.
 */
export function registerPhotoPickOpenHttp(ctx: Context): () => void {
  return ctx.webServer.register({
    kind: 'exact',
    path: PHOTO_PICK_OPEN_HTTP_PATH,
    handler: (req, res) => {
      void handle(req, res)
    },
  })
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if ((req.method ?? 'GET') !== 'POST') {
      writeJson(res, 405, { error: 'method-not-allowed' })
      return
    }
    const body = await readJsonBody(req)
    const root = typeof body.root === 'string' ? body.root : ''
    const relativePath = typeof body.path === 'string' ? body.path : ''
    if (root.trim().length === 0 || relativePath.trim().length === 0) {
      writeJson(res, 400, { error: 'missing-root-or-path' })
      return
    }
    const canonical = await resolveWorkspaceRoot(root)
    const absolute = await resolveContainedPath(canonical, relativePath)
    await openPhotoPickPath(absolute, new AbortController().signal)
    writeJson(res, 200, { ok: true as const })
  } catch (error: unknown) {
    if (error instanceof PhotoPickError) {
      const status = error.code === 'NOT_FOUND' || error.code === 'PATH_ESCAPE' ? 404
        : error.code === 'ROOT_MISSING' || error.code === 'INVALID_ROOT' ? 400
          : 500
      writeJson(res, status, { error: error.message, code: error.code })
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    writeJson(res, 500, { error: message.slice(0, 300) })
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}
