/**
 * Ranking behavior with a mock scorer (no real vision calls).
 */
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { PhotoPickError } from 'dsh-photo-pick'
import { LocalPhotoPick } from '../src/index.ts'
import type { ScoreImageResult } from '../src/vision-score.ts'

let root: string | undefined
let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('LocalPhotoPick.pickBest', () => {
  it('ranks mocked scores and returns topK picks', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-photo-pick-rank-'))
    await writeFile(join(root, 'a.jpg'), 'a')
    await writeFile(join(root, 'b.jpg'), 'b')
    await writeFile(join(root, 'c.jpg'), 'c')

    ctx = new Context()
    const service = new LocalPhotoPick(ctx, {
      visionEnabled: true,
      visionLlmProvider: 'test',
      visionModel: 'vision',
      visionMinIntervalMs: 0,
    })
    // Bypass real llm/attachments: inject stubs via ctx.get by providing services.
    ctx.provide('llm', { stream: async function* () { /* unused */ } }, true)
    ctx.provide('attachments', {
      saveImage: async () => ({ id: 'att' }),
    }, true)
    service.scoreImage = async (filePath, relativePath): Promise<ScoreImageResult> => {
      const score = relativePath.startsWith('b')
        ? 90
        : relativePath.startsWith('a')
          ? 70
          : 40
      return {
        ok: true,
        rateLimited: false,
        score: {
          path: filePath,
          relativePath,
          score,
          reasons: [`mock-${score}`],
          flaws: [],
        },
      }
    }

    const result = await service.pickBest(root, {
      paths: ['a.jpg', 'b.jpg', 'c.jpg'],
      topK: 2,
    })
    expect(result.picks.map(row => row.relativePath)).toEqual(['b.jpg', 'a.jpg'])
    expect(result.ranked).toHaveLength(3)
    expect(result.visionCalls).toBe(3)
  })

  it('rejects when neither paths nor usable query is given', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-photo-pick-empty-'))
    ctx = new Context()
    const service = new LocalPhotoPick(ctx, {
      visionEnabled: true,
      visionLlmProvider: 'test',
      visionModel: 'vision',
    })
    ctx.provide('llm', { stream: async function* () {} }, true)
    ctx.provide('attachments', { saveImage: async () => ({ id: 'att' }) }, true)
    await expect(service.pickBest(root, {})).rejects.toBeInstanceOf(PhotoPickError)
  })
})
