/**
 * Parse durable photo_pick_best presentationMeta from a settled tool block.
 * @module dsh-photo-pick-ui/client/rank-meta
 */
/** One ranked row for the compare dialog. */
export interface PhotoPickRankRow {
    readonly relativePath: string;
    readonly score: number;
    readonly reasons: readonly string[];
    readonly flaws: readonly string[];
    readonly error?: string;
}
/** Structured ranking attached to a successful photo_pick_best result. */
export interface PhotoPickRankMeta {
    readonly ranked: readonly PhotoPickRankRow[];
    readonly visionProvider: string;
    readonly visionModel: string;
    readonly visionCalls: number;
}
/**
 * Read ranking metadata from a tool-result block's `meta` field.
 * @param meta - `ToolResultNode.meta` (presentationMeta payload).
 */
export declare function parsePhotoPickRankMeta(meta: unknown): PhotoPickRankMeta | undefined;
//# sourceMappingURL=rank-meta.d.ts.map