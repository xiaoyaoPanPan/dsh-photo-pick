/**
 * The bundle's substance is its patch file and dependency list.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'

describe('dsh-photo-pick-app bundle', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))

  it('declares a parseable patch that mounts photo-pick-local', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.dependencies).toHaveProperty('dsh-photo-pick-local')
    expect(manifest.dependencies).toHaveProperty('dsh-photo-pick-ui')
    expect(manifest.dependencies).toHaveProperty('dsh-tool-photo-pick')

    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'),
    )
    expect(Array.isArray(parsed)).toBe(true)
    const rows = (parsed as { insert?: { id?: string; name?: string }[] }[]).flatMap(
      patch => patch.insert ?? [],
    )
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'photo-pick',
        name: 'dsh-photo-pick-local',
      }),
      expect.objectContaining({
        id: 'photo-pick-ui',
        name: 'dsh-photo-pick-ui',
      }),
    ])
  })
})
