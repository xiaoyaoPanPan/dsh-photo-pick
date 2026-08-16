/**
 * Root validation and path containment helpers for local photo-pick.
 * Adapted from `dsh-media-local/paths` (same workspace-root policy).
 * @module dsh-photo-pick-local/paths
 */

import { realpathSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, parse, relative, resolve, sep } from 'node:path'
import { PhotoPickError } from 'dsh-photo-pick'

/**
 * Canonicalize an existing directory path.
 * @param root - caller-supplied root.
 * @returns absolute realpath of a directory.
 */
export async function resolveWorkspaceRoot(root: string): Promise<string> {
  const absolute = resolve(root)
  let canonical: string
  try {
    canonical = await realpath(absolute)
  } catch {
    throw new PhotoPickError(`workspace root is missing or unreadable: ${absolute}`, 'ROOT_MISSING')
  }
  const info = await stat(canonical)
  if (!info.isDirectory()) {
    throw new PhotoPickError(`workspace root is not a directory: ${canonical}`, 'INVALID_ROOT')
  }
  assertAllowedRoot(canonical)
  return canonical
}

/**
 * Reject drive roots and the bare user home directory.
 * @param canonical - realpath directory.
 */
export function assertAllowedRoot(canonical: string): void {
  const normalized = trimSep(canonical)
  let home: string
  try {
    home = trimSep(realpathSync(homedir()))
  } catch {
    home = trimSep(resolve(homedir()))
  }
  if (normalized.toLowerCase() === home.toLowerCase()) {
    throw new PhotoPickError(
      'refusing to use the user home directory as a photo-pick root',
      'INVALID_ROOT',
    )
  }
  const driveRoot = trimSep(parse(canonical).root)
  if (driveRoot !== '' && normalized.toLowerCase() === driveRoot.toLowerCase()) {
    throw new PhotoPickError(
      'refusing to use a drive or filesystem root as a photo-pick root',
      'INVALID_ROOT',
    )
  }
}

/**
 * Resolve a user path under `root` and ensure it cannot escape.
 * @param root - canonical workspace root.
 * @param requested - absolute or root-relative path.
 * @returns canonical file path that exists under root.
 */
export async function resolveContainedPath(root: string, requested: string): Promise<string> {
  const absolute = isAbsolute(requested) ? resolve(requested) : resolve(root, requested)
  let canonical: string
  try {
    canonical = await realpath(absolute)
  } catch {
    throw new PhotoPickError(`path not found under workspace root: ${requested}`, 'NOT_FOUND')
  }
  const rel = relative(root, canonical)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new PhotoPickError(`path escapes workspace root: ${requested}`, 'PATH_ESCAPE')
  }
  return canonical
}

/**
 * Relative path using `/` separators for stable display keys.
 * @param root - canonical root.
 * @param filePath - canonical file path under root.
 */
export function toRelativePosix(root: string, filePath: string): string {
  return relative(root, filePath).split(sep).join('/')
}

function trimSep(value: string): string {
  return value.replace(/[/\\]+$/, '')
}
