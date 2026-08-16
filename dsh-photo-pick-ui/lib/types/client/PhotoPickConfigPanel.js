import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Session-header photo-pick workspace.
 * Dialog shell / config folds / tiled browse mirror media-ui Image & video scan;
 * actions select paths for photo_pick_best instead of tagging jobs.
 * @module dsh-photo-pick-ui/client/PhotoPickConfigPanel
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconBrowseOutline16, IconChevronDownOutline14, IconChevronLeftOutline14, IconChevronRightOutline14, IconCloseOutline16, IconPlusOutline16, Modal, } from '@deepseek-ai/dsh-client-ui-primitives';
import { encodeModelKey, } from "./store.js";
import { PHOTO_PICK_AGENT_PRESET_ID } from "./preset.js";
import { buildConfirmDraft, CRITERIA_PRESET_IDS, criteriaHasClause, toggleCriteriaClause, } from "./criteria-presets.js";
import { loadCriteriaDraft, loadCriteriaHistory, rememberCriteria, saveCriteriaDraft, } from "./criteria-history.js";
import css from './PhotoPickConfigPanel.module.css';
const CANDIDATES_PATH = '/api/photo-pick/candidates';
/** Soft optional media index; absent when the media plugin is not installed. */
const MEDIA_ASSETS_PATH = '/api/media-library/assets';
/** Sentinel tag-filter value for images with no tags. */
const UNTAGGED_FILTER = '__untagged__';
const PREVIEW_ZOOM_MIN = 0.25;
const PREVIEW_ZOOM_MAX = 5;
const PREVIEW_ZOOM_STEP = 0.25;
/**
 * Render the photo-pick header chip and workspace dialog.
 * Hidden on blank sessions with the session header; use
 * {@link PhotoPickComposerAction} for the always-visible composer entry.
 * @param props - slot runtime + inject face.
 */
export function PhotoPickConfigPanel(props) {
    const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
    if (controller === undefined || useSnapshot === undefined || insertDraft === undefined || t === undefined) {
        return null;
    }
    return (_jsx(PhotoPickWorkspaceReady, { placement: "header", sessionId: sessionId, useSessions: useSessions, controller: controller, useSnapshot: useSnapshot, insertDraft: insertDraft, t: t }));
}
/**
 * Photo-pick chip on the composer tool row — visible in blank/hero sessions
 * where the session header (and its actions) are hidden.
 * @param props - input.left runtime + inject face.
 */
export function PhotoPickComposerAction(props) {
    const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
    if (controller === undefined || useSnapshot === undefined || insertDraft === undefined || t === undefined) {
        return null;
    }
    return (_jsx(PhotoPickWorkspaceReady, { placement: "composer", sessionId: sessionId, useSessions: useSessions, controller: controller, useSnapshot: useSnapshot, insertDraft: insertDraft, t: t }));
}
function PhotoPickWorkspaceReady(props) {
    const { placement, sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
    const agentPreset = useSessions(s => s.byId[sessionId]?.agentPreset);
    const cwd = useSessions(s => s.byId[sessionId]?.cwd);
    const enabled = agentPreset === PHOTO_PICK_AGENT_PRESET_ID;
    const state = useSnapshot(snapshot => snapshot);
    const [open, setOpen] = useState(false);
    const [images, setImages] = useState([]);
    const [imagesError, setImagesError] = useState(undefined);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [previewPath, setPreviewPath] = useState(undefined);
    const [copied, setCopied] = useState(false);
    const [foldOpen, setFoldOpen] = useState({
        actions: true,
        vision: true,
        prompt: false,
    });
    const [criteriaDraft, setCriteriaDraft] = useState(() => loadCriteriaDraft());
    const [criteriaHistory, setCriteriaHistory] = useState(() => loadCriteriaHistory());
    const [criteriaStepOpen, setCriteriaStepOpen] = useState(false);
    const [filesView, setFilesView] = useState('tree');
    const [browseDir, setBrowseDir] = useState('');
    const [filesSort, setFilesSort] = useState('name-asc');
    const [tagFilter, setTagFilter] = useState([]);
    const [configCollapsed, setConfigCollapsed] = useState(false);
    const [tagCollapsed, setTagCollapsed] = useState(false);
    const [mediaTagsAvailable, setMediaTagsAvailable] = useState(false);
    const toggleFold = (id) => {
        setFoldOpen(current => ({ ...current, [id]: !current[id] }));
    };
    useEffect(() => {
        setBrowseDir('');
        setTagFilter([]);
        setPreviewPath(undefined);
    }, [cwd]);
    useEffect(() => {
        if (!enabled) {
            setOpen(false);
            setPreviewPath(undefined);
            setCriteriaStepOpen(false);
            return;
        }
        if (open && state.status === 'idle')
            void controller.load();
    }, [enabled, open, controller, state.status]);
    const reloadImages = async (root) => {
        setImagesLoading(true);
        setImagesError(undefined);
        try {
            const loaded = await loadCandidatesWithSoftTags(root);
            setImages(loaded.images);
            setMediaTagsAvailable(loaded.mediaTagsAvailable);
        }
        catch (error) {
            setImages([]);
            setMediaTagsAvailable(false);
            setImagesError(error instanceof Error ? error.message : String(error));
        }
        finally {
            setImagesLoading(false);
        }
    };
    useEffect(() => {
        if (!enabled || !open || cwd === undefined || cwd.length === 0)
            return;
        let cancelled = false;
        void (async () => {
            setImagesLoading(true);
            setImagesError(undefined);
            try {
                const loaded = await loadCandidatesWithSoftTags(cwd);
                if (cancelled)
                    return;
                setImages(loaded.images);
                setMediaTagsAvailable(loaded.mediaTagsAvailable);
                setSelected(new Set());
                setTagFilter([]);
                setPreviewPath(undefined);
            }
            catch (error) {
                if (cancelled)
                    return;
                setImages([]);
                setMediaTagsAvailable(false);
                setImagesError(error instanceof Error ? error.message : String(error));
            }
            finally {
                if (!cancelled)
                    setImagesLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [enabled, open, cwd]);
    useEffect(() => {
        if (previewPath === undefined)
            return;
        if (images.some(image => image.relativePath === previewPath))
            return;
        setPreviewPath(undefined);
    }, [images, previewPath]);
    const selectedList = useMemo(() => [...selected].sort((a, b) => a.localeCompare(b)), [selected]);
    if (!enabled)
        return null;
    const canGoBack = filesView === 'tree' && browseDir.length > 0;
    const availableTags = collectTagOptions(images);
    const untaggedCount = images.reduce((count, image) => count + (image.tags.length === 0 ? 1 : 0), 0);
    const filteredImages = filterImagesByTags(images, tagFilter);
    const treeEntries = filesView === 'tree'
        ? entriesInDirectory(filteredImages, browseDir)
        : { folders: [], files: [...filteredImages] };
    const sortedFolders = sortFolderNames(treeEntries.folders, filesSort);
    const sortedFiles = sortImages(treeEntries.files, filesSort);
    const visibleCount = filesView === 'tree'
        ? sortedFolders.length + sortedFiles.length
        : sortedFiles.length;
    const visiblePaths = sortedFiles.map(image => image.relativePath);
    const goBack = () => {
        if (!canGoBack)
            return;
        const parts = browseDir.split('/').filter(Boolean);
        parts.pop();
        setBrowseDir(parts.join('/'));
    };
    const toggleTagFilter = (tag) => {
        setTagFilter((current) => {
            if (tag === UNTAGGED_FILTER) {
                return current.includes(UNTAGGED_FILTER) ? [] : [UNTAGGED_FILTER];
            }
            const withoutUntagged = current.filter(item => item !== UNTAGGED_FILTER);
            return withoutUntagged.includes(tag)
                ? withoutUntagged.filter(item => item !== tag)
                : [...withoutUntagged, tag];
        });
    };
    const togglePath = (relativePath) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(relativePath))
                next.delete(relativePath);
            else
                next.add(relativePath);
            return next;
        });
    };
    const selectVisible = () => {
        setSelected((current) => {
            const next = new Set(current);
            for (const path of visiblePaths)
                next.add(path);
            return next;
        });
    };
    const copySelected = async () => {
        if (selectedList.length === 0)
            return;
        try {
            await navigator.clipboard.writeText(selectedList.join('\n'));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        }
        catch {
            setCopied(false);
        }
    };
    const setCriteria = (next) => {
        setCriteriaDraft(next);
        saveCriteriaDraft(next);
    };
    const openCriteriaStep = () => {
        if (selectedList.length === 0)
            return;
        setCriteriaStepOpen(true);
    };
    const confirmIntoChat = () => {
        if (selectedList.length === 0)
            return;
        const body = buildConfirmDraft({
            lead: t('panel.confirmDraftLead'),
            leadWithCriteria: t('panel.confirmDraftLeadWithCriteria'),
            paths: selectedList,
            criteriaLead: t('panel.confirmDraftCriteriaLead'),
            criteria: criteriaDraft,
        });
        if (!insertDraft(sessionId, body))
            return;
        if (criteriaDraft.trim().length > 0) {
            setCriteriaHistory(rememberCriteria(criteriaDraft));
        }
        setCriteriaStepOpen(false);
        setOpen(false);
        setPreviewPath(undefined);
    };
    const closeDialog = () => {
        if (previewPath !== undefined) {
            setPreviewPath(undefined);
            return;
        }
        if (criteriaStepOpen) {
            setCriteriaStepOpen(false);
            return;
        }
        setOpen(false);
    };
    return (_jsxs("div", { className: css.root, "data-placement": placement, children: [_jsxs("button", { type: "button", className: placement === 'composer' ? css.triggerComposer : css.trigger, "data-active": open || undefined, "aria-label": t('panel.triggerAria'), "aria-expanded": open, title: t('panel.triggerHint'), onClick: () => { setOpen(value => !value); }, children: [_jsx(IconBrowseOutline16, { size: 14 }), _jsx("span", { children: t('panel.trigger') })] }), _jsx(Modal, { headless: true, open: open, onClose: closeDialog, title: t('panel.title'), className: css.dialog, children: _jsxs("div", { className: css.dialogShell, children: [_jsxs("header", { className: css.dialogHeader, children: [_jsx("div", { className: css.dialogHeaderStart, children: cwd === undefined ? null : (_jsxs("button", { type: "button", className: css.headToggle, "data-active": !configCollapsed || undefined, "data-filtered": state.dirty || undefined, title: configCollapsed ? t('panel.configExpand') : t('panel.configCollapse'), "aria-label": configCollapsed ? t('panel.configExpand') : t('panel.configCollapse'), "aria-expanded": !configCollapsed, onClick: () => { setConfigCollapsed(current => !current); }, children: [configCollapsed
                                                ? _jsx(IconChevronRightOutline14, { size: 14 })
                                                : _jsx(IconChevronLeftOutline14, { size: 14 }), _jsx("span", { children: t('panel.config') })] })) }), _jsx("h2", { className: css.dialogTitle, children: t('panel.title') }), _jsx("div", { className: css.dialogHeaderEnd, children: _jsx("button", { type: "button", className: css.dialogClose, "aria-label": t('panel.close'), onClick: closeDialog, children: _jsx(IconCloseOutline16, { size: 14 }) }) })] }), _jsx("div", { className: css.dialogBody, children: cwd === undefined || cwd.length === 0 ? (_jsx("p", { className: css.note, children: t('panel.noCwd') })) : (_jsxs("div", { className: css.body, children: [_jsxs("div", { className: css.layout, children: [!configCollapsed ? (_jsx("aside", { className: css.configCol, "aria-label": t('panel.config'), children: _jsxs("div", { className: css.configScroll, children: [_jsxs("section", { className: css.configSection, children: [_jsxs("button", { type: "button", className: css.configSectionHead, "aria-expanded": foldOpen.actions, onClick: () => { toggleFold('actions'); }, children: [_jsx("span", { className: css.foldChevron, "data-open": foldOpen.actions || undefined, "aria-hidden": true, children: _jsx(IconChevronDownOutline14, { size: 14 }) }), _jsx("span", { className: css.configSectionTitle, children: t('panel.foldActions') })] }), foldOpen.actions ? (_jsxs("div", { className: css.toolbar, children: [_jsx(Button, { variant: "primary", disabled: selectedList.length === 0, title: t('panel.nextHint'), onClick: openCriteriaStep, children: t('panel.next') }), _jsx(Button, { variant: "outline", disabled: visiblePaths.length === 0, onClick: selectVisible, children: t('panel.selectAll') }), _jsx(Button, { variant: "outline", disabled: selectedList.length === 0, onClick: () => { setSelected(new Set()); setCopied(false); }, children: t('panel.clearSelection') }), _jsx(Button, { variant: "ghost", disabled: selectedList.length === 0, onClick: () => { void copySelected(); }, children: copied ? t('panel.copied') : t('panel.copyPaths') }), _jsx(Button, { variant: "ghost", disabled: imagesLoading, onClick: () => { void reloadImages(cwd); }, children: t('panel.refresh') })] })) : null] }), _jsxs("section", { className: css.configSection, children: [_jsxs("button", { type: "button", className: css.configSectionHead, "aria-expanded": foldOpen.vision, onClick: () => { toggleFold('vision'); }, children: [_jsx("span", { className: css.foldChevron, "data-open": foldOpen.vision || undefined, "aria-hidden": true, children: _jsx(IconChevronDownOutline14, { size: 14 }) }), _jsx("span", { className: css.configSectionTitle, children: t('panel.foldVision') }), state.dirty && state.status === 'ready'
                                                                            && (state.draft.visionEnabled !== state.baseline.visionEnabled
                                                                                || state.draft.visionLlmProvider !== state.baseline.visionLlmProvider
                                                                                || state.draft.visionModel !== state.baseline.visionModel)
                                                                            ? _jsx("span", { className: css.foldBadge, children: t('panel.foldDirty') })
                                                                            : null] }), foldOpen.vision
                                                                    ? _jsx(VisionEditor, { state: state, controller: controller, t: t })
                                                                    : null] }), _jsxs("section", { className: css.configSection, children: [_jsxs("button", { type: "button", className: css.configSectionHead, "aria-expanded": foldOpen.prompt, onClick: () => { toggleFold('prompt'); }, children: [_jsx("span", { className: css.foldChevron, "data-open": foldOpen.prompt || undefined, "aria-hidden": true, children: _jsx(IconChevronDownOutline14, { size: 14 }) }), _jsx("span", { className: css.configSectionTitle, children: t('panel.foldPrompt') }), state.dirty && state.status === 'ready'
                                                                            && state.draft.visionScorePrompt !== state.baseline.visionScorePrompt
                                                                            ? _jsx("span", { className: css.foldBadge, children: t('panel.foldDirty') })
                                                                            : null] }), foldOpen.prompt
                                                                    ? _jsx(PromptEditor, { state: state, controller: controller, t: t })
                                                                    : null] })] }) })) : null, _jsxs("section", { className: css.filesCol, "aria-label": t('panel.files'), children: [_jsxs("div", { className: css.filesHead, children: [_jsxs("div", { className: css.filesHeadLeft, children: [_jsx("span", { className: css.promptTitle, children: t('panel.files') }), _jsx("span", { className: css.filesCount, children: tagFilter.length > 0
                                                                            ? `${filteredImages.length}/${images.length}`
                                                                            : images.length }), images.length > 0 ? (_jsxs("button", { type: "button", className: css.headToggle, "data-active": !tagCollapsed || undefined, "data-filtered": tagFilter.length > 0 || undefined, title: tagCollapsed ? t('panel.filesTagExpand') : t('panel.filesTagCollapse'), "aria-label": tagCollapsed ? t('panel.filesTagExpand') : t('panel.filesTagCollapse'), "aria-expanded": !tagCollapsed, onClick: () => { setTagCollapsed(current => !current); }, children: [_jsx("span", { children: t('panel.filesTagFilter') }), tagCollapsed
                                                                                ? _jsx(IconChevronRightOutline14, { size: 14 })
                                                                                : _jsx(IconChevronLeftOutline14, { size: 14 })] })) : null] }), _jsxs("div", { className: css.filesHeadRight, children: [_jsxs("label", { className: css.filesSort, children: [_jsx("span", { className: css.filesSortLabel, children: t('panel.filesSort') }), _jsxs("select", { className: css.filesSortSelect, value: filesSort, onChange: event => {
                                                                                    setFilesSort(event.target.value);
                                                                                }, children: [_jsx("option", { value: "name-asc", children: t('panel.filesSortNameAsc') }), _jsx("option", { value: "name-desc", children: t('panel.filesSortNameDesc') }), _jsx("option", { value: "mtime-desc", children: t('panel.filesSortMtimeDesc') }), _jsx("option", { value: "mtime-asc", children: t('panel.filesSortMtimeAsc') }), _jsx("option", { value: "size-desc", children: t('panel.filesSortSizeDesc') }), _jsx("option", { value: "size-asc", children: t('panel.filesSortSizeAsc') })] })] }), _jsxs("div", { className: css.filesViewToggle, role: "group", "aria-label": t('panel.files'), children: [_jsx("button", { type: "button", className: css.filesViewBtn, "data-active": filesView === 'tree' || undefined, onClick: () => { setFilesView('tree'); }, children: t('panel.filesViewTree') }), _jsx("button", { type: "button", className: css.filesViewBtn, "data-active": filesView === 'flat' || undefined, onClick: () => { setFilesView('flat'); }, children: t('panel.filesViewFlat') })] })] })] }), _jsxs("div", { className: css.filesBody, children: [images.length > 0 && !tagCollapsed ? (_jsxs("aside", { className: css.tagSidebar, "aria-label": t('panel.filesTagFilter'), children: [!mediaTagsAvailable ? (_jsx("p", { className: css.note, children: t('panel.filesTagUnavailable') })) : null, _jsxs("div", { className: css.tagSidebarChips, children: [_jsxs("button", { type: "button", className: css.tagFilterChip, "data-active": tagFilter.length === 0 || undefined, onClick: () => { setTagFilter([]); }, children: [_jsx("span", { className: css.tagFilterChipName, children: t('panel.filesTagFilterAll') }), _jsx("span", { className: css.tagFilterChipCount, children: images.length })] }), _jsxs("button", { type: "button", className: css.tagFilterChip, "data-active": tagFilter.includes(UNTAGGED_FILTER) || undefined, onClick: () => { toggleTagFilter(UNTAGGED_FILTER); }, children: [_jsx("span", { className: css.tagFilterChipName, children: t('panel.filesTagFilterNone') }), _jsx("span", { className: css.tagFilterChipCount, children: untaggedCount })] }), availableTags.map(tag => (_jsxs("button", { type: "button", className: css.tagFilterChip, "data-active": tagFilter.includes(tag.name) || undefined, title: tag.name, onClick: () => { toggleTagFilter(tag.name); }, children: [_jsx("span", { className: css.tagFilterChipName, children: tag.name }), _jsx("span", { className: css.tagFilterChipCount, children: tag.count })] }, tag.name)))] })] })) : null, _jsxs("div", { className: css.filesMain, children: [filesView === 'tree' ? (_jsxs("div", { className: css.filesPathBar, children: [canGoBack ? (_jsxs("button", { type: "button", className: css.filesBackBtn, title: t('panel.filesBack'), "aria-label": t('panel.filesBack'), onClick: goBack, children: [_jsx(IconChevronLeftOutline14, { size: 14 }), _jsx("span", { children: t('panel.filesBack') })] })) : null, _jsx(Breadcrumb, { dir: browseDir, rootLabel: t('panel.filesRoot'), onNavigate: setBrowseDir })] })) : null, imagesLoading ? _jsx("p", { className: css.note, children: t('panel.loading') }) : null, imagesError !== undefined ? _jsx("p", { className: css.error, children: imagesError }) : null, !imagesLoading && imagesError === undefined && images.length === 0 ? (_jsx("p", { className: css.note, children: t('panel.empty') })) : null, !imagesLoading
                                                                        && images.length > 0
                                                                        && filteredImages.length === 0 ? (_jsx("p", { className: css.note, children: t('panel.filesTagFilterEmpty') })) : null, !imagesLoading
                                                                        && filteredImages.length > 0
                                                                        && visibleCount === 0
                                                                        && filesView === 'tree' ? (_jsx("p", { className: css.note, children: t('panel.emptyFolder') })) : null, visibleCount > 0 ? (_jsxs("ul", { className: css.grid, children: [filesView === 'tree'
                                                                                ? sortedFolders.map(name => (_jsx("li", { className: css.folderItem, children: _jsxs("button", { type: "button", className: css.folderCard, "aria-label": `${t('panel.folderOpen')}: ${name}`, onClick: () => {
                                                                                            setBrowseDir(browseDir.length === 0 ? name : `${browseDir}/${name}`);
                                                                                        }, children: [_jsx("span", { className: css.folderIcon, "aria-hidden": true }), _jsx("span", { className: css.folderName, children: name })] }) }, `dir:${browseDir}/${name}`)))
                                                                                : null, sortedFiles.map(image => (_jsx(CandidateCard, { root: cwd, image: image, checked: selected.has(image.relativePath), onToggle: () => { togglePath(image.relativePath); }, onPreview: () => { setPreviewPath(image.relativePath); }, t: t }, image.relativePath)))] })) : null] })] })] })] }), _jsx("footer", { className: css.jobFooter, "aria-label": t('panel.foldJob'), children: selectedList.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: css.jobFooterEmpty, children: [t('panel.selectedCount').replace('{n}', String(selectedList.length)), ' · ', t('panel.nextHint')] }), _jsx(Button, { variant: "primary", size: "sm", onClick: openCriteriaStep, children: t('panel.next') })] })) : (_jsx("span", { className: css.jobFooterEmpty, children: t('panel.foldJobEmpty') })) }), previewPath !== undefined ? (_jsx(Lightbox, { root: cwd, relativePath: previewPath, image: images.find(row => row.relativePath === previewPath), onClose: () => { setPreviewPath(undefined); }, t: t })) : null, _jsx(Modal, { headless: true, open: criteriaStepOpen, onClose: () => { setCriteriaStepOpen(false); }, title: t('panel.criteriaStepTitle'), className: css.criteriaStepDialog, children: _jsxs("div", { className: css.criteriaStepShell, children: [_jsxs("header", { className: css.criteriaStepHeader, children: [_jsx("div", { className: css.criteriaStepHeaderStart, children: _jsx("span", { className: css.criteriaStepStep, children: t('panel.criteriaStepBadge').replace('{n}', String(selectedList.length)) }) }), _jsx("h2", { className: css.criteriaStepTitle, children: t('panel.criteriaStepTitle') }), _jsx("div", { className: css.criteriaStepHeaderEnd, children: _jsx("button", { type: "button", className: css.dialogClose, "aria-label": t('panel.close'), onClick: () => { setCriteriaStepOpen(false); }, children: _jsx(IconCloseOutline16, { size: 14 }) }) })] }), _jsxs("div", { className: css.criteriaStepBody, children: [_jsx("p", { className: css.note, children: t('panel.criteriaStepHint') }), _jsx(CriteriaEditor, { draft: criteriaDraft, history: criteriaHistory, onChange: setCriteria, t: t })] }), _jsxs("footer", { className: css.criteriaStepFooter, children: [_jsx(Button, { variant: "ghost", onClick: () => { setCriteriaStepOpen(false); }, children: t('panel.criteriaStepBack') }), _jsx(Button, { variant: "primary", title: t('panel.confirmHint'), onClick: confirmIntoChat, children: t('panel.confirm') })] })] }) })] })) })] }) })] }));
}
function CriteriaEditor(props) {
    const { draft, history, onChange, t } = props;
    return (_jsxs("div", { className: css.sectionBody, "aria-label": t('panel.criteriaSection'), children: [_jsx("p", { className: css.note, children: t('panel.criteriaHint') }), _jsx("div", { className: css.criteriaPresets, role: "group", "aria-label": t('panel.criteriaPresets'), children: CRITERIA_PRESET_IDS.map(id => {
                    const clause = t(criteriaTextKey(id));
                    const active = criteriaHasClause(draft, clause);
                    return (_jsx("button", { type: "button", className: css.criteriaChip, "data-active": active || undefined, title: clause, "aria-pressed": active, onClick: () => { onChange(toggleCriteriaClause(draft, clause)); }, children: t(criteriaChipKey(id)) }, id));
                }) }), _jsxs("label", { className: css.promptField, children: [_jsx("span", { className: css.detailLabel, children: t('panel.criteriaSection') }), _jsx("textarea", { className: css.promptInput, rows: 4, value: draft, placeholder: t('panel.criteriaPlaceholder'), onChange: (event) => { onChange(event.target.value); } })] }), _jsx("div", { className: css.promptActions, children: _jsx(Button, { variant: "ghost", size: "sm", disabled: draft.length === 0, onClick: () => { onChange(''); }, children: t('panel.criteriaClear') }) }), _jsxs("div", { className: css.criteriaHistory, "aria-label": t('panel.criteriaHistory'), children: [_jsx("span", { className: css.detailLabel, children: t('panel.criteriaHistory') }), history.length === 0 ? (_jsx("p", { className: css.note, children: t('panel.criteriaHistoryEmpty') })) : (_jsx("ul", { className: css.criteriaHistoryList, children: history.map(item => (_jsx("li", { className: css.criteriaHistoryItem, children: _jsxs("button", { type: "button", className: css.criteriaHistoryBtn, title: item, onClick: () => { onChange(item); }, children: [_jsx("span", { className: css.criteriaHistoryText, children: item }), _jsx("span", { className: css.criteriaHistoryApply, children: t('panel.criteriaHistoryApply') })] }) }, item))) }))] })] }));
}
function criteriaChipKey(id) {
    return `panel.criteriaChip.${id}`;
}
function criteriaTextKey(id) {
    return `panel.criteriaText.${id}`;
}
function VisionEditor(props) {
    const { state, controller, t } = props;
    if (state.status === 'loading' || state.status === 'idle') {
        return _jsx("p", { className: css.note, children: t('panel.loading') });
    }
    if (state.status === 'error') {
        return (_jsxs("div", { className: css.sectionBody, children: [_jsx("p", { className: css.error, children: t('loadError') }), state.error !== undefined ? _jsx("p", { className: css.note, children: state.error }) : null, _jsx(Button, { variant: "outline", onClick: () => { void controller.load(); }, children: t('retry') })] }));
    }
    const disabled = !state.writable || state.saving;
    const selected = state.draft.visionLlmProvider.length > 0 && state.draft.visionModel.length > 0
        ? encodeModelKey(state.draft.visionLlmProvider, state.draft.visionModel)
        : '';
    const selectedMeta = state.models.find(model => (model.provider === state.draft.visionLlmProvider && model.id === state.draft.visionModel));
    const groups = groupModels(state.models);
    return (_jsxs("div", { className: css.sectionBody, "aria-label": t('panel.visionSection'), children: [_jsxs("label", { className: css.toggleRow, children: [_jsx("input", { type: "checkbox", checked: state.draft.visionEnabled, disabled: disabled, onChange: (event) => { controller.edit('visionEnabled', event.target.checked); } }), _jsxs("span", { children: [_jsx("span", { className: css.detailLabel, children: t('visionEnabled') }), _jsx("span", { className: css.note, children: t('visionEnabledHint') })] })] }), _jsxs("label", { className: css.promptField, children: [_jsx("span", { className: css.detailLabel, children: t('model') }), _jsxs("select", { className: css.filesSortSelect, value: selected, disabled: disabled || state.models.length === 0, onChange: (event) => { controller.selectModel(event.target.value); }, children: [_jsx("option", { value: "", children: t('modelPlaceholder') }), groups.map(group => (_jsx("optgroup", { label: group.label, children: group.models.map(model => (_jsx("option", { value: encodeModelKey(model.provider, model.id), children: formatModelLabel(model, t) }, encodeModelKey(model.provider, model.id)))) }, group.provider)))] })] }), _jsx("p", { className: css.note, children: t('modelHint') }), state.models.length === 0 ? _jsx("p", { className: css.note, children: t('noModels') }) : null, selectedMeta?.supportsVision === false ? _jsx("p", { className: css.note, children: t('textOnlyWarning') }) : null, !state.writable ? _jsx("p", { className: css.note, children: t('readonly') }) : null, state.error !== undefined ? _jsx("p", { className: css.error, children: state.error || t('saveError') }) : null, state.notice === 'saved' ? _jsx("p", { className: css.notice, children: t('saved') }) : null, _jsxs("div", { className: css.promptActions, children: [_jsx(Button, { variant: "primary", size: "sm", disabled: disabled || !state.dirty, onClick: () => { void controller.save(); }, children: t('save') }), _jsx(Button, { variant: "ghost", size: "sm", disabled: disabled || !state.dirty, onClick: () => { controller.discard(); }, children: t('discard') })] })] }));
}
function PromptEditor(props) {
    const { state, controller, t } = props;
    if (state.status !== 'ready') {
        return _jsx("p", { className: css.note, children: t('panel.loading') });
    }
    const disabled = !state.writable || state.saving;
    return (_jsxs("div", { className: css.sectionBody, "aria-label": t('panel.promptSection'), children: [_jsxs("label", { className: css.promptField, children: [_jsx("span", { className: css.detailLabel, children: t('panel.promptDefault') }), _jsx("pre", { className: css.defaultPrompt, children: state.defaultVisionScorePrompt || '—' })] }), _jsxs("label", { className: css.promptField, children: [_jsx("span", { className: css.detailLabel, children: t('panel.promptCustom') }), _jsx("textarea", { className: css.promptInput, rows: 8, value: state.draft.visionScorePrompt, disabled: disabled, placeholder: t('panel.promptCustomHint'), onChange: (event) => { controller.edit('visionScorePrompt', event.target.value); } })] }), _jsxs("label", { className: css.promptField, children: [_jsx("span", { className: css.detailLabel, children: t('panel.promptSuffix') }), _jsx("pre", { className: css.defaultPrompt, children: state.visionScoreJsonSuffix || '—' })] }), _jsx("p", { className: css.note, children: t('panel.promptCustomHint') }), state.notice === 'saved' ? _jsx("p", { className: css.notice, children: t('panel.promptSaved') }) : null, _jsxs("div", { className: css.promptActions, children: [_jsx(Button, { variant: "primary", size: "sm", disabled: !state.dirty || disabled, onClick: () => { void controller.save(); }, children: t('panel.promptSave') }), _jsx(Button, { variant: "ghost", size: "sm", disabled: state.draft.visionScorePrompt.length === 0 || disabled, onClick: () => { controller.resetPrompt(); }, children: t('panel.promptReset') })] })] }));
}
function CandidateCard(props) {
    const { root, image, checked, onToggle, onPreview, t } = props;
    const [thumbFailed, setThumbFailed] = useState(false);
    const fileName = image.relativePath.split(/[/\\]/).pop() || image.relativePath;
    return (_jsxs("li", { className: checked ? `${css.card} ${css.cardActive}` : css.card, "data-active": checked || undefined, children: [_jsx("button", { type: "button", className: css.thumbButton, "aria-label": t('panel.previewOpen'), disabled: thumbFailed, onClick: onPreview, children: !thumbFailed ? (_jsx("img", { className: css.thumb, src: photoPickFileUrl(root, image.relativePath), alt: "", loading: "lazy", onError: () => { setThumbFailed(true); } })) : (_jsx("span", { className: css.thumbFallback, children: t('panel.previewFailed') })) }), _jsx("div", { className: css.cardBody, children: _jsxs("button", { type: "button", className: css.cardFoot, onClick: onToggle, "aria-pressed": checked, "aria-label": t('panel.selectAria').replace('{name}', fileName), title: image.relativePath, children: [_jsx("span", { className: css.cardCheck, "aria-hidden": true, children: _jsx("input", { type: "checkbox", checked: checked, readOnly: true, tabIndex: -1 }) }), _jsx("span", { className: css.cardTitle, children: _jsx("span", { className: css.cardPath, children: fileName }) })] }) })] }));
}
function Lightbox(props) {
    const { root, relativePath, image, onClose, t } = props;
    /** Detail side panel — same affordance as media-library preview. */
    const [logOpen, setLogOpen] = useState(true);
    const viewportRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState(false);
    const [natural, setNatural] = useState(undefined);
    const [viewport, setViewport] = useState(undefined);
    const dragRef = useRef(null);
    useEffect(() => {
        setZoom(1);
        setNatural(undefined);
        setDragging(false);
        setLogOpen(true);
        dragRef.current = null;
    }, [relativePath]);
    useEffect(() => {
        const el = viewportRef.current;
        if (el === null)
            return;
        const sync = () => {
            setViewport({ width: el.clientWidth, height: el.clientHeight });
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(el);
        const onWheelNative = (event) => {
            event.preventDefault();
            const direction = event.deltaY < 0 ? 1 : -1;
            setZoom(current => Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round((current + direction * PREVIEW_ZOOM_STEP) * 100) / 100)));
        };
        el.addEventListener('wheel', onWheelNative, { passive: false });
        return () => {
            observer.disconnect();
            el.removeEventListener('wheel', onWheelNative);
        };
    }, [logOpen]);
    const fitScale = natural !== undefined && viewport !== undefined && natural.width > 0 && natural.height > 0
        ? Math.min(viewport.width / natural.width, viewport.height / natural.height, 1)
        : 1;
    const displayWidth = natural !== undefined ? Math.max(1, natural.width * fitScale * zoom) : undefined;
    const displayHeight = natural !== undefined ? Math.max(1, natural.height * fitScale * zoom) : undefined;
    const setClampedZoom = (next) => {
        setZoom(Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round(next * 100) / 100)));
    };
    const onPointerDown = (event) => {
        if (event.button !== 0)
            return;
        const el = viewportRef.current;
        if (el === null)
            return;
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: el.scrollLeft,
            scrollTop: el.scrollTop,
        };
        setDragging(true);
        el.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event) => {
        const drag = dragRef.current;
        const el = viewportRef.current;
        if (drag === null || el === null || drag.pointerId !== event.pointerId)
            return;
        el.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
        el.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
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
    return createPortal((_jsxs("div", { className: css.lightbox, role: "dialog", "aria-modal": "true", "aria-label": t('panel.preview'), children: [_jsx("button", { type: "button", className: css.lightboxMask, "aria-label": t('panel.previewClose'), onClick: onClose }), _jsxs("div", { className: css.lightboxCard, "data-log-open": logOpen || undefined, children: [_jsxs("div", { className: css.lightboxHead, children: [_jsx("span", { className: css.cardPath, title: relativePath, children: relativePath }), _jsxs("div", { className: css.lightboxZoom, children: [_jsx(Button, { variant: "outline", size: "sm", disabled: zoom <= PREVIEW_ZOOM_MIN, title: t('panel.previewZoomOut'), "aria-label": t('panel.previewZoomOut'), onClick: () => { setClampedZoom(zoom - PREVIEW_ZOOM_STEP); }, children: "\u2212" }), _jsxs("span", { className: css.lightboxZoomValue, children: [Math.round(zoom * 100), "%"] }), _jsx(Button, { variant: "outline", size: "sm", disabled: zoom >= PREVIEW_ZOOM_MAX, title: t('panel.previewZoomIn'), "aria-label": t('panel.previewZoomIn'), onClick: () => { setClampedZoom(zoom + PREVIEW_ZOOM_STEP); }, children: _jsx(IconPlusOutline16, { size: 12 }) }), _jsx(Button, { variant: "ghost", size: "sm", disabled: zoom === 1, title: t('panel.previewZoomReset'), onClick: () => { setZoom(1); }, children: t('panel.previewZoomReset') }), _jsx("button", { type: "button", className: css.lightboxTab, "data-active": logOpen || undefined, title: logOpen ? t('panel.tabDetailHide') : t('panel.tabDetailShow'), "aria-pressed": logOpen, onClick: () => { setLogOpen(open => !open); }, children: t('panel.tabDetail') }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onClose, children: t('panel.previewClose') })] })] }), _jsxs("div", { className: css.lightboxSplit, "data-log-open": logOpen || undefined, children: [_jsxs("section", { className: css.lightboxPreviewPane, children: [_jsx("p", { className: css.lightboxHint, children: t('panel.previewZoomHint') }), _jsx("div", { ref: viewportRef, className: css.lightboxViewport, "data-dragging": dragging || undefined, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, children: _jsx("img", { className: css.lightboxImage, src: photoPickFileUrl(root, relativePath), alt: relativePath, style: displayWidth !== undefined && displayHeight !== undefined
                                                ? { width: displayWidth, height: displayHeight }
                                                : undefined, onLoad: (event) => {
                                                setNatural({
                                                    width: event.currentTarget.naturalWidth,
                                                    height: event.currentTarget.naturalHeight,
                                                });
                                            }, draggable: false }) })] }), logOpen ? (_jsx("section", { className: css.lightboxLogPane, "aria-label": t('panel.tabDetail'), children: _jsxs("div", { className: css.lightboxLog, children: [_jsx(LogField, { label: t('panel.path'), value: relativePath }), image !== undefined ? (_jsx(LogField, { label: t('panel.fileSize'), value: formatFileSize(image.size) })) : null, natural !== undefined ? (_jsx(LogField, { label: t('panel.imageSize'), value: `${natural.width} × ${natural.height}` })) : null, image !== undefined ? (_jsx(LogField, { label: t('panel.mtime'), value: formatMtime(image.mtimeMs) })) : null, image?.category !== undefined && image.category.length > 0 ? (_jsx(LogField, { label: t('panel.category'), value: image.category })) : null, image?.tagStatus !== undefined ? (_jsx(LogField, { label: t('panel.tagStatus'), value: tagStatusLabel(image.tagStatus, t), valueClass: tagStatusClass(image.tagStatus) })) : null, _jsxs("div", { className: css.logBlock, children: [_jsx("div", { className: css.detailLabel, children: t('panel.description') }), _jsx("div", { children: image?.description !== undefined && image.description.length > 0
                                                        ? image.description
                                                        : '—' })] }), _jsxs("div", { className: css.logBlock, children: [_jsx("div", { className: css.detailLabel, children: t('panel.tags') }), image !== undefined && image.tags.length > 0 ? (_jsx("div", { className: css.tags, children: image.tags.map(tag => _jsx("span", { className: css.tag, children: tag }, tag)) })) : (_jsx("div", { className: css.note, children: t('panel.noTags') }))] })] }) })) : null] })] })] })), document.body);
}
function LogField(props) {
    return (_jsxs("div", { className: css.logField, children: [_jsx("span", { className: css.detailLabel, children: props.label }), _jsx("span", { className: props.valueClass, children: props.value })] }));
}
/** Human-readable file size for detail panels. */
function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0)
        return '—';
    if (bytes < 1024)
        return `${Math.round(bytes)} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(digits)} ${units[unit]}`;
}
function formatMtime(mtimeMs) {
    if (!Number.isFinite(mtimeMs) || mtimeMs <= 0)
        return '—';
    return new Date(mtimeMs).toLocaleString();
}
function tagStatusLabel(status, t) {
    if (status === 'ok')
        return t('panel.tagOk');
    if (status === 'failed')
        return t('panel.tagFailed');
    if (status === 'skipped')
        return t('panel.tagSkipped');
    return t('panel.tagPending');
}
function tagStatusClass(status) {
    if (status === 'ok')
        return css.statusOk;
    if (status === 'failed')
        return css.statusFailed;
    if (status === 'skipped')
        return css.statusSkipped;
    return undefined;
}
function photoPickFileUrl(root, relativePath) {
    return `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(relativePath)}`;
}
/**
 * Load photo-pick candidates, then soft-merge media-library fields when available.
 * @param root - workspace root path.
 */
async function loadCandidatesWithSoftTags(root) {
    const url = `${CANDIDATES_PATH}?root=${encodeURIComponent(root)}`;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    const base = (body.images ?? []).map(image => ({
        relativePath: image.relativePath,
        size: image.size,
        mtimeMs: image.mtimeMs,
        tags: [],
    }));
    try {
        const mediaUrl = `${MEDIA_ASSETS_PATH}?root=${encodeURIComponent(root)}`;
        const mediaResponse = await fetch(mediaUrl, { credentials: 'same-origin' });
        if (!mediaResponse.ok) {
            return { images: base, mediaTagsAvailable: false };
        }
        const mediaBody = await mediaResponse.json();
        const mediaByPath = new Map();
        for (const asset of mediaBody.assets ?? []) {
            mediaByPath.set(asset.relativePath, {
                tags: asset.tags ?? [],
                ...typeof asset.description === 'string' && asset.description.length > 0
                    ? { description: asset.description }
                    : {},
                ...typeof asset.category === 'string' && asset.category.length > 0
                    ? { category: asset.category }
                    : {},
                ...asset.tagStatus !== undefined ? { tagStatus: asset.tagStatus } : {},
            });
        }
        return {
            images: base.map(image => {
                const media = mediaByPath.get(image.relativePath);
                if (media === undefined)
                    return image;
                return {
                    ...image,
                    tags: media.tags,
                    ...media.description !== undefined ? { description: media.description } : {},
                    ...media.category !== undefined ? { category: media.category } : {},
                    ...media.tagStatus !== undefined ? { tagStatus: media.tagStatus } : {},
                };
            }),
            mediaTagsAvailable: true,
        };
    }
    catch {
        // Media plugin absent or unreachable — keep empty tags.
        return { images: base, mediaTagsAvailable: false };
    }
}
function collectTagOptions(images) {
    const counts = new Map();
    for (const image of images) {
        for (const tag of image.tags) {
            const trimmed = tag.trim();
            if (trimmed.length === 0)
                continue;
            counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
        .map(([name, count]) => ({ name, count }));
}
function filterImagesByTags(images, selected) {
    if (selected.length === 0)
        return [...images];
    const wantUntagged = selected.includes(UNTAGGED_FILTER);
    const tags = selected.filter(tag => tag !== UNTAGGED_FILTER);
    return images.filter(image => {
        const untagged = image.tags.length === 0;
        if (wantUntagged && tags.length === 0)
            return untagged;
        if (wantUntagged && untagged)
            return true;
        if (tags.length === 0)
            return false;
        const lower = new Set(image.tags.map(tag => tag.trim().toLowerCase()));
        return tags.every(tag => lower.has(tag.toLowerCase()));
    });
}
function Breadcrumb(props) {
    const { dir, rootLabel, onNavigate } = props;
    const parts = dir.length === 0 ? [] : dir.split('/').filter(Boolean);
    return (_jsxs("nav", { className: css.breadcrumb, "aria-label": rootLabel, children: [_jsx("button", { type: "button", className: css.breadcrumbCrumb, disabled: parts.length === 0, onClick: () => { onNavigate(''); }, children: rootLabel }), parts.map((part, index) => {
                const target = parts.slice(0, index + 1).join('/');
                const last = index === parts.length - 1;
                return (_jsxs("span", { className: css.breadcrumbItem, children: [_jsx("span", { className: css.breadcrumbSep, "aria-hidden": true, children: "/" }), _jsx("button", { type: "button", className: css.breadcrumbCrumb, disabled: last, onClick: () => { onNavigate(target); }, children: part })] }, target));
            })] }));
}
function entriesInDirectory(images, dir) {
    const prefix = dir.length === 0 ? '' : `${dir}/`;
    const folders = new Set();
    const files = [];
    for (const image of images) {
        if (!image.relativePath.startsWith(prefix))
            continue;
        const rest = image.relativePath.slice(prefix.length);
        const slash = rest.indexOf('/');
        if (slash >= 0) {
            const name = rest.slice(0, slash);
            if (name.length > 0)
                folders.add(name);
            continue;
        }
        if (rest.length > 0)
            files.push(image);
    }
    return { folders: [...folders], files };
}
function sortFolderNames(names, sort) {
    const out = [...names];
    out.sort((a, b) => a.localeCompare(b));
    if (sort === 'name-desc')
        out.reverse();
    return out;
}
function sortImages(images, sort) {
    const out = [...images];
    switch (sort) {
        case 'name-asc':
            out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
            break;
        case 'name-desc':
            out.sort((a, b) => b.relativePath.localeCompare(a.relativePath));
            break;
        case 'mtime-desc':
            out.sort((a, b) => b.mtimeMs - a.mtimeMs);
            break;
        case 'mtime-asc':
            out.sort((a, b) => a.mtimeMs - b.mtimeMs);
            break;
        case 'size-desc':
            out.sort((a, b) => b.size - a.size);
            break;
        case 'size-asc':
            out.sort((a, b) => a.size - b.size);
            break;
        default:
            break;
    }
    return out;
}
function groupModels(models) {
    const order = [];
    const map = new Map();
    for (const model of models) {
        let group = map.get(model.provider);
        if (group === undefined) {
            group = {
                provider: model.provider,
                label: model.providerName || model.provider,
                models: [],
            };
            map.set(model.provider, group);
            order.push(model.provider);
        }
        group.models.push(model);
    }
    return order.map(id => map.get(id));
}
function formatModelLabel(model, t) {
    if (model.supportsVision === true)
        return `${model.name} · ${t('visionCapable')}`;
    if (model.supportsVision === false)
        return `${model.name} · ${t('textOnly')}`;
    return model.name;
}
//# sourceMappingURL=PhotoPickConfigPanel.js.map