/**
 * Root validation and path containment helpers for local photo-pick.
 * Adapted from `dsh-media-local/paths` (same workspace-root policy).
 * @module dsh-photo-pick-local/paths
 */
/**
 * Canonicalize an existing directory path.
 * @param root - caller-supplied root.
 * @returns absolute realpath of a directory.
 */
export declare function resolveWorkspaceRoot(root: string): Promise<string>;
/**
 * Reject drive roots and the bare user home directory.
 * @param canonical - realpath directory.
 */
export declare function assertAllowedRoot(canonical: string): void;
/**
 * Resolve a user path under `root` and ensure it cannot escape.
 * @param root - canonical workspace root.
 * @param requested - absolute or root-relative path.
 * @returns canonical file path that exists under root.
 */
export declare function resolveContainedPath(root: string, requested: string): Promise<string>;
/**
 * Relative path using `/` separators for stable display keys.
 * @param root - canonical root.
 * @param filePath - canonical file path under root.
 */
export declare function toRelativePosix(root: string, filePath: string): string;
//# sourceMappingURL=paths.d.ts.map