import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Keyed toolview for photo_pick_best: thumbnail ranking + open compare dialog.
 * @module dsh-photo-pick-ui/client/PhotoPickResultRow
 */
import { useState } from 'react';
import { Button, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { parsePhotoPickRankMeta } from "./rank-meta.js";
import { PhotoPickCompareDialog } from "./PhotoPickCompareDialog.js";
import css from './PhotoPickResultRow.module.css';
/** How many ranked thumbs to show inline in the chat card. */
const INLINE_TOP_N = 6;
/**
 * Render the photo_pick_best chat tool card with inline ranked thumbnails.
 * @param props - toolview owner currency + photo-pick locale.
 */
export function PhotoPickResultRow(props) {
    const { block, cwd, t } = props;
    const [open, setOpen] = useState(false);
    const [focusPath, setFocusPath] = useState(undefined);
    if (t === undefined)
        return null;
    const done = 'kind' in block;
    const running = !done;
    const isError = done && block.isError;
    const meta = done ? parsePhotoPickRankMeta(block.meta) : undefined;
    const top = meta?.ranked[0];
    const summary = running
        ? t('result.running')
        : isError
            ? t('result.error')
            : top === undefined
                ? t('result.empty')
                : t('result.summary')
                    .replace('{n}', String(meta?.ranked.length ?? 0))
                    .replace('{score}', String(top.score))
                    .replace('{path}', top.relativePath.split(/[/\\]/).pop() || top.relativePath);
    const canCompare = meta !== undefined && cwd !== undefined && cwd.length > 0 && !isError;
    const inlineRows = meta?.ranked.slice(0, INLINE_TOP_N) ?? [];
    const moreCount = meta !== undefined ? Math.max(0, meta.ranked.length - inlineRows.length) : 0;
    const openCompare = (path) => {
        setFocusPath(path);
        setOpen(true);
    };
    return (_jsxs("div", { className: css.row, "data-state": running ? 'running' : isError ? 'error' : 'ok', children: [_jsx("span", { className: css.icon, "aria-hidden": true, children: _jsx(IconBrowseOutline16, { size: 14 }) }), _jsxs("div", { className: css.main, children: [_jsxs("div", { className: css.titleLine, children: [_jsx("span", { className: css.title, children: t('result.title') }), _jsx("span", { className: css.dot, "aria-hidden": true, children: "\u00B7" }), _jsx("span", { className: css.summary, children: summary })] }), canCompare && inlineRows.length > 0 && cwd !== undefined ? (_jsxs("div", { className: css.rankStrip, "aria-label": t('result.rankStrip'), children: [_jsxs("div", { className: css.rankHead, children: [_jsx("span", { className: css.rankTitle, children: t('result.rankTitle') }), moreCount > 0 ? (_jsx("span", { className: css.rankMore, children: t('result.rankMore').replace('{n}', String(moreCount)) })) : null] }), _jsx("ul", { className: css.thumbs, children: inlineRows.map((row, index) => (_jsx("li", { children: _jsx(RankThumb, { root: cwd, row: row, rank: index + 1, onOpen: () => { openCompare(row.relativePath); }, t: t }) }, row.relativePath))) })] })) : null, canCompare ? (_jsxs("div", { className: css.actions, children: [_jsx(Button, { variant: "primary", size: "sm", onClick: () => { openCompare(); }, children: t('result.compare') }), _jsx("span", { className: css.hint, children: t('result.compareHint') })] })) : null] }), open && canCompare && meta !== undefined && cwd !== undefined ? (_jsx(PhotoPickCompareDialog, { root: cwd, meta: meta, ...(focusPath !== undefined ? { initialPath: focusPath } : {}), onClose: () => {
                    setOpen(false);
                    setFocusPath(undefined);
                }, t: t })) : null] }));
}
function RankThumb(props) {
    const { root, row, rank, onOpen, t } = props;
    const [failed, setFailed] = useState(false);
    const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath;
    return (_jsxs("button", { type: "button", className: css.thumbCard, title: `#${rank} · ${row.score} · ${row.relativePath}`, onClick: onOpen, children: [_jsxs("span", { className: css.thumbFrame, children: [!failed ? (_jsx("img", { className: css.thumbImg, src: `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(row.relativePath)}`, alt: "", loading: "lazy", onError: () => { setFailed(true); } })) : (_jsx("span", { className: css.thumbFallback, children: t('panel.previewFailed') })), _jsxs("span", { className: css.thumbRank, children: ["#", rank] }), _jsx("span", { className: css.thumbScore, children: row.score })] }), _jsx("span", { className: css.thumbName, children: fileName })] }));
}
//# sourceMappingURL=PhotoPickResultRow.js.map