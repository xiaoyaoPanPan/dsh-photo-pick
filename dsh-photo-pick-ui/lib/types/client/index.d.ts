/**
 * Browser half: settings.section「照片择优」(always registered when this plugin
 * is installed) + session-header / composer workspace chips (photo-pick preset
 * only) + keyed toolview for photo_pick_best (compare dialog).
 * @module dsh-photo-pick-ui/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type PhotoPickUiKey } from './locales.ts';
export { PHOTO_PICK_AGENT_PRESET_ID } from './preset.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Photo-pick settings page + header config copy. */
        'settings.photo-pick': PhotoPickUiKey;
    }
}
/** Required services; settings.section, header/composer seats, toolview are host-declared. */
export declare const inject: string[];
/**
 * Register the Photo-pick settings section, workspace chips, and tool card.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map