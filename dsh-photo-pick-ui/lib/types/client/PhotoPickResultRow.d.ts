/**
 * Keyed toolview for photo_pick_best: thumbnail ranking + open compare dialog.
 * @module dsh-photo-pick-ui/client/PhotoPickResultRow
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
type PhotoPickResultRowProps = ToolCallViewProps & PropsLocale<'settings.photo-pick'>;
/**
 * Render the photo_pick_best chat tool card with inline ranked thumbnails.
 * @param props - toolview owner currency + photo-pick locale.
 */
export declare function PhotoPickResultRow(props: PhotoPickResultRowProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=PhotoPickResultRow.d.ts.map