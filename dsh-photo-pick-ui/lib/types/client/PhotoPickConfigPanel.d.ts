/**
 * Session-header photo-pick workspace.
 * Dialog shell / config folds / tiled browse mirror media-ui Image & video scan;
 * actions select paths for photo_pick_best instead of tagging jobs.
 * @module dsh-photo-pick-ui/client/PhotoPickConfigPanel
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react';
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client';
import { type PhotoPickSettingsState, type PhotoPickSettingsStore } from './store.ts';
/** Injected dependencies of the photo-pick workspace chips. */
export interface PhotoPickConfigPanelInjected {
    /** Settings store (shared with the settings page). */
    controller: PhotoPickSettingsStore;
    /** Bound snapshot selector. */
    useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>;
    /**
     * Write text into this session's composer draft (does not submit).
     * @param sessionId - active session.
     * @param text - draft body.
     * @returns false when the session input shell is unavailable.
     */
    insertDraft: (sessionId: SessionId, text: string) => boolean;
}
/** Full panel props from the session header-actions slot. */
export type PhotoPickConfigPanelProps = PropsRuntime<'conversation.session.header.actions'> & Partial<PhotoPickConfigPanelInjected> & PropsLocale<'settings.photo-pick'>;
/** Composer tool-row chip props (`conversation.input.left`). */
export type PhotoPickComposerActionProps = PropsRuntime<'conversation.input.left'> & Partial<PhotoPickConfigPanelInjected> & PropsLocale<'settings.photo-pick'>;
/**
 * Render the photo-pick header chip and workspace dialog.
 * Hidden on blank sessions with the session header; use
 * {@link PhotoPickComposerAction} for the always-visible composer entry.
 * @param props - slot runtime + inject face.
 */
export declare function PhotoPickConfigPanel(props: PhotoPickConfigPanelProps): import("react").JSX.Element | null;
/**
 * Photo-pick chip on the composer tool row — visible in blank/hero sessions
 * where the session header (and its actions) are hidden.
 * @param props - input.left runtime + inject face.
 */
export declare function PhotoPickComposerAction(props: PhotoPickComposerActionProps): import("react").JSX.Element | null;
//# sourceMappingURL=PhotoPickConfigPanel.d.ts.map