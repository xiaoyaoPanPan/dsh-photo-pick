import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Ranked photo compare dialog: free pair pick, synced zoom/pan, and a trash queue.
 * @module dsh-photo-pick-ui/client/PhotoPickCompareDialog
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconChevronLeftOutline14, IconChevronRightOutline14, IconCloseOutline16, IconFolderOpenOutline16, IconPlusOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './PhotoPickCompareDialog.module.css';
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;
/**
 * Full-screen compare overlay for scored photo_pick_best results.
 * Active thumbs stay in the compare queue; passed photos move to a recycle bin
 * and can be restored. In split mode, thumbs assign left/right freely.
 * @param props - root, ranking, close, locale.
 */
export function PhotoPickCompareDialog(props) {
    const { root, meta, initialPath, onClose, t } = props;
    const allRows = meta.ranked;
    const rankByPath = useMemo(() => {
        const map = new Map();
        allRows.forEach((row, i) => { map.set(row.relativePath, i + 1); });
        return map;
    }, [allRows]);
    const rowByPath = useMemo(() => {
        const map = new Map();
        for (const row of allRows)
            map.set(row.relativePath, row);
        return map;
    }, [allRows]);
    const initialLeft = initialPath !== undefined && allRows.some(row => row.relativePath === initialPath)
        ? initialPath
        : (allRows[0]?.relativePath ?? '');
    const initialRight = allRows.find(row => row.relativePath !== initialLeft)?.relativePath
        ?? initialLeft;
    const [activePaths, setActivePaths] = useState(() => allRows.map(r => r.relativePath));
    const [trashPaths, setTrashPaths] = useState([]);
    const [leftPath, setLeftPath] = useState(initialLeft);
    const [rightPath, setRightPath] = useState(initialRight);
    const [focusSide, setFocusSide] = useState('left');
    const [mode, setMode] = useState(() => (allRows.length >= 2 ? 'split' : 'single'));
    const [trashOpen, setTrashOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [focusedNatural, setFocusedNatural] = useState(undefined);
    const resetView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);
    useEffect(() => {
        const paths = allRows.map(r => r.relativePath);
        const nextLeft = initialPath !== undefined && paths.includes(initialPath)
            ? initialPath
            : (paths[0] ?? '');
        const nextRight = paths.find(path => path !== nextLeft) ?? nextLeft;
        setActivePaths(paths);
        setTrashPaths([]);
        setLeftPath(nextLeft);
        setRightPath(nextRight);
        setFocusSide('left');
        setMode(paths.length >= 2 ? 'split' : 'single');
        setTrashOpen(false);
        resetView();
    }, [meta, allRows, initialPath, resetView]);
    const activeRows = useMemo(() => activePaths
        .map(path => rowByPath.get(path))
        .filter((row) => row !== undefined), [activePaths, rowByPath]);
    const trashRows = useMemo(() => trashPaths
        .map(path => rowByPath.get(path))
        .filter((row) => row !== undefined), [trashPaths, rowByPath]);
    // Keep left/right pointing at still-active photos when the queue changes.
    useEffect(() => {
        if (activePaths.length === 0)
            return;
        const leftOk = activePaths.includes(leftPath);
        const rightOk = activePaths.includes(rightPath);
        if (!leftOk) {
            const nextLeft = activePaths[0];
            setLeftPath(nextLeft);
            if (!rightOk || rightPath === nextLeft) {
                setRightPath(activePaths[1] ?? nextLeft);
            }
            return;
        }
        if (!rightOk) {
            setRightPath(activePaths.find(path => path !== leftPath) ?? leftPath);
        }
    }, [activePaths, leftPath, rightPath]);
    useEffect(() => {
        if (mode === 'split' && activePaths.length < 2)
            setMode('single');
    }, [mode, activePaths.length]);
    const split = mode === 'split' && activePaths.length >= 2
        && leftPath.length > 0 && rightPath.length > 0;
    useEffect(() => {
        resetView();
    }, [leftPath, rightPath, mode, detailOpen, resetView]);
    const moveFocusAlongQueue = useCallback((delta) => {
        if (activePaths.length === 0)
            return;
        const current = focusSide === 'left' ? leftPath : rightPath;
        const at = Math.max(0, activePaths.indexOf(current));
        let next = at;
        for (let step = 0; step < activePaths.length; step += 1) {
            next = (next + delta + activePaths.length) % activePaths.length;
            const candidate = activePaths[next];
            if (!split || candidate !== (focusSide === 'left' ? rightPath : leftPath) || activePaths.length === 1) {
                if (focusSide === 'left')
                    setLeftPath(candidate);
                else
                    setRightPath(candidate);
                return;
            }
        }
    }, [activePaths, focusSide, leftPath, rightPath, split]);
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key === 'ArrowLeft') {
                moveFocusAlongQueue(-1);
                return;
            }
            if (event.key === 'ArrowRight') {
                moveFocusAlongQueue(1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); };
    }, [onClose, moveFocusAlongQueue]);
    if (allRows.length === 0)
        return null;
    const left = rowByPath.get(leftPath);
    const right = rowByPath.get(rightPath);
    const setClampedZoom = useCallback((next) => {
        setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100)));
    }, []);
    const onZoomDelta = useCallback((delta) => {
        setZoom(current => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((current + delta) * 100) / 100)));
    }, []);
    const layoutKey = `${mode}:${detailOpen ? '1' : '0'}`;
    const passPhoto = (path) => {
        if (!activePaths.includes(path))
            return;
        setActivePaths(current => current.filter(item => item !== path));
        setTrashPaths(current => current.includes(path) ? current : [...current, path]);
        setTrashOpen(true);
    };
    const restorePhoto = (path) => {
        if (!trashPaths.includes(path))
            return;
        setTrashPaths(current => current.filter(item => item !== path));
        setActivePaths(current => insertByOriginalOrder(current, path, allRows));
    };
    const onThumbClick = (path) => {
        if (!split) {
            setLeftPath(path);
            setFocusSide('left');
            return;
        }
        if (path === leftPath) {
            setFocusSide('left');
            return;
        }
        if (path === rightPath) {
            setFocusSide('right');
            return;
        }
        if (focusSide === 'left')
            setLeftPath(path);
        else
            setRightPath(path);
    };
    const enterSplit = () => {
        if (activePaths.length < 2)
            return;
        setMode('split');
        if (leftPath === rightPath || !activePaths.includes(rightPath)) {
            const other = activePaths.find(path => path !== leftPath) ?? activePaths[1];
            setRightPath(other);
        }
        setFocusSide('right');
    };
    const showLeft = left ?? activeRows[0];
    const showRight = right ?? activeRows[1] ?? activeRows[0];
    const canNavigate = activePaths.length > 1;
    const focusedRow = split
        ? (focusSide === 'left' ? showLeft : showRight)
        : showLeft;
    const focusedRank = focusedRow !== undefined
        ? (rankByPath.get(focusedRow.relativePath) ?? 1)
        : 1;
    useEffect(() => {
        setFocusedNatural(undefined);
    }, [focusedRow?.relativePath]);
    return createPortal((_jsxs("div", { className: css.root, role: "dialog", "aria-modal": "true", "aria-label": t('compare.title'), children: [_jsx("button", { type: "button", className: css.mask, "aria-label": t('compare.close'), onClick: onClose }), _jsxs("div", { className: css.card, children: [_jsxs("header", { className: css.head, children: [_jsxs("div", { className: css.headStart, children: [_jsx("h2", { className: css.title, children: t('compare.title') }), _jsxs("span", { className: css.meta, children: [meta.visionProvider.length > 0 && meta.visionModel.length > 0
                                                ? `${meta.visionProvider} / ${meta.visionModel}`
                                                : null, meta.visionCalls > 0
                                                ? ` · ${t('compare.calls').replace('{n}', String(meta.visionCalls))}`
                                                : null] })] }), _jsxs("div", { className: css.headEnd, children: [_jsxs("div", { className: css.zoomBar, role: "group", "aria-label": t('compare.zoom'), children: [_jsx(Button, { variant: "outline", size: "sm", disabled: zoom <= ZOOM_MIN, title: t('panel.previewZoomOut'), "aria-label": t('panel.previewZoomOut'), onClick: () => { setClampedZoom(zoom - ZOOM_STEP); }, children: "\u2212" }), _jsxs("span", { className: css.zoomValue, children: [Math.round(zoom * 100), "%"] }), _jsx(Button, { variant: "outline", size: "sm", disabled: zoom >= ZOOM_MAX, title: t('panel.previewZoomIn'), "aria-label": t('panel.previewZoomIn'), onClick: () => { setClampedZoom(zoom + ZOOM_STEP); }, children: _jsx(IconPlusOutline16, { size: 12 }) }), _jsx(Button, { variant: "ghost", size: "sm", disabled: zoom === 1 && pan.x === 0 && pan.y === 0, title: t('panel.previewZoomReset'), onClick: resetView, children: t('panel.previewZoomReset') })] }), _jsxs("div", { className: css.modeToggle, role: "group", "aria-label": t('compare.mode'), children: [_jsx("button", { type: "button", className: css.modeBtn, "data-active": mode === 'single' || undefined, onClick: () => {
                                                    setMode('single');
                                                    setFocusSide('left');
                                                    resetView();
                                                }, children: t('compare.modeSingle') }), _jsx("button", { type: "button", className: css.modeBtn, "data-active": mode === 'split' || undefined, disabled: activePaths.length < 2, onClick: () => {
                                                    enterSplit();
                                                    resetView();
                                                }, children: t('compare.modeSplit') })] }), _jsx("button", { type: "button", className: css.modeBtn, "data-active": detailOpen || undefined, title: detailOpen ? t('panel.tabDetailHide') : t('panel.tabDetailShow'), "aria-pressed": detailOpen, onClick: () => { setDetailOpen(open => !open); }, children: t('compare.tabDetail') }), _jsx("button", { type: "button", className: css.close, "aria-label": t('compare.close'), onClick: onClose, children: _jsx(IconCloseOutline16, { size: 14 }) })] })] }), _jsx("p", { className: css.hint, children: split ? t('compare.hintSplitPick') : t('compare.hintSingle') }), showLeft === undefined ? (_jsxs("div", { className: css.emptyQueue, children: [_jsx("p", { className: css.noteEmpty, children: t('compare.queueEmpty') }), trashRows.length > 0 ? (_jsx(Button, { variant: "outline", size: "sm", onClick: () => { setTrashOpen(true); }, children: t('compare.trashOpen') })) : null] })) : (_jsxs("div", { className: css.mainRow, "data-detail": detailOpen || undefined, children: [_jsxs("div", { className: css.body, "data-split": split || undefined, children: [showLeft !== undefined ? (_jsx(RankPane, { root: root, row: showLeft, rank: rankByPath.get(showLeft.relativePath) ?? 1, ...(split ? { sideLabel: t('compare.sideLeft') } : {}), focused: split && focusSide === 'left', onFocus: () => { setFocusSide('left'); }, onPass: () => { passPhoto(showLeft.relativePath); }, t: t, zoom: zoom, pan: pan, onZoomDelta: onZoomDelta, onPanChange: setPan, ...(!split || focusSide === 'left'
                                            ? { onNaturalSize: setFocusedNatural }
                                            : {}) }, `L:${layoutKey}:${showLeft.relativePath}`)) : null, split && showRight !== undefined ? (_jsx(RankPane, { root: root, row: showRight, rank: rankByPath.get(showRight.relativePath) ?? 1, sideLabel: t('compare.sideRight'), focused: focusSide === 'right', onFocus: () => { setFocusSide('right'); }, onPass: () => { passPhoto(showRight.relativePath); }, t: t, zoom: zoom, pan: pan, onZoomDelta: onZoomDelta, onPanChange: setPan, ...(focusSide === 'right' ? { onNaturalSize: setFocusedNatural } : {}) }, `R:${layoutKey}:${showRight.relativePath}`)) : null] }), detailOpen && focusedRow !== undefined ? (_jsx("aside", { className: css.detailPane, "aria-label": t('compare.tabDetail'), children: _jsxs("div", { className: css.detailLog, children: [_jsxs("div", { className: css.detailField, children: [_jsx("span", { className: css.detailLabel, children: t('compare.detailPath') }), _jsx("span", { title: focusedRow.relativePath, children: focusedRow.relativePath })] }), _jsxs("div", { className: css.detailField, children: [_jsx("span", { className: css.detailLabel, children: t('compare.detailRank') }), _jsxs("span", { children: ["#", focusedRank] })] }), _jsxs("div", { className: css.detailField, children: [_jsx("span", { className: css.detailLabel, children: t('compare.detailScore') }), _jsx("span", { children: focusedRow.score })] }), (meta.visionProvider.length > 0 || meta.visionModel.length > 0) ? (_jsxs("div", { className: css.detailField, children: [_jsx("span", { className: css.detailLabel, children: t('compare.detailModel') }), _jsx("span", { children: [meta.visionProvider, meta.visionModel].filter(s => s.length > 0).join(' / ') })] })) : null, focusedNatural !== undefined ? (_jsxs("div", { className: css.detailField, children: [_jsx("span", { className: css.detailLabel, children: t('compare.detailSize') }), _jsxs("span", { children: [focusedNatural.width, " \u00D7 ", focusedNatural.height] })] })) : null, _jsxs("div", { className: css.detailBlock, children: [_jsx("span", { className: css.detailLabel, children: t('compare.reasons') }), focusedRow.reasons.length > 0 ? (_jsx("ul", { children: focusedRow.reasons.map(text => _jsx("li", { children: text }, text)) })) : (_jsx("p", { className: css.noteEmpty, children: t('compare.none') }))] }), _jsxs("div", { className: css.detailBlock, children: [_jsx("span", { className: css.detailLabel, children: t('compare.flaws') }), focusedRow.flaws.length > 0 ? (_jsx("ul", { children: focusedRow.flaws.map(text => _jsx("li", { children: text }, text)) })) : (_jsx("p", { className: css.noteEmpty, children: t('compare.none') }))] }), focusedRow.error !== undefined ? (_jsx("p", { className: css.error, children: focusedRow.error })) : null] }) })) : null] })), _jsxs("footer", { className: css.foot, children: [_jsxs("div", { className: css.nav, children: [_jsxs(Button, { variant: "outline", size: "sm", disabled: !canNavigate, "aria-label": t('compare.prev'), onClick: () => { moveFocusAlongQueue(-1); }, children: [_jsx(IconChevronLeftOutline14, { size: 14 }), t('compare.prev')] }), _jsx("span", { className: css.position, children: split
                                            ? t('compare.positionPair')
                                                .replace('{a}', String(rankByPath.get(leftPath) ?? '?'))
                                                .replace('{b}', String(rankByPath.get(rightPath) ?? '?'))
                                                .replace('{n}', String(activePaths.length))
                                            : t('compare.position')
                                                .replace('{i}', String(Math.max(1, activePaths.indexOf(leftPath) + 1)))
                                                .replace('{n}', String(activePaths.length)) }), _jsxs(Button, { variant: "outline", size: "sm", disabled: !canNavigate, "aria-label": t('compare.next'), onClick: () => { moveFocusAlongQueue(1); }, children: [t('compare.next'), _jsx(IconChevronRightOutline14, { size: 14 })] })] }), _jsxs("div", { className: css.queueBlock, children: [_jsxs("div", { className: css.queueHead, children: [_jsx("span", { className: css.queueTitle, children: t('compare.queueActive').replace('{n}', String(activeRows.length)) }), split ? (_jsx("span", { className: css.queueHint, children: focusSide === 'left' ? t('compare.focusLeft') : t('compare.focusRight') })) : null] }), _jsx("ul", { className: css.thumbs, children: activeRows.map((row) => {
                                            const path = row.relativePath;
                                            const rank = rankByPath.get(path) ?? 0;
                                            const isLeft = path === leftPath;
                                            const isRight = split && path === rightPath;
                                            const isFocus = split
                                                ? (focusSide === 'left' ? isLeft : isRight)
                                                : isLeft;
                                            return (_jsxs("li", { className: css.thumbItem, children: [_jsxs("button", { type: "button", className: css.thumb, "data-active": (isLeft || isRight) || undefined, "data-focus": isFocus || undefined, "data-side": isLeft && isRight ? 'both' : isLeft ? 'left' : isRight ? 'right' : undefined, title: `#${rank} · ${row.score}`, onClick: () => { onThumbClick(path); }, children: [_jsx("img", { src: fileUrl(root, path), alt: "", loading: "lazy" }), _jsxs("span", { className: css.thumbBadge, children: ["#", rank] }), isLeft || isRight ? (_jsx("span", { className: css.thumbSide, children: isLeft && isRight ? 'L/R' : isLeft ? 'L' : 'R' })) : null, _jsx("span", { className: css.thumbScore, children: row.score })] }), _jsx("button", { type: "button", className: css.thumbPass, title: t('compare.pass'), "aria-label": t('compare.pass'), onClick: (event) => {
                                                            event.stopPropagation();
                                                            passPhoto(path);
                                                        }, children: "\u2212" })] }, path));
                                        }) })] }), _jsxs("div", { className: css.trashBlock, children: [_jsxs("button", { type: "button", className: css.trashToggle, "aria-expanded": trashOpen, onClick: () => { setTrashOpen(current => !current); }, children: [_jsx("span", { children: t('compare.trash').replace('{n}', String(trashRows.length)) }), _jsx("span", { className: css.trashChevron, "data-open": trashOpen || undefined, children: "\u25BE" })] }), trashOpen ? (trashRows.length === 0 ? (_jsx("p", { className: css.trashEmpty, children: t('compare.trashEmpty') })) : (_jsx("ul", { className: css.thumbs, children: trashRows.map((row) => {
                                            const path = row.relativePath;
                                            const rank = rankByPath.get(path) ?? 0;
                                            return (_jsxs("li", { className: css.thumbItem, children: [_jsxs("button", { type: "button", className: css.thumb, "data-trashed": "", title: `#${rank} · ${row.score}`, onClick: () => { restorePhoto(path); }, children: [_jsx("img", { src: fileUrl(root, path), alt: "", loading: "lazy" }), _jsxs("span", { className: css.thumbBadge, children: ["#", rank] }), _jsx("span", { className: css.thumbScore, children: row.score })] }), _jsx("button", { type: "button", className: css.thumbRestore, title: t('compare.restore'), "aria-label": t('compare.restore'), onClick: () => { restorePhoto(path); }, children: "+" })] }, path));
                                        }) }))) : null] })] })] })] })), document.body);
}
/**
 * Insert a path back into the active queue using original ranking order.
 * @param current - active paths.
 * @param path - restored path.
 * @param allRows - original ranked rows.
 */
function insertByOriginalOrder(current, path, allRows) {
    if (current.includes(path))
        return [...current];
    const order = new Map(allRows.map((row, i) => [row.relativePath, i]));
    const next = [...current, path];
    next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    return next;
}
function RankPane(props) {
    const { root, row, rank, sideLabel, focused, onFocus, onPass, t, zoom, pan, onZoomDelta, onPanChange, onNaturalSize, } = props;
    const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath;
    const viewportRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [natural, setNatural] = useState(undefined);
    const [viewport, setViewport] = useState(undefined);
    const dragRef = useRef(null);
    useEffect(() => {
        setNatural(undefined);
    }, [row.relativePath]);
    useEffect(() => {
        onNaturalSize?.(natural);
    }, [natural, onNaturalSize]);
    // Parent remounts this pane on single↔split via key=…layoutKey…, so measure once
    // on mount + ResizeObserver — no stale full-width size from the previous mode.
    useLayoutEffect(() => {
        const el = viewportRef.current;
        if (el === null)
            return;
        const sync = () => {
            const rect = el.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);
            if (width <= 0 || height <= 0)
                return;
            setViewport(current => (current !== undefined && current.width === width && current.height === height
                ? current
                : { width, height }));
        };
        sync();
        const raf = requestAnimationFrame(sync);
        const observer = new ResizeObserver(sync);
        observer.observe(el);
        const onWheelNative = (event) => {
            event.preventDefault();
            const direction = event.deltaY < 0 ? 1 : -1;
            onZoomDelta(direction * ZOOM_STEP);
        };
        el.addEventListener('wheel', onWheelNative, { passive: false });
        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            el.removeEventListener('wheel', onWheelNative);
        };
    }, [onZoomDelta]);
    const fitScale = natural !== undefined && viewport !== undefined && natural.width > 0 && natural.height > 0
        ? Math.min(viewport.width / natural.width, viewport.height / natural.height)
        : undefined;
    const displayWidth = fitScale !== undefined && natural !== undefined
        ? Math.max(1, natural.width * fitScale)
        : undefined;
    const displayHeight = fitScale !== undefined && natural !== undefined
        ? Math.max(1, natural.height * fitScale)
        : undefined;
    const onPointerDown = (event) => {
        if (event.button !== 0)
            return;
        onFocus?.();
        const el = viewportRef.current;
        if (el === null)
            return;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: pan.x,
            originY: pan.y,
        };
        setDragging(true);
        el.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        onPanChange({
            x: drag.originX + (event.clientX - drag.startX),
            y: drag.originY + (event.clientY - drag.startY),
        });
    };
    const endDrag = (event) => {
        const drag = dragRef.current;
        if (drag === null || drag.pointerId !== event.pointerId)
            return;
        dragRef.current = null;
        setDragging(false);
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        catch {
            // Pointer already released by the browser.
        }
    };
    return (_jsxs("section", { className: css.pane, "data-focused": focused || undefined, onClick: () => { onFocus?.(); }, children: [_jsxs("div", { className: css.paneHead, children: [sideLabel !== undefined ? _jsx("span", { className: css.sideTag, children: sideLabel }) : null, _jsxs("span", { className: css.rankBadge, title: `#${rank}`, children: [_jsx("span", { className: css.rankBadgeHash, children: "#" }), _jsx("span", { className: css.rankBadgeNum, children: rank })] }), _jsxs("span", { className: css.scoreBadge, title: t('compare.score').replace('{n}', String(row.score)), children: [_jsx("span", { className: css.scoreBadgeValue, children: row.score }), _jsx("span", { className: css.scoreBadgeUnit, children: t('compare.scoreUnit') })] }), _jsx("span", { className: css.path, title: row.relativePath, children: fileName }), _jsxs("div", { className: css.paneHeadActions, children: [_jsx("button", { type: "button", className: css.paneAction, title: t('compare.reveal'), "aria-label": t('compare.reveal'), onClick: (event) => {
                                    event.stopPropagation();
                                    void revealInFileManager(root, row.relativePath, t);
                                }, children: _jsx(IconFolderOpenOutline16, { size: 14 }) }), onPass !== undefined ? (_jsx("button", { type: "button", className: css.panePassAction, title: t('compare.pass'), "aria-label": t('compare.pass'), onClick: (event) => {
                                    event.stopPropagation();
                                    onPass();
                                }, children: "\u2212" })) : null] })] }), _jsx("div", { ref: viewportRef, className: css.preview, "data-dragging": dragging || undefined, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, children: _jsx("img", { className: css.previewImage, src: fileUrl(root, row.relativePath), alt: row.relativePath, style: {
                        ...(displayWidth !== undefined && displayHeight !== undefined
                            ? { width: displayWidth, height: displayHeight }
                            : { maxWidth: '100%', maxHeight: '100%' }),
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }, onLoad: (event) => {
                        setNatural({
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                        });
                    }, draggable: false }) }), _jsxs("div", { className: css.notes, children: [_jsxs("div", { className: css.noteBlock, children: [_jsx("span", { className: css.noteLabel, "data-kind": "pro", children: t('compare.reasons') }), row.reasons.length > 0 ? (_jsx("ul", { className: css.chipList, children: row.reasons.map(text => (_jsx("li", { className: css.chip, "data-kind": "pro", title: text, children: text }, text))) })) : (_jsx("p", { className: css.noteEmpty, children: t('compare.none') }))] }), _jsxs("div", { className: css.noteBlock, children: [_jsx("span", { className: css.noteLabel, "data-kind": "con", children: t('compare.flaws') }), row.flaws.length > 0 ? (_jsx("ul", { className: css.chipList, children: row.flaws.map(text => (_jsx("li", { className: css.chip, "data-kind": "con", title: text, children: text }, text))) })) : (_jsx("p", { className: css.noteEmpty, children: t('compare.none') }))] }), row.error !== undefined ? (_jsx("p", { className: css.error, children: row.error })) : null] })] }));
}
function fileUrl(root, relativePath) {
    return `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(relativePath)}`;
}
/**
 * Ask the Host to select this photo in the OS file manager.
 * @param root - workspace root.
 * @param relativePath - path under root.
 * @param t - locale thunk for failure toast text.
 */
async function revealInFileManager(root, relativePath, t) {
    try {
        const response = await fetch('/api/photo-pick/reveal', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ root, path: relativePath }),
        });
        if (!response.ok) {
            window.alert(t('compare.revealFailed'));
        }
    }
    catch {
        window.alert(t('compare.revealFailed'));
    }
}
//# sourceMappingURL=PhotoPickCompareDialog.js.map