/**
 * Discover image files under a workspace root for the photo-pick UI.
 * @module dsh-photo-pick-local/discover
 */
/** One discovered image under the workspace root. */
export interface DiscoveredImage {
    readonly absolutePath: string;
    readonly relativePath: string;
    readonly size: number;
    readonly mtimeMs: number;
}
/**
 * Recursively list image files under `root`.
 * @param root - canonical workspace directory.
 * @param signal - cancellation.
 * @param limit - soft cap on returned rows.
 */
export declare function walkImages(root: string, signal?: AbortSignal, limit?: number): Promise<DiscoveredImage[]>;
//# sourceMappingURL=discover.d.ts.map