/**
 * Shared JSON helpers for photo-pick loopback HTTP.
 * @module dsh-photo-pick-local/http-json
 */

import type { ServerResponse } from 'node:http'

/** Write a JSON response with content-type and length. */
export function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/**
 * Parse `root` from a query string (`?root=`).
 * @param url - request URL (pathname + search).
 */
export function rootFromUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''
  const params = new URLSearchParams(q)
  const root = params.get('root')
  if (root === null || root.trim().length === 0) return undefined
  return root
}
