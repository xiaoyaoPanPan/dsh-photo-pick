/**
 * Shared JSON helpers for photo-pick loopback HTTP.
 * @module dsh-photo-pick-local/http-json
 */
import type { ServerResponse } from 'node:http';
/** Write a JSON response with content-type and length. */
export declare function writeJson(res: ServerResponse, status: number, body: unknown): void;
/**
 * Parse `root` from a query string (`?root=`).
 * @param url - request URL (pathname + search).
 */
export declare function rootFromUrl(url: string | undefined): string | undefined;
//# sourceMappingURL=http-json.d.ts.map