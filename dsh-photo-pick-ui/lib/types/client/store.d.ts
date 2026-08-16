/**
 * Object-layer store for the photo-pick settings page (Host catalog model picker).
 * Adapted from `dsh-media-ui/client/store`.
 * @module dsh-photo-pick-ui/client/store
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** One model option from `/api/photo-pick/settings`. */
export interface PhotoPickVisionModelOption {
    readonly provider: string;
    readonly providerName: string;
    readonly id: string;
    readonly name: string;
    readonly supportsVision?: boolean;
}
/** Host JSON view at `/api/photo-pick/settings`. */
export interface PhotoPickSettingsHttpView {
    readonly visionEnabled: boolean;
    readonly visionLlmProvider: string;
    readonly visionModel: string;
    readonly defaultVisionScorePrompt: string;
    readonly visionScoreJsonSuffix: string;
    readonly visionScorePrompt: string;
    readonly models: readonly PhotoPickVisionModelOption[];
    readonly revision: number;
    readonly writable: boolean;
}
/** Draft fields the page edits. */
export interface PhotoPickSettingsDraft {
    visionEnabled: boolean;
    visionLlmProvider: string;
    visionModel: string;
    visionScorePrompt: string;
}
/** Renderable page state. */
export interface PhotoPickSettingsState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
    notice?: string;
    writable: boolean;
    models: readonly PhotoPickVisionModelOption[];
    defaultVisionScorePrompt: string;
    visionScoreJsonSuffix: string;
    draft: PhotoPickSettingsDraft;
    baseline: PhotoPickSettingsDraft;
    dirty: boolean;
    saving: boolean;
}
/** Encode provider + model for a `<select>` option value. */
export declare function encodeModelKey(provider: string, model: string): string;
/** Decode a `<select>` option value into provider + model. */
export declare function decodeModelKey(key: string): {
    provider: string;
    model: string;
} | undefined;
/**
 * Loads and saves photo-pick vision settings (model + scoring prompt).
 */
export declare class PhotoPickSettingsStore {
    readonly store: SnapshotStore<PhotoPickSettingsState>;
    constructor();
    /** Fetch Host settings and LLM catalog options. */
    load(): Promise<void>;
    /**
     * Stage one draft field.
     * @param field - draft key.
     * @param value - next value.
     */
    edit<K extends keyof PhotoPickSettingsDraft>(field: K, value: PhotoPickSettingsDraft[K]): void;
    /**
     * Select a catalog model (provider + id).
     * @param key - {@link encodeModelKey} value, or empty to clear.
     */
    selectModel(key: string): void;
    /** Drop staged edits. */
    discard(): void;
    /** Clear the custom scoring prompt (revert to built-in default). */
    resetPrompt(): void;
    /** Persist settings HTTP body. */
    save(): Promise<void>;
    private publishDraft;
    private setStatusLoading;
}
//# sourceMappingURL=store.d.ts.map