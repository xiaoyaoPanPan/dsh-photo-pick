/**
 * Parse durable photo_pick_best presentationMeta from a settled tool block.
 * @module dsh-photo-pick-ui/client/rank-meta
 */

/** One ranked row for the compare dialog. */
export interface PhotoPickRankRow {
  readonly relativePath: string
  readonly score: number
  readonly reasons: readonly string[]
  readonly flaws: readonly string[]
  readonly error?: string
}

/** Structured ranking attached to a successful photo_pick_best result. */
export interface PhotoPickRankMeta {
  readonly ranked: readonly PhotoPickRankRow[]
  readonly visionProvider: string
  readonly visionModel: string
  readonly visionCalls: number
}

/**
 * Read ranking metadata from a tool-result block's `meta` field.
 * @param meta - `ToolResultNode.meta` (presentationMeta payload).
 */
export function parsePhotoPickRankMeta(meta: unknown): PhotoPickRankMeta | undefined {
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return undefined
  const raw = meta as Record<string, unknown>
  if (!Array.isArray(raw.ranked)) return undefined
  const ranked: PhotoPickRankRow[] = []
  for (const item of raw.ranked) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    if (typeof row.relativePath !== 'string' || typeof row.score !== 'number') continue
    if (!Array.isArray(row.reasons) || !Array.isArray(row.flaws)) continue
    const reasons = row.reasons.filter((x): x is string => typeof x === 'string')
    const flaws = row.flaws.filter((x): x is string => typeof x === 'string')
    ranked.push({
      relativePath: row.relativePath,
      score: row.score,
      reasons,
      flaws,
      ...typeof row.error === 'string' ? { error: row.error } : {},
    })
  }
  if (ranked.length === 0) return undefined
  return {
    ranked,
    visionProvider: typeof raw.visionProvider === 'string' ? raw.visionProvider : '',
    visionModel: typeof raw.visionModel === 'string' ? raw.visionModel : '',
    visionCalls: typeof raw.visionCalls === 'number' ? raw.visionCalls : ranked.length,
  }
}
