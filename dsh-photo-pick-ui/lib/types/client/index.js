/**
 * Browser half: settings.section「照片择优」(always registered when this plugin
 * is installed) + session-header / composer workspace chips (photo-pick preset
 * only) + keyed toolview for photo_pick_best (compare dialog).
 * @module dsh-photo-pick-ui/client
 */
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react';
import { PhotoPickSection } from "./PhotoPickSection.js";
import { PhotoPickComposerAction, PhotoPickConfigPanel, } from "./PhotoPickConfigPanel.js";
import { PhotoPickResultRow } from "./PhotoPickResultRow.js";
import { PhotoPickSettingsStore } from "./store.js";
import { en, zh } from "./locales.js";
export { PHOTO_PICK_AGENT_PRESET_ID } from "./preset.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'settings.photo-pick';
/** Required services; settings.section, header/composer seats, toolview are host-declared. */
export const inject = ['slots', 'locale', 'sessions', 'conversation'];
/**
 * Register the Photo-pick settings section, workspace chips, and tool card.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'photo-pick-ui: copy dictionaries');
    const settingsController = new PhotoPickSettingsStore();
    const useSettingsSnapshot = bindSnapshotSelector(settingsController.store);
    const t = ctx.locale.bind(NS);
    const settingsInjected = () => ({
        controller: settingsController,
        useSnapshot: useSettingsSnapshot,
        t,
    });
    // Scoring model config is Host-global — keep the settings nav entry always on
    // while this plugin is installed. Session workspace chips stay preset-gated.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'photo-pick',
        order: 46,
        label: () => t('nav'),
        locale: NS,
        inject: settingsInjected,
    }, PhotoPickSection));
    const panelInjected = () => ({
        controller: settingsController,
        useSnapshot: useSettingsSnapshot,
        insertDraft: (sessionId, text) => {
            const actx = ctx.sessions.scope(sessionId);
            if (actx === undefined)
                return false;
            ctx.conversation.input.for(actx).setDraft(text);
            return true;
        },
    });
    // Header chip (hidden on blank/hero sessions with the session header chrome).
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'photo-pick-config',
        order: 1,
        locale: NS,
        inject: panelInjected,
    }, PhotoPickConfigPanel));
    // Composer tool-row chip — visible in blank/hero sessions where the header is hidden.
    ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'photo-pick-config',
        order: 20,
        locale: NS,
        inject: panelInjected,
    }, PhotoPickComposerAction));
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
        name: 'tool.call.toolview',
        key: 'photo_pick_best',
        locale: NS,
    }, PhotoPickResultRow));
}
//# sourceMappingURL=index.js.map