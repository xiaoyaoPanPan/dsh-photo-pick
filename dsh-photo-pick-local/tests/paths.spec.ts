import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PhotoPickError } from 'dsh-photo-pick'
import {
  assertAllowedRoot,
  resolveContainedPath,
  resolveWorkspaceRoot,
  toRelativePosix,
} from '../src/paths.ts'

let root: string | undefined

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('resolveWorkspaceRoot', () => {
  it('canonicalizes an existing directory', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-photo-pick-root-'))
    const canonical = await resolveWorkspaceRoot(root)
    expect(canonical).toBeTruthy()
  })
})

describe('resolveContainedPath', () => {
  it('resolves a relative file under the root', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-photo-pick-path-'))
    const file = join(root, 'a.jpg')
    await writeFile(file, 'x')
    const canonicalRoot = await resolveWorkspaceRoot(root)
    const resolved = await resolveContainedPath(canonicalRoot, 'a.jpg')
    expect(toRelativePosix(canonicalRoot, resolved)).toBe('a.jpg')
  })

  it('rejects escape attempts', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-photo-pick-escape-'))
    const canonicalRoot = await resolveWorkspaceRoot(root)
    await expect(resolveContainedPath(canonicalRoot, '../outside.jpg'))
      .rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<PhotoPickError>)
  })
})

describe('assertAllowedRoot', () => {
  it('rejects a drive root when detectable', () => {
    // On Windows `C:\` is the drive root; on Unix `/` is the filesystem root.
    const drive = process.platform === 'win32' ? 'C:\\' : '/'
    expect(() => assertAllowedRoot(drive)).toThrow(PhotoPickError)
  })
})
