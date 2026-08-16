/**
 * Object-layer store for the photo-pick settings page (Host catalog model picker).
 * Adapted from `dsh-media-ui/client/store`.
 * @module dsh-photo-pick-ui/client/store
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** One model option from `/api/photo-pick/settings`. */
export interface PhotoPickVisionModelOption {
  readonly provider: string
  readonly providerName: string
  readonly id: string
  readonly name: string
  readonly supportsVision?: boolean
}

/** Host JSON view at `/api/photo-pick/settings`. */
export interface PhotoPickSettingsHttpView {
  readonly visionEnabled: boolean
  readonly visionLlmProvider: string
  readonly visionModel: string
  readonly defaultVisionScorePrompt: string
  readonly visionScoreJsonSuffix: string
  readonly visionScorePrompt: string
  readonly models: readonly PhotoPickVisionModelOption[]
  readonly revision: number
  readonly writable: boolean
}

/** Draft fields the page edits. */
export interface PhotoPickSettingsDraft {
  visionEnabled: boolean
  visionLlmProvider: string
  visionModel: string
  visionScorePrompt: string
}

/** Renderable page state. */
export interface PhotoPickSettingsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  notice?: string
  writable: boolean
  models: readonly PhotoPickVisionModelOption[]
  defaultVisionScorePrompt: string
  visionScoreJsonSuffix: string
  draft: PhotoPickSettingsDraft
  baseline: PhotoPickSettingsDraft
  dirty: boolean
  saving: boolean
}

const EMPTY_DRAFT: PhotoPickSettingsDraft = {
  visionEnabled: true,
  visionLlmProvider: '',
  visionModel: '',
  visionScorePrompt: '',
}

const SETTINGS_PATH = '/api/photo-pick/settings'

/** Encode provider + model for a `<select>` option value. */
export function encodeModelKey(provider: string, model: string): string {
  return `${provider}\u001f${model}`
}

/** Decode a `<select>` option value into provider + model. */
export function decodeModelKey(key: string): { provider: string; model: string } | undefined {
  const sep = key.indexOf('\u001f')
  if (sep <= 0 || sep >= key.length - 1) return undefined
  return { provider: key.slice(0, sep), model: key.slice(sep + 1) }
}

/**
 * Loads and saves photo-pick vision settings (model + scoring prompt).
 */
export class PhotoPickSettingsStore {
  readonly store: SnapshotStore<PhotoPickSettingsState>

  constructor() {
    this.store = createSnapshotStore<PhotoPickSettingsState>({
      status: 'idle',
      writable: true,
      models: [],
      defaultVisionScorePrompt: '',
      visionScoreJsonSuffix: '',
      draft: { ...EMPTY_DRAFT },
      baseline: { ...EMPTY_DRAFT },
      dirty: false,
      saving: false,
    })
  }

  /** Fetch Host settings and LLM catalog options. */
  async load(): Promise<void> {
    this.setStatusLoading()
    try {
      const view = await fetchSettings()
      const draft: PhotoPickSettingsDraft = {
        visionEnabled: view.visionEnabled,
        visionLlmProvider: view.visionLlmProvider,
        visionModel: view.visionModel,
        visionScorePrompt: view.visionScorePrompt,
      }
      this.store.set({
        status: 'ready',
        writable: view.writable,
        models: view.models,
        defaultVisionScorePrompt: view.defaultVisionScorePrompt,
        visionScoreJsonSuffix: view.visionScoreJsonSuffix,
        draft,
        baseline: { ...draft },
        dirty: false,
        saving: false,
      })
    } catch (error: unknown) {
      this.store.set({
        ...this.store.getSnapshot(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        saving: false,
      })
    }
  }

  /**
   * Stage one draft field.
   * @param field - draft key.
   * @param value - next value.
   */
  edit<K extends keyof PhotoPickSettingsDraft>(field: K, value: PhotoPickSettingsDraft[K]): void {
    const snap = this.store.getSnapshot()
    if (snap.status !== 'ready' || snap.saving) return
    this.publishDraft(snap, { ...snap.draft, [field]: value })
  }

  /**
   * Select a catalog model (provider + id).
   * @param key - {@link encodeModelKey} value, or empty to clear.
   */
  selectModel(key: string): void {
    const snap = this.store.getSnapshot()
    if (snap.status !== 'ready' || snap.saving) return
    if (key.length === 0) {
      this.publishDraft(snap, {
        ...snap.draft,
        visionLlmProvider: '',
        visionModel: '',
      })
      return
    }
    const decoded = decodeModelKey(key)
    if (decoded === undefined) return
    this.publishDraft(snap, {
      ...snap.draft,
      visionLlmProvider: decoded.provider,
      visionModel: decoded.model,
    })
  }

  /** Drop staged edits. */
  discard(): void {
    const snap = this.store.getSnapshot()
    if (snap.status !== 'ready') return
    this.publishDraft(snap, { ...snap.baseline }, false)
  }

  /** Clear the custom scoring prompt (revert to built-in default). */
  resetPrompt(): void {
    this.edit('visionScorePrompt', '')
  }

  /** Persist settings HTTP body. */
  async save(): Promise<void> {
    const snap = this.store.getSnapshot()
    if (snap.status !== 'ready' || !snap.dirty || snap.saving) return
    this.store.set({
      status: snap.status,
      writable: snap.writable,
      models: snap.models,
      defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
      visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
      draft: snap.draft,
      baseline: snap.baseline,
      dirty: snap.dirty,
      saving: true,
    })
    try {
      const { draft } = this.store.getSnapshot()
      const view = await putSettings({
        visionEnabled: draft.visionEnabled,
        visionLlmProvider: draft.visionLlmProvider.trim(),
        visionModel: draft.visionModel.trim(),
        visionScorePrompt: draft.visionScorePrompt,
      })
      const nextDraft: PhotoPickSettingsDraft = {
        visionEnabled: view.visionEnabled,
        visionLlmProvider: view.visionLlmProvider,
        visionModel: view.visionModel,
        visionScorePrompt: view.visionScorePrompt,
      }
      this.store.set({
        status: 'ready',
        writable: view.writable,
        models: view.models,
        defaultVisionScorePrompt: view.defaultVisionScorePrompt,
        visionScoreJsonSuffix: view.visionScoreJsonSuffix,
        draft: nextDraft,
        baseline: { ...nextDraft },
        dirty: false,
        saving: false,
        notice: 'saved',
      })
    } catch (error: unknown) {
      this.store.set({
        ...this.store.getSnapshot(),
        saving: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private publishDraft(
    snap: PhotoPickSettingsState,
    draft: PhotoPickSettingsDraft,
    dirty = !sameDraft(draft, snap.baseline),
  ): void {
    const next: PhotoPickSettingsState = {
      status: snap.status,
      writable: snap.writable,
      models: snap.models,
      defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
      visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
      draft,
      baseline: snap.baseline,
      dirty,
      saving: snap.saving,
    }
    if (snap.error !== undefined) next.error = snap.error
    this.store.set(next)
  }

  private setStatusLoading(): void {
    const snap = this.store.getSnapshot()
    this.store.set({
      status: 'loading',
      writable: snap.writable,
      models: snap.models,
      defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
      visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
      draft: snap.draft,
      baseline: snap.baseline,
      dirty: snap.dirty,
      saving: false,
    })
  }
}

function sameDraft(a: PhotoPickSettingsDraft, b: PhotoPickSettingsDraft): boolean {
  return a.visionEnabled === b.visionEnabled
    && a.visionLlmProvider === b.visionLlmProvider
    && a.visionModel === b.visionModel
    && a.visionScorePrompt === b.visionScorePrompt
}

async function fetchSettings(): Promise<PhotoPickSettingsHttpView> {
  const response = await fetch(SETTINGS_PATH, { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return await response.json() as PhotoPickSettingsHttpView
}

async function putSettings(body: {
  visionEnabled: boolean
  visionLlmProvider: string
  visionModel: string
  visionScorePrompt: string
}): Promise<PhotoPickSettingsHttpView> {
  const response = await fetch(SETTINGS_PATH, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const err = await response.json() as { error?: string }
      if (typeof err.error === 'string') detail = err.error
    } catch {
      // keep status text
    }
    throw new Error(detail)
  }
  return await response.json() as PhotoPickSettingsHttpView
}
