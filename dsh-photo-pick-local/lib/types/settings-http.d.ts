/**
 * Loopback HTTP face for photo-pick vision settings (tree-out; no apiproxy allowlist).
 * Adapted from `dsh-media-local/settings-http`.
 * @module dsh-photo-pick-local/settings-http
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import type { Config } from './config.ts';
/** Stable path for describe + update. */
export declare const PHOTO_PICK_SETTINGS_HTTP_PATH = "/api/photo-pick/settings";
/** One selectable model from the Host LLM catalog. */
export interface PhotoPickVisionModelOption {
    readonly provider: string;
    readonly providerName: string;
    readonly id: string;
    readonly name: string;
    /**
     * Whether the adapter declares image input.
     * Absent means unknown (still selectable; scoring may fail at runtime).
     */
    readonly supportsVision?: boolean;
}
/** JSON body the settings page reads and writes (no secret literals). */
export interface PhotoPickSettingsHttpView {
    readonly visionEnabled: boolean;
    readonly visionLlmProvider: string;
    readonly visionModel: string;
    /** Built-in free-form instruction (JSON suffix is always appended separately). */
    readonly defaultVisionScorePrompt: string;
    /** Fixed JSON response-format clause appended to every scoring prompt. */
    readonly visionScoreJsonSuffix: string;
    /** User override for the free-form instruction; empty means the default. */
    readonly visionScorePrompt: string;
    readonly models: readonly PhotoPickVisionModelOption[];
    readonly revision: number;
    readonly writable: boolean;
}
/**
 * Register GET/PUT for the photo-pick settings namespace when webServer + settings are present.
 * @param ctx - fiber with webServer and settings.
 * @param ns - photo-pick-local settings namespace.
 * @returns disposer removing the route.
 */
export declare function registerPhotoPickSettingsHttp(ctx: Context, ns: SettingsNamespace): () => void;
/**
 * List Host LLM catalog entries for the photo-pick settings picker.
 * Vision-capable models are sorted first within each provider group.
 * @param ctx - Host context (llm optional).
 */
export declare function listVisionModels(ctx: Context): Promise<PhotoPickVisionModelOption[]>;
/** Parse a settings PUT body into a config patch (exported for unit tests). */
export declare function parsePhotoPickSettingsPatch(body: unknown): Partial<Config> | undefined;
//# sourceMappingURL=settings-http.d.ts.map