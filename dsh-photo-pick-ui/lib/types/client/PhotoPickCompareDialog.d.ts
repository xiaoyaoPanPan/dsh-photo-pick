/**
 * Ranked photo compare dialog: free pair pick, synced zoom/pan, and a trash queue.
 * @module dsh-photo-pick-ui/client/PhotoPickCompareDialog
 */
import type { PhotoPickUiKey } from './locales.ts';
import type { PhotoPickRankMeta } from './rank-meta.ts';
/** Props for {@link PhotoPickCompareDialog}. */
export interface PhotoPickCompareDialogProps {
    /** Session workspace root for preview URLs. */
    readonly root: string;
    /** Ranking payload from tool presentationMeta. */
    readonly meta: PhotoPickRankMeta;
    /** Optional path to focus when the dialog opens. */
    readonly initialPath?: string;
    /** Close handler. */
    readonly onClose: () => void;
    /** Locale thunk. */
    readonly t: (key: PhotoPickUiKey) => string;
}
/**
 * Full-screen compare overlay for scored photo_pick_best results.
 * Active thumbs stay in the compare queue; passed photos move to a recycle bin
 * and can be restored. In split mode, thumbs assign left/right freely.
 * @param props - root, ranking, close, locale.
 */
export declare function PhotoPickCompareDialog(props: PhotoPickCompareDialogProps): import("react").ReactPortal | null;
//# sourceMappingURL=PhotoPickCompareDialog.d.ts.map