/**
 * Photo-pick settings section UI.
 * @module dsh-photo-pick-ui/client/PhotoPickSection
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react';
import type { PhotoPickUiKey } from './locales.ts';
import { type PhotoPickSettingsState, type PhotoPickSettingsStore } from './store.ts';
/** Injected dependencies of {@link PhotoPickSection}. */
export interface PhotoPickSectionInjected {
    /** Page store. */
    controller: PhotoPickSettingsStore;
    /** Bound snapshot selector. */
    useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>;
    /** Localized copy. */
    t: (key: PhotoPickUiKey) => string;
}
/** Props delivered by the slot outlet. */
export type PhotoPickSectionProps = Partial<PhotoPickSectionInjected>;
/**
 * Render the photo-pick vision settings page.
 * @param props - inject face from the slot registration.
 */
export declare function PhotoPickSection(props: PhotoPickSectionProps): import("react").JSX.Element | null;
//# sourceMappingURL=PhotoPickSection.d.ts.map