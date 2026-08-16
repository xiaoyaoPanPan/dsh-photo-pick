/**
 * Parse vision quality-score JSON from model replies.
 * @module dsh-photo-pick-local/parse-score
 */

/** Parsed quality score from one vision reply. */
export interface ParsedPhotoScore {
  readonly score: number
  readonly reasons: readonly string[]
  readonly flaws: readonly string[]
}

/** Cap retained response text for diagnostics. */
export const MAX_VISION_RESPONSE_CHARS = 4_000

/**
 * Truncate a vision reply for storage / tool output.
 * @param text - raw model text.
 */
export function truncateVisionResponse(text: string): string {
  if (text.length <= MAX_VISION_RESPONSE_CHARS) return text
  return `${text.slice(0, MAX_VISION_RESPONSE_CHARS)}…`
}

/**
 * Extract `{ score, reasons, flaws }` from a model reply.
 * Tolerates fenced JSON and surrounding prose.
 * @param text - raw assistant text.
 * @returns parsed score, or `undefined` when unusable.
 */
export function parseVisionScoreJson(text: string): ParsedPhotoScore | undefined {
  const json = extractJsonObject(text)
  if (json === undefined) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  const row = parsed as Record<string, unknown>
  const scoreRaw = row.score
  const score = typeof scoreRaw === 'number'
    ? scoreRaw
    : typeof scoreRaw === 'string'
      ? Number(scoreRaw)
      : Number.NaN
  if (!Number.isFinite(score)) return undefined
  const clamped = Math.min(100, Math.max(0, Math.round(score)))
  return {
    score: clamped,
    reasons: stringList(row.reasons),
    flaws: stringList(row.flaws),
  }
}

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .slice(0, 8)
}

function extractJsonObject(text: string): string | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced?.[1] ?? text).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  return body.slice(start, end + 1)
}
