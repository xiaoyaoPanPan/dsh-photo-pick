/**
 * Object-layer store for the photo-pick settings page (Host catalog model picker).
 * Adapted from `dsh-media-ui/client/store`.
 * @module dsh-photo-pick-ui/client/store
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
const EMPTY_DRAFT = {
    visionEnabled: true,
    visionLlmProvider: '',
    visionModel: '',
    visionScorePrompt: '',
};
const SETTINGS_PATH = '/api/photo-pick/settings';
/** Encode provider + model for a `<select>` option value. */
export function encodeModelKey(provider, model) {
    return `${provider}\u001f${model}`;
}
/** Decode a `<select>` option value into provider + model. */
export function decodeModelKey(key) {
    const sep = key.indexOf('\u001f');
    if (sep <= 0 || sep >= key.length - 1)
        return undefined;
    return { provider: key.slice(0, sep), model: key.slice(sep + 1) };
}
/**
 * Loads and saves photo-pick vision settings (model + scoring prompt).
 */
export class PhotoPickSettingsStore {
    store;
    constructor() {
        this.store = createSnapshotStore({
            status: 'idle',
            writable: true,
            models: [],
            defaultVisionScorePrompt: '',
            visionScoreJsonSuffix: '',
            draft: { ...EMPTY_DRAFT },
            baseline: { ...EMPTY_DRAFT },
            dirty: false,
            saving: false,
        });
    }
    /** Fetch Host settings and LLM catalog options. */
    async load() {
        this.setStatusLoading();
        try {
            const view = await fetchSettings();
            const draft = {
                visionEnabled: view.visionEnabled,
                visionLlmProvider: view.visionLlmProvider,
                visionModel: view.visionModel,
                visionScorePrompt: view.visionScorePrompt,
            };
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
            });
        }
        catch (error) {
            this.store.set({
                ...this.store.getSnapshot(),
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                saving: false,
            });
        }
    }
    /**
     * Stage one draft field.
     * @param field - draft key.
     * @param value - next value.
     */
    edit(field, value) {
        const snap = this.store.getSnapshot();
        if (snap.status !== 'ready' || snap.saving)
            return;
        this.publishDraft(snap, { ...snap.draft, [field]: value });
    }
    /**
     * Select a catalog model (provider + id).
     * @param key - {@link encodeModelKey} value, or empty to clear.
     */
    selectModel(key) {
        const snap = this.store.getSnapshot();
        if (snap.status !== 'ready' || snap.saving)
            return;
        if (key.length === 0) {
            this.publishDraft(snap, {
                ...snap.draft,
                visionLlmProvider: '',
                visionModel: '',
            });
            return;
        }
        const decoded = decodeModelKey(key);
        if (decoded === undefined)
            return;
        this.publishDraft(snap, {
            ...snap.draft,
            visionLlmProvider: decoded.provider,
            visionModel: decoded.model,
        });
    }
    /** Drop staged edits. */
    discard() {
        const snap = this.store.getSnapshot();
        if (snap.status !== 'ready')
            return;
        this.publishDraft(snap, { ...snap.baseline }, false);
    }
    /** Clear the custom scoring prompt (revert to built-in default). */
    resetPrompt() {
        this.edit('visionScorePrompt', '');
    }
    /** Persist settings HTTP body. */
    async save() {
        const snap = this.store.getSnapshot();
        if (snap.status !== 'ready' || !snap.dirty || snap.saving)
            return;
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
        });
        try {
            const { draft } = this.store.getSnapshot();
            const view = await putSettings({
                visionEnabled: draft.visionEnabled,
                visionLlmProvider: draft.visionLlmProvider.trim(),
                visionModel: draft.visionModel.trim(),
                visionScorePrompt: draft.visionScorePrompt,
            });
            const nextDraft = {
                visionEnabled: view.visionEnabled,
                visionLlmProvider: view.visionLlmProvider,
                visionModel: view.visionModel,
                visionScorePrompt: view.visionScorePrompt,
            };
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
            });
        }
        catch (error) {
            this.store.set({
                ...this.store.getSnapshot(),
                saving: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    publishDraft(snap, draft, dirty = !sameDraft(draft, snap.baseline)) {
        const next = {
            status: snap.status,
            writable: snap.writable,
            models: snap.models,
            defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
            visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
            draft,
            baseline: snap.baseline,
            dirty,
            saving: snap.saving,
        };
        if (snap.error !== undefined)
            next.error = snap.error;
        this.store.set(next);
    }
    setStatusLoading() {
        const snap = this.store.getSnapshot();
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
        });
    }
}
function sameDraft(a, b) {
    return a.visionEnabled === b.visionEnabled
        && a.visionLlmProvider === b.visionLlmProvider
        && a.visionModel === b.visionModel
        && a.visionScorePrompt === b.visionScorePrompt;
}
async function fetchSettings() {
    const response = await fetch(SETTINGS_PATH, { credentials: 'same-origin' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
}
async function putSettings(body) {
    const response = await fetch(SETTINGS_PATH, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
            const err = await response.json();
            if (typeof err.error === 'string')
                detail = err.error;
        }
        catch {
            // keep status text
        }
        throw new Error(detail);
    }
    return await response.json();
}
//# sourceMappingURL=store.js.map