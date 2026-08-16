/**
 * Pins model-visible photo-pick tool names and the system-prompt section
 * through a real Loader cordis.yml composition.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { PhotoPick } from 'dsh-photo-pick'
import type { PhotoPickOptions, PhotoPickResult } from 'dsh-photo-pick'
import * as ToolPhotoPick from 'dsh-tool-photo-pick'
import { PHOTO_PICK_PROMPT } from 'dsh-tool-photo-pick'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

/** Stub PhotoPick so tool-photo-pick can inject without vision. */
class StubPhotoPick extends PhotoPick {
  async pickBest(_root: string, _options: PhotoPickOptions): Promise<PhotoPickResult> {
    return {
      picks: [],
      ranked: [],
      visionProvider: '',
      visionModel: '',
      visionCalls: 0,
    }
  }
}

async function boot(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-tool-photo-pick-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: 'dsh-photo-pick-stub'",
    "- name: 'dsh-tool-photo-pick'",
    '',
  ].join('\n'))

  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['dsh-photo-pick-stub', StubPhotoPick],
    ['dsh-tool-photo-pick', ToolPhotoPick],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

describe('tool-photo-pick real Loader composition', () => {
  it('registers photo_pick_best and the pinned system-prompt section', async () => {
    const ctx = await boot()
    const names = ctx.tools.schemas().map(schema => schema.name).sort()
    expect(names).toEqual(['photo_pick_best'])

    const tool = ctx.tools.get('photo_pick_best')
    expect(tool?.presentCall?.({ paths: ['a/b.jpg'] })).toMatchObject({
      card: 'generic',
      locations: [{ path: 'a/b.jpg' }],
    })

    const assembly = await ctx.systemPrompt.assemble()
    const section = assembly.sections.find(entry => entry.name === 'photo-pick')
    expect(section?.text).toBe(PHOTO_PICK_PROMPT)
  }, 30_000)
})
