import { describe, expect, it } from 'vitest'
import { parseVisionScoreJson, truncateVisionResponse } from '../src/parse-score.ts'

describe('parseVisionScoreJson', () => {
  it('parses a plain JSON object', () => {
    expect(parseVisionScoreJson('{"score":88,"reasons":["sharp"],"flaws":["slight noise"]}')).toEqual({
      score: 88,
      reasons: ['sharp'],
      flaws: ['slight noise'],
    })
  })

  it('parses fenced JSON and clamps score', () => {
    expect(parseVisionScoreJson('```json\n{"score":120,"reasons":[],"flaws":[]}\n```')).toEqual({
      score: 100,
      reasons: [],
      flaws: [],
    })
  })

  it('returns undefined for unusable text', () => {
    expect(parseVisionScoreJson('no json here')).toBeUndefined()
    expect(parseVisionScoreJson('{"score":"x"}')).toBeUndefined()
  })
})

describe('truncateVisionResponse', () => {
  it('leaves short text unchanged', () => {
    expect(truncateVisionResponse('abc')).toBe('abc')
  })
})
