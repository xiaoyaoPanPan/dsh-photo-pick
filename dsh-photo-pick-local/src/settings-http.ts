/**
 * Loopback HTTP face for photo-pick vision settings (tree-out; no apiproxy allowlist).
 * Adapted from `dsh-media-local/settings-http`.
 * @module dsh-photo-pick-local/settings-http
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import type { Config } from './config.ts'
import {
  PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT,
  PHOTO_PICK_SCORE_JSON_SUFFIX,
} from './vision-score.ts'

/** Stable path for describe + update. */
export const PHOTO_PICK_SETTINGS_HTTP_PATH = '/api/photo-pick/settings'

/** One selectable model from the Host LLM catalog. */
export interface PhotoPickVisionModelOption {
  readonly provider: string
  readonly providerName: string
  readonly id: string
  readonly name: string
  /**
   * Whether the adapter declares image input.
   * Absent means unknown (still selectable; scoring may fail at runtime).
   */
  readonly supportsVision?: boolean
}

/** JSON body the settings page reads and writes (no secret literals). */
export interface PhotoPickSettingsHttpView {
  readonly visionEnabled: boolean
  readonly visionLlmProvider: string
  readonly visionModel: string
  /** Built-in free-form instruction (JSON suffix is always appended separately). */
  readonly defaultVisionScorePrompt: string
  /** Fixed JSON response-format clause appended to every scoring prompt. */
  readonly visionScoreJsonSuffix: string
  /** User override for the free-form instruction; empty means the default. */
  readonly visionScorePrompt: string
  readonly models: readonly PhotoPickVisionModelOption[]
  readonly revision: number
  readonly writable: boolean
}

/**
 * Register GET/PUT for the photo-pick settings namespace when webServer + settings are present.
 * @param ctx - fiber with webServer and settings.
 * @param ns - photo-pick-local settings namespace.
 * @returns disposer removing the route.
 */
export function registerPhotoPickSettingsHttp(ctx: Context, ns: SettingsNamespace): () => void {
  return ctx.webServer.register({
    kind: 'exact',
    path: PHOTO_PICK_SETTINGS_HTTP_PATH,
    handler: (req, res) => {
      void handle(ctx, ns, req, res)
    },
  })
}

async function handle(
  ctx: Context,
  ns: SettingsNamespace,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const method = req.method ?? 'GET'
    if (method === 'GET') {
      writeJson(res, 200, await describeView(ctx, ns))
      return
    }
    if (method === 'PUT' || method === 'POST') {
      if (!ctx.settings.writable) {
        writeJson(res, 403, { error: 'settings-readonly' })
        return
      }
      const body = await readJson(req)
      const patch = parsePatch(body)
      if (patch === undefined) {
        writeJson(res, 400, { error: 'invalid-body' })
        return
      }
      await ctx.settings.update(ns, patch)
      writeJson(res, 200, await describeView(ctx, ns))
      return
    }
    writeJson(res, 405, { error: 'method-not-allowed' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    writeJson(res, 500, { error: message.slice(0, 300) })
  }
}

async function describeView(ctx: Context, ns: SettingsNamespace): Promise<PhotoPickSettingsHttpView> {
  const rows = ctx.settings.describe({ redactSecrets: true }).filter(row => row.ns === ns)
  const row = rows[0]
  const value = (row?.value ?? {}) as Partial<Config>
  return {
    visionEnabled: value.visionEnabled !== false,
    visionLlmProvider: typeof value.visionLlmProvider === 'string' ? value.visionLlmProvider : '',
    visionModel: typeof value.visionModel === 'string' ? value.visionModel : '',
    defaultVisionScorePrompt: PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT,
    visionScoreJsonSuffix: PHOTO_PICK_SCORE_JSON_SUFFIX,
    visionScorePrompt: typeof value.visionScorePrompt === 'string' ? value.visionScorePrompt : '',
    models: await listVisionModels(ctx),
    revision: row?.revision ?? 0,
    writable: ctx.settings.writable,
  }
}

/**
 * List Host LLM catalog entries for the photo-pick settings picker.
 * Vision-capable models are sorted first within each provider group.
 * @param ctx - Host context (llm optional).
 */
export async function listVisionModels(ctx: Context): Promise<PhotoPickVisionModelOption[]> {
  const llm = ctx.get('llm')
  if (llm === undefined) return []
  const out: PhotoPickVisionModelOption[] = []
  for (const provider of llm.listProviders()) {
    let models
    try {
      models = await llm.listModels(provider.id)
    } catch {
      continue
    }
    const rows: PhotoPickVisionModelOption[] = []
    for (const model of models) {
      let supportsVision: boolean | undefined
      try {
        const resolved = await llm.resolveModelInfo(provider.id, model.id)
        if (resolved.inputModalities !== undefined) {
          supportsVision = resolved.inputModalities.includes('image')
        }
      } catch {
        supportsVision = undefined
      }
      rows.push({
        provider: provider.id,
        providerName: provider.name,
        id: model.id,
        name: model.name,
        ...supportsVision === undefined ? {} : { supportsVision },
      })
    }
    rows.sort((a, b) => Number(b.supportsVision === true) - Number(a.supportsVision === true))
    out.push(...rows)
  }
  return out
}

/** Parse a settings PUT body into a config patch (exported for unit tests). */
export function parsePhotoPickSettingsPatch(body: unknown): Partial<Config> | undefined {
  return parsePatch(body)
}

function parsePatch(body: unknown): Partial<Config> | undefined {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return undefined
  const raw = body as Record<string, unknown>
  const patch: Partial<Config> = {}
  if ('visionEnabled' in raw) {
    if (typeof raw.visionEnabled !== 'boolean') return undefined
    patch.visionEnabled = raw.visionEnabled
  }
  if ('visionLlmProvider' in raw) {
    if (typeof raw.visionLlmProvider !== 'string') return undefined
    patch.visionLlmProvider = raw.visionLlmProvider.trim()
  }
  if ('visionModel' in raw) {
    if (typeof raw.visionModel !== 'string') return undefined
    patch.visionModel = raw.visionModel.trim()
  }
  if ('visionScorePrompt' in raw) {
    if (typeof raw.visionScorePrompt !== 'string') return undefined
    patch.visionScorePrompt = raw.visionScorePrompt
  }
  return patch
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {}
  return JSON.parse(text) as unknown
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}
