/**
 * Parse durable photo_pick_best presentationMeta from a settled tool block.
 * @module dsh-photo-pick-ui/client/rank-meta
 */
/**
 * Read ranking metadata from a tool-result block's `meta` field.
 * @param meta - `ToolResultNode.meta` (presentationMeta payload).
 */
export function parsePhotoPickRankMeta(meta) {
    if (meta === null || typeof meta !== 'object' || Array.isArray(meta))
        return undefined;
    const raw = meta;
    if (!Array.isArray(raw.ranked))
        return undefined;
    const ranked = [];
    for (const item of raw.ranked) {
        if (item === null || typeof item !== 'object' || Array.isArray(item))
            continue;
        const row = item;
        if (typeof row.relativePath !== 'string' || typeof row.score !== 'number')
            continue;
        if (!Array.isArray(row.reasons) || !Array.isArray(row.flaws))
            continue;
        const reasons = row.reasons.filter((x) => typeof x === 'string');
        const flaws = row.flaws.filter((x) => typeof x === 'string');
        ranked.push({
            relativePath: row.relativePath,
            score: row.score,
            reasons,
            flaws,
            ...typeof row.error === 'string' ? { error: row.error } : {},
        });
    }
    if (ranked.length === 0)
        return undefined;
    return {
        ranked,
        visionProvider: typeof raw.visionProvider === 'string' ? raw.visionProvider : '',
        visionModel: typeof raw.visionModel === 'string' ? raw.visionModel : '',
        visionCalls: typeof raw.visionCalls === 'number' ? raw.visionCalls : ranked.length,
    };
}
//# sourceMappingURL=rank-meta.js.map