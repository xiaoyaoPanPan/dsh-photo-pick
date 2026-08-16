/**
 * Session-header photo-pick workspace.
 * Dialog shell / config folds / tiled browse mirror media-ui Image & video scan;
 * actions select paths for photo_pick_best instead of tagging jobs.
 * @module dsh-photo-pick-ui/client/PhotoPickConfigPanel
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  IconBrowseOutline16,
  IconChevronDownOutline14,
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconPlusOutline16,
  Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PhotoPickUiKey } from './locales.ts'
import {
  encodeModelKey,
  type PhotoPickSettingsState,
  type PhotoPickSettingsStore,
  type PhotoPickVisionModelOption,
} from './store.ts'
import { PHOTO_PICK_AGENT_PRESET_ID } from './preset.ts'
import {
  buildConfirmDraft,
  CRITERIA_PRESET_IDS,
  criteriaHasClause,
  toggleCriteriaClause,
  type CriteriaPresetId,
} from './criteria-presets.ts'
import {
  loadCriteriaDraft,
  loadCriteriaHistory,
  rememberCriteria,
  saveCriteriaDraft,
} from './criteria-history.ts'
import css from './PhotoPickConfigPanel.module.css'

const CANDIDATES_PATH = '/api/photo-pick/candidates'
/** Soft optional media index; absent when the media plugin is not installed. */
const MEDIA_ASSETS_PATH = '/api/media-library/assets'
/** Sentinel tag-filter value for images with no tags. */
const UNTAGGED_FILTER = '__untagged__'
const PREVIEW_ZOOM_MIN = 0.25
const PREVIEW_ZOOM_MAX = 5
const PREVIEW_ZOOM_STEP = 0.25

/** Injected dependencies of the photo-pick workspace chips. */
export interface PhotoPickConfigPanelInjected {
  /** Settings store (shared with the settings page). */
  controller: PhotoPickSettingsStore
  /** Bound snapshot selector. */
  useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>
  /**
   * Write text into this session's composer draft (does not submit).
   * @param sessionId - active session.
   * @param text - draft body.
   * @returns false when the session input shell is unavailable.
   */
  insertDraft: (sessionId: SessionId, text: string) => boolean
}

/** Full panel props from the session header-actions slot. */
export type PhotoPickConfigPanelProps =
  PropsRuntime<'conversation.session.header.actions'>
  & Partial<PhotoPickConfigPanelInjected>
  & PropsLocale<'settings.photo-pick'>

/** Composer tool-row chip props (`conversation.input.left`). */
export type PhotoPickComposerActionProps =
  PropsRuntime<'conversation.input.left'>
  & Partial<PhotoPickConfigPanelInjected>
  & PropsLocale<'settings.photo-pick'>

/** Where the workspace trigger chip is mounted. */
type PhotoPickWorkspacePlacement = 'header' | 'composer'

interface CandidateImage {
  readonly relativePath: string
  readonly size: number
  readonly mtimeMs: number
  readonly tags: readonly string[]
  /** Soft-merged from media-library when that plugin is installed. */
  readonly description?: string
  /** Soft-merged from media-library when that plugin is installed. */
  readonly category?: string
  /** Soft-merged media tagging status when available. */
  readonly tagStatus?: 'pending' | 'ok' | 'skipped' | 'failed'
}

type ConfigFoldId = 'actions' | 'vision' | 'prompt'
type FilesSortKey =
  | 'name-asc'
  | 'name-desc'
  | 'mtime-desc'
  | 'mtime-asc'
  | 'size-desc'
  | 'size-asc'

/**
 * Render the photo-pick header chip and workspace dialog.
 * Hidden on blank sessions with the session header; use
 * {@link PhotoPickComposerAction} for the always-visible composer entry.
 * @param props - slot runtime + inject face.
 */
export function PhotoPickConfigPanel(props: PhotoPickConfigPanelProps) {
  const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props
  if (controller === undefined || useSnapshot === undefined || insertDraft === undefined || t === undefined) {
    return null
  }
  return (
    <PhotoPickWorkspaceReady
      placement="header"
      sessionId={sessionId}
      useSessions={useSessions}
      controller={controller}
      useSnapshot={useSnapshot}
      insertDraft={insertDraft}
      t={t}
    />
  )
}

/**
 * Photo-pick chip on the composer tool row — visible in blank/hero sessions
 * where the session header (and its actions) are hidden.
 * @param props - input.left runtime + inject face.
 */
export function PhotoPickComposerAction(props: PhotoPickComposerActionProps) {
  const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props
  if (controller === undefined || useSnapshot === undefined || insertDraft === undefined || t === undefined) {
    return null
  }
  return (
    <PhotoPickWorkspaceReady
      placement="composer"
      sessionId={sessionId}
      useSessions={useSessions}
      controller={controller}
      useSnapshot={useSnapshot}
      insertDraft={insertDraft}
      t={t}
    />
  )
}

function PhotoPickWorkspaceReady(props: {
  placement: PhotoPickWorkspacePlacement
  sessionId: SessionId
  useSessions: PhotoPickConfigPanelProps['useSessions']
  controller: PhotoPickSettingsStore
  useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>
  insertDraft: PhotoPickConfigPanelInjected['insertDraft']
  t: (key: PhotoPickUiKey) => string
}) {
  const { placement, sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props
  const agentPreset = useSessions(s => s.byId[sessionId]?.agentPreset)
  const cwd = useSessions(s => s.byId[sessionId]?.cwd)
  const enabled = agentPreset === PHOTO_PICK_AGENT_PRESET_ID
  const state = useSnapshot(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<readonly CandidateImage[]>([])
  const [imagesError, setImagesError] = useState<string | undefined>(undefined)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [previewPath, setPreviewPath] = useState<string | undefined>(undefined)
  const [copied, setCopied] = useState(false)
  const [foldOpen, setFoldOpen] = useState<Record<ConfigFoldId, boolean>>({
    actions: true,
    vision: true,
    prompt: false,
  })
  const [criteriaDraft, setCriteriaDraft] = useState(() => loadCriteriaDraft())
  const [criteriaHistory, setCriteriaHistory] = useState(() => loadCriteriaHistory())
  const [criteriaStepOpen, setCriteriaStepOpen] = useState(false)
  const [filesView, setFilesView] = useState<'tree' | 'flat'>('tree')
  const [browseDir, setBrowseDir] = useState('')
  const [filesSort, setFilesSort] = useState<FilesSortKey>('name-asc')
  const [tagFilter, setTagFilter] = useState<readonly string[]>([])
  const [configCollapsed, setConfigCollapsed] = useState(true)
  const [tagCollapsed, setTagCollapsed] = useState(true)
  const [mediaTagsAvailable, setMediaTagsAvailable] = useState(false)

  const toggleFold = (id: ConfigFoldId) => {
    setFoldOpen(current => ({ ...current, [id]: !current[id] }))
  }

  useEffect(() => {
    setBrowseDir('')
    setTagFilter([])
    setPreviewPath(undefined)
  }, [cwd])

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      setPreviewPath(undefined)
      setCriteriaStepOpen(false)
      return
    }
    if (open && state.status === 'idle') void controller.load()
  }, [enabled, open, controller, state.status])

  const reloadImages = async (root: string) => {
    setImagesLoading(true)
    setImagesError(undefined)
    try {
      const loaded = await loadCandidatesWithSoftTags(root)
      setImages(loaded.images)
      setMediaTagsAvailable(loaded.mediaTagsAvailable)
    } catch (error: unknown) {
      setImages([])
      setMediaTagsAvailable(false)
      setImagesError(error instanceof Error ? error.message : String(error))
    } finally {
      setImagesLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled || !open || cwd === undefined || cwd.length === 0) return
    let cancelled = false
    void (async () => {
      setImagesLoading(true)
      setImagesError(undefined)
      try {
        const loaded = await loadCandidatesWithSoftTags(cwd)
        if (cancelled) return
        setImages(loaded.images)
        setMediaTagsAvailable(loaded.mediaTagsAvailable)
        setSelected(new Set())
        setTagFilter([])
        setPreviewPath(undefined)
      } catch (error: unknown) {
        if (cancelled) return
        setImages([])
        setMediaTagsAvailable(false)
        setImagesError(error instanceof Error ? error.message : String(error))
      } finally {
        if (!cancelled) setImagesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [enabled, open, cwd])

  useEffect(() => {
    if (previewPath === undefined) return
    if (images.some(image => image.relativePath === previewPath)) return
    setPreviewPath(undefined)
  }, [images, previewPath])

  const selectedList = useMemo(
    () => [...selected].sort((a, b) => a.localeCompare(b)),
    [selected],
  )

  if (!enabled) return null

  const canGoBack = filesView === 'tree' && browseDir.length > 0
  const availableTags = collectTagOptions(images)
  const untaggedCount = images.reduce(
    (count, image) => count + (image.tags.length === 0 ? 1 : 0),
    0,
  )
  const filteredImages = filterImagesByTags(images, tagFilter)
  const treeEntries = filesView === 'tree'
    ? entriesInDirectory(filteredImages, browseDir)
    : { folders: [] as string[], files: [...filteredImages] }
  const sortedFolders = sortFolderNames(treeEntries.folders, filesSort)
  const sortedFiles = sortImages(treeEntries.files, filesSort)
  const visibleCount = filesView === 'tree'
    ? sortedFolders.length + sortedFiles.length
    : sortedFiles.length
  const visiblePaths = sortedFiles.map(image => image.relativePath)

  const goBack = () => {
    if (!canGoBack) return
    const parts = browseDir.split('/').filter(Boolean)
    parts.pop()
    setBrowseDir(parts.join('/'))
  }

  const toggleTagFilter = (tag: string) => {
    setTagFilter((current) => {
      if (tag === UNTAGGED_FILTER) {
        return current.includes(UNTAGGED_FILTER) ? [] : [UNTAGGED_FILTER]
      }
      const withoutUntagged = current.filter(item => item !== UNTAGGED_FILTER)
      return withoutUntagged.includes(tag)
        ? withoutUntagged.filter(item => item !== tag)
        : [...withoutUntagged, tag]
    })
  }

  const togglePath = (relativePath: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(relativePath)) next.delete(relativePath)
      else next.add(relativePath)
      return next
    })
  }

  const selectVisible = () => {
    setSelected((current) => {
      const next = new Set(current)
      for (const path of visiblePaths) next.add(path)
      return next
    })
  }

  const copySelected = async () => {
    if (selectedList.length === 0) return
    try {
      await navigator.clipboard.writeText(selectedList.join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const setCriteria = (next: string) => {
    setCriteriaDraft(next)
    saveCriteriaDraft(next)
  }

  const openCriteriaStep = () => {
    if (selectedList.length === 0) return
    setCriteriaStepOpen(true)
  }

  const confirmIntoChat = () => {
    if (selectedList.length === 0) return
    const body = buildConfirmDraft({
      lead: t('panel.confirmDraftLead'),
      leadWithCriteria: t('panel.confirmDraftLeadWithCriteria'),
      paths: selectedList,
      criteriaLead: t('panel.confirmDraftCriteriaLead'),
      criteria: criteriaDraft,
    })
    if (!insertDraft(sessionId, body)) return
    if (criteriaDraft.trim().length > 0) {
      setCriteriaHistory(rememberCriteria(criteriaDraft))
    }
    setCriteriaStepOpen(false)
    setOpen(false)
    setPreviewPath(undefined)
  }

  const closeDialog = () => {
    if (previewPath !== undefined) {
      setPreviewPath(undefined)
      return
    }
    if (criteriaStepOpen) {
      setCriteriaStepOpen(false)
      return
    }
    setOpen(false)
  }

  return (
    <div className={css.root} data-placement={placement}>
      <button
        type="button"
        className={placement === 'composer' ? css.triggerComposer : css.trigger}
        data-active={open || undefined}
        aria-label={t('panel.triggerAria')}
        aria-expanded={open}
        title={t('panel.triggerHint')}
        onClick={() => { setOpen(value => !value) }}
      >
        <IconBrowseOutline16 size={14} />
        <span>{t('panel.trigger')}</span>
      </button>
      <Modal
        headless
        open={open}
        onClose={closeDialog}
        title={t('panel.title')}
        className={css.dialog!}
      >
        <div className={css.dialogShell}>
          <header className={css.dialogHeader}>
            <div className={css.dialogHeaderStart}>
              {cwd === undefined ? null : (
                <button
                  type="button"
                  className={css.headToggle}
                  data-active={!configCollapsed || undefined}
                  data-filtered={state.dirty || undefined}
                  title={configCollapsed ? t('panel.configExpand') : t('panel.configCollapse')}
                  aria-label={configCollapsed ? t('panel.configExpand') : t('panel.configCollapse')}
                  aria-expanded={!configCollapsed}
                  onClick={() => { setConfigCollapsed(current => !current) }}
                >
                  {configCollapsed
                    ? <IconChevronRightOutline14 size={14} />
                    : <IconChevronLeftOutline14 size={14} />}
                  <span>{t('panel.config')}</span>
                </button>
              )}
            </div>
            <h2 className={css.dialogTitle}>{t('panel.title')}</h2>
            <div className={css.dialogHeaderEnd}>
              <button
                type="button"
                className={css.dialogClose}
                aria-label={t('panel.close')}
                onClick={closeDialog}
              >
                <IconCloseOutline16 size={14} />
              </button>
            </div>
          </header>
          <div className={css.dialogBody}>
            {cwd === undefined || cwd.length === 0 ? (
              <p className={css.note}>{t('panel.noCwd')}</p>
            ) : (
              <div className={css.body}>
                <div className={css.layout}>
                  {!configCollapsed ? (
                    <aside className={css.configCol} aria-label={t('panel.config')}>
                      <div className={css.configScroll}>
                        <section className={css.configSection}>
                          <button
                            type="button"
                            className={css.configSectionHead}
                            aria-expanded={foldOpen.actions}
                            onClick={() => { toggleFold('actions') }}
                          >
                            <span className={css.foldChevron} data-open={foldOpen.actions || undefined} aria-hidden>
                              <IconChevronDownOutline14 size={14} />
                            </span>
                            <span className={css.configSectionTitle}>{t('panel.foldActions')}</span>
                          </button>
                          {foldOpen.actions ? (
                            <div className={css.toolbar}>
                              <Button
                                variant="primary"
                                disabled={selectedList.length === 0}
                                title={t('panel.nextHint')}
                                onClick={openCriteriaStep}
                              >
                                {t('panel.next')}
                              </Button>
                              <Button
                                variant="outline"
                                disabled={visiblePaths.length === 0}
                                onClick={selectVisible}
                              >
                                {t('panel.selectAll')}
                              </Button>
                              <Button
                                variant="outline"
                                disabled={selectedList.length === 0}
                                onClick={() => { setSelected(new Set()); setCopied(false) }}
                              >
                                {t('panel.clearSelection')}
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={selectedList.length === 0}
                                onClick={() => { void copySelected() }}
                              >
                                {copied ? t('panel.copied') : t('panel.copyPaths')}
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={imagesLoading}
                                onClick={() => { void reloadImages(cwd) }}
                              >
                                {t('panel.refresh')}
                              </Button>
                            </div>
                          ) : null}
                        </section>
                        <section className={css.configSection}>
                          <button
                            type="button"
                            className={css.configSectionHead}
                            aria-expanded={foldOpen.vision}
                            onClick={() => { toggleFold('vision') }}
                          >
                            <span className={css.foldChevron} data-open={foldOpen.vision || undefined} aria-hidden>
                              <IconChevronDownOutline14 size={14} />
                            </span>
                            <span className={css.configSectionTitle}>{t('panel.foldVision')}</span>
                            {state.dirty && state.status === 'ready'
                              && (state.draft.visionEnabled !== state.baseline.visionEnabled
                                || state.draft.visionLlmProvider !== state.baseline.visionLlmProvider
                                || state.draft.visionModel !== state.baseline.visionModel)
                              ? <span className={css.foldBadge}>{t('panel.foldDirty')}</span>
                              : null}
                          </button>
                          {foldOpen.vision
                            ? <VisionEditor state={state} controller={controller} t={t} />
                            : null}
                        </section>
                        <section className={css.configSection}>
                          <button
                            type="button"
                            className={css.configSectionHead}
                            aria-expanded={foldOpen.prompt}
                            onClick={() => { toggleFold('prompt') }}
                          >
                            <span className={css.foldChevron} data-open={foldOpen.prompt || undefined} aria-hidden>
                              <IconChevronDownOutline14 size={14} />
                            </span>
                            <span className={css.configSectionTitle}>{t('panel.foldPrompt')}</span>
                            {state.dirty && state.status === 'ready'
                              && state.draft.visionScorePrompt !== state.baseline.visionScorePrompt
                              ? <span className={css.foldBadge}>{t('panel.foldDirty')}</span>
                              : null}
                          </button>
                          {foldOpen.prompt
                            ? <PromptEditor state={state} controller={controller} t={t} />
                            : null}
                        </section>
                      </div>
                    </aside>
                  ) : null}
                  <section className={css.filesCol} aria-label={t('panel.files')}>
                    <div className={css.filesHead}>
                      <div className={css.filesHeadLeft}>
                        <span className={css.promptTitle}>{t('panel.files')}</span>
                        <span className={css.filesCount}>
                          {tagFilter.length > 0
                            ? `${filteredImages.length}/${images.length}`
                            : images.length}
                        </span>
                        {images.length > 0 ? (
                          <button
                            type="button"
                            className={css.headToggle}
                            data-active={!tagCollapsed || undefined}
                            data-filtered={tagFilter.length > 0 || undefined}
                            title={tagCollapsed ? t('panel.filesTagExpand') : t('panel.filesTagCollapse')}
                            aria-label={tagCollapsed ? t('panel.filesTagExpand') : t('panel.filesTagCollapse')}
                            aria-expanded={!tagCollapsed}
                            onClick={() => { setTagCollapsed(current => !current) }}
                          >
                            <span>{t('panel.filesTagFilter')}</span>
                            {tagCollapsed
                              ? <IconChevronRightOutline14 size={14} />
                              : <IconChevronLeftOutline14 size={14} />}
                          </button>
                        ) : null}
                      </div>
                      <div className={css.filesHeadRight}>
                        <label className={css.filesSort}>
                          <span className={css.filesSortLabel}>{t('panel.filesSort')}</span>
                          <select
                            className={css.filesSortSelect}
                            value={filesSort}
                            onChange={event => {
                              setFilesSort(event.target.value as FilesSortKey)
                            }}
                          >
                            <option value="name-asc">{t('panel.filesSortNameAsc')}</option>
                            <option value="name-desc">{t('panel.filesSortNameDesc')}</option>
                            <option value="mtime-desc">{t('panel.filesSortMtimeDesc')}</option>
                            <option value="mtime-asc">{t('panel.filesSortMtimeAsc')}</option>
                            <option value="size-desc">{t('panel.filesSortSizeDesc')}</option>
                            <option value="size-asc">{t('panel.filesSortSizeAsc')}</option>
                          </select>
                        </label>
                        <div className={css.filesViewToggle} role="group" aria-label={t('panel.files')}>
                          <button
                            type="button"
                            className={css.filesViewBtn}
                            data-active={filesView === 'tree' || undefined}
                            onClick={() => { setFilesView('tree') }}
                          >
                            {t('panel.filesViewTree')}
                          </button>
                          <button
                            type="button"
                            className={css.filesViewBtn}
                            data-active={filesView === 'flat' || undefined}
                            onClick={() => { setFilesView('flat') }}
                          >
                            {t('panel.filesViewFlat')}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={css.filesBody}>
                      {images.length > 0 && !tagCollapsed ? (
                        <aside className={css.tagSidebar} aria-label={t('panel.filesTagFilter')}>
                          {!mediaTagsAvailable ? (
                            <p className={css.note}>{t('panel.filesTagUnavailable')}</p>
                          ) : null}
                          <div className={css.tagSidebarChips}>
                            <button
                              type="button"
                              className={css.tagFilterChip}
                              data-active={tagFilter.length === 0 || undefined}
                              onClick={() => { setTagFilter([]) }}
                            >
                              <span className={css.tagFilterChipName}>{t('panel.filesTagFilterAll')}</span>
                              <span className={css.tagFilterChipCount}>{images.length}</span>
                            </button>
                            <button
                              type="button"
                              className={css.tagFilterChip}
                              data-active={tagFilter.includes(UNTAGGED_FILTER) || undefined}
                              onClick={() => { toggleTagFilter(UNTAGGED_FILTER) }}
                            >
                              <span className={css.tagFilterChipName}>{t('panel.filesTagFilterNone')}</span>
                              <span className={css.tagFilterChipCount}>{untaggedCount}</span>
                            </button>
                            {availableTags.map(tag => (
                              <button
                                key={tag.name}
                                type="button"
                                className={css.tagFilterChip}
                                data-active={tagFilter.includes(tag.name) || undefined}
                                title={tag.name}
                                onClick={() => { toggleTagFilter(tag.name) }}
                              >
                                <span className={css.tagFilterChipName}>{tag.name}</span>
                                <span className={css.tagFilterChipCount}>{tag.count}</span>
                              </button>
                            ))}
                          </div>
                        </aside>
                      ) : null}
                      <div className={css.filesMain}>
                        {filesView === 'tree' ? (
                          <div className={css.filesPathBar}>
                            {canGoBack ? (
                              <button
                                type="button"
                                className={css.filesBackBtn}
                                title={t('panel.filesBack')}
                                aria-label={t('panel.filesBack')}
                                onClick={goBack}
                              >
                                <IconChevronLeftOutline14 size={14} />
                                <span>{t('panel.filesBack')}</span>
                              </button>
                            ) : null}
                            <Breadcrumb
                              dir={browseDir}
                              rootLabel={t('panel.filesRoot')}
                              onNavigate={setBrowseDir}
                            />
                          </div>
                        ) : null}
                        {imagesLoading ? <p className={css.note}>{t('panel.loading')}</p> : null}
                        {imagesError !== undefined ? <p className={css.error}>{imagesError}</p> : null}
                        {!imagesLoading && imagesError === undefined && images.length === 0 ? (
                          <p className={css.note}>{t('panel.empty')}</p>
                        ) : null}
                        {!imagesLoading
                          && images.length > 0
                          && filteredImages.length === 0 ? (
                            <p className={css.note}>{t('panel.filesTagFilterEmpty')}</p>
                          ) : null}
                        {!imagesLoading
                          && filteredImages.length > 0
                          && visibleCount === 0
                          && filesView === 'tree' ? (
                            <p className={css.note}>{t('panel.emptyFolder')}</p>
                          ) : null}
                        {visibleCount > 0 ? (
                          <ul className={css.grid}>
                            {filesView === 'tree'
                              ? sortedFolders.map(name => (
                                <li key={`dir:${browseDir}/${name}`} className={css.folderItem}>
                                  <button
                                    type="button"
                                    className={css.folderCard}
                                    aria-label={`${t('panel.folderOpen')}: ${name}`}
                                    onClick={() => {
                                      setBrowseDir(browseDir.length === 0 ? name : `${browseDir}/${name}`)
                                    }}
                                  >
                                    <span className={css.folderIcon} aria-hidden />
                                    <span className={css.folderName}>{name}</span>
                                  </button>
                                </li>
                              ))
                              : null}
                            {sortedFiles.map(image => (
                              <CandidateCard
                                key={image.relativePath}
                                root={cwd}
                                image={image}
                                checked={selected.has(image.relativePath)}
                                onToggle={() => { togglePath(image.relativePath) }}
                                onPreview={() => { setPreviewPath(image.relativePath) }}
                                t={t}
                              />
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
                <footer className={css.jobFooter} aria-label={t('panel.foldJob')}>
                  {selectedList.length > 0 ? (
                    <>
                      <span className={css.jobFooterEmpty}>
                        {t('panel.selectedCount').replace('{n}', String(selectedList.length))}
                        {' · '}
                        {t('panel.nextHint')}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={openCriteriaStep}
                      >
                        {t('panel.next')}
                      </Button>
                    </>
                  ) : (
                    <span className={css.jobFooterEmpty}>{t('panel.foldJobEmpty')}</span>
                  )}
                </footer>
                {previewPath !== undefined ? (
                  <Lightbox
                    root={cwd}
                    relativePath={previewPath}
                    image={images.find(row => row.relativePath === previewPath)}
                    onClose={() => { setPreviewPath(undefined) }}
                    t={t}
                  />
                ) : null}
                <Modal
                  headless
                  open={criteriaStepOpen}
                  onClose={() => { setCriteriaStepOpen(false) }}
                  title={t('panel.criteriaStepTitle')}
                  className={css.criteriaStepDialog!}
                >
                  <div className={css.criteriaStepShell}>
                    <header className={css.criteriaStepHeader}>
                      <div className={css.criteriaStepHeaderStart}>
                        <span className={css.criteriaStepStep}>
                          {t('panel.criteriaStepBadge').replace('{n}', String(selectedList.length))}
                        </span>
                      </div>
                      <h2 className={css.criteriaStepTitle}>{t('panel.criteriaStepTitle')}</h2>
                      <div className={css.criteriaStepHeaderEnd}>
                        <button
                          type="button"
                          className={css.dialogClose}
                          aria-label={t('panel.close')}
                          onClick={() => { setCriteriaStepOpen(false) }}
                        >
                          <IconCloseOutline16 size={14} />
                        </button>
                      </div>
                    </header>
                    <div className={css.criteriaStepBody}>
                      <p className={css.note}>{t('panel.criteriaStepHint')}</p>
                      <CriteriaEditor
                        draft={criteriaDraft}
                        history={criteriaHistory}
                        onChange={setCriteria}
                        t={t}
                      />
                    </div>
                    <footer className={css.criteriaStepFooter}>
                      <Button
                        variant="ghost"
                        onClick={() => { setCriteriaStepOpen(false) }}
                      >
                        {t('panel.criteriaStepBack')}
                      </Button>
                      <Button
                        variant="primary"
                        title={t('panel.confirmHint')}
                        onClick={confirmIntoChat}
                      >
                        {t('panel.confirm')}
                      </Button>
                    </footer>
                  </div>
                </Modal>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CriteriaEditor(props: {
  draft: string
  history: readonly string[]
  onChange: (next: string) => void
  t: (key: PhotoPickUiKey) => string
}) {
  const { draft, history, onChange, t } = props
  return (
    <div className={css.sectionBody} aria-label={t('panel.criteriaSection')}>
      <p className={css.note}>{t('panel.criteriaHint')}</p>
      <div className={css.criteriaPresets} role="group" aria-label={t('panel.criteriaPresets')}>
        {CRITERIA_PRESET_IDS.map(id => {
          const clause = t(criteriaTextKey(id))
          const active = criteriaHasClause(draft, clause)
          return (
            <button
              key={id}
              type="button"
              className={css.criteriaChip}
              data-active={active || undefined}
              title={clause}
              aria-pressed={active}
              onClick={() => { onChange(toggleCriteriaClause(draft, clause)) }}
            >
              {t(criteriaChipKey(id))}
            </button>
          )
        })}
      </div>
      <label className={css.promptField}>
        <span className={css.detailLabel}>{t('panel.criteriaSection')}</span>
        <textarea
          className={css.promptInput}
          rows={4}
          value={draft}
          placeholder={t('panel.criteriaPlaceholder')}
          onChange={(event) => { onChange(event.target.value) }}
        />
      </label>
      <div className={css.promptActions}>
        <Button
          variant="ghost"
          size="sm"
          disabled={draft.length === 0}
          onClick={() => { onChange('') }}
        >
          {t('panel.criteriaClear')}
        </Button>
      </div>
      <div className={css.criteriaHistory} aria-label={t('panel.criteriaHistory')}>
        <span className={css.detailLabel}>{t('panel.criteriaHistory')}</span>
        {history.length === 0 ? (
          <p className={css.note}>{t('panel.criteriaHistoryEmpty')}</p>
        ) : (
          <ul className={css.criteriaHistoryList}>
            {history.map(item => (
              <li key={item} className={css.criteriaHistoryItem}>
                <button
                  type="button"
                  className={css.criteriaHistoryBtn}
                  title={item}
                  onClick={() => { onChange(item) }}
                >
                  <span className={css.criteriaHistoryText}>{item}</span>
                  <span className={css.criteriaHistoryApply}>{t('panel.criteriaHistoryApply')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function criteriaChipKey(id: CriteriaPresetId): PhotoPickUiKey {
  return `panel.criteriaChip.${id}` as PhotoPickUiKey
}

function criteriaTextKey(id: CriteriaPresetId): PhotoPickUiKey {
  return `panel.criteriaText.${id}` as PhotoPickUiKey
}

function VisionEditor(props: {
  state: PhotoPickSettingsState
  controller: PhotoPickSettingsStore
  t: (key: PhotoPickUiKey) => string
}) {
  const { state, controller, t } = props
  if (state.status === 'loading' || state.status === 'idle') {
    return <p className={css.note}>{t('panel.loading')}</p>
  }
  if (state.status === 'error') {
    return (
      <div className={css.sectionBody}>
        <p className={css.error}>{t('loadError')}</p>
        {state.error !== undefined ? <p className={css.note}>{state.error}</p> : null}
        <Button variant="outline" onClick={() => { void controller.load() }}>{t('retry')}</Button>
      </div>
    )
  }
  const disabled = !state.writable || state.saving
  const selected = state.draft.visionLlmProvider.length > 0 && state.draft.visionModel.length > 0
    ? encodeModelKey(state.draft.visionLlmProvider, state.draft.visionModel)
    : ''
  const selectedMeta = state.models.find(model => (
    model.provider === state.draft.visionLlmProvider && model.id === state.draft.visionModel
  ))
  const groups = groupModels(state.models)
  return (
    <div className={css.sectionBody} aria-label={t('panel.visionSection')}>
      <label className={css.toggleRow}>
        <input
          type="checkbox"
          checked={state.draft.visionEnabled}
          disabled={disabled}
          onChange={(event) => { controller.edit('visionEnabled', event.target.checked) }}
        />
        <span>
          <span className={css.detailLabel}>{t('visionEnabled')}</span>
          <span className={css.note}>{t('visionEnabledHint')}</span>
        </span>
      </label>
      <label className={css.promptField}>
        <span className={css.detailLabel}>{t('model')}</span>
        <select
          className={css.filesSortSelect}
          value={selected}
          disabled={disabled || state.models.length === 0}
          onChange={(event) => { controller.selectModel(event.target.value) }}
        >
          <option value="">{t('modelPlaceholder')}</option>
          {groups.map(group => (
            <optgroup key={group.provider} label={group.label}>
              {group.models.map(model => (
                <option
                  key={encodeModelKey(model.provider, model.id)}
                  value={encodeModelKey(model.provider, model.id)}
                >
                  {formatModelLabel(model, t)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p className={css.note}>{t('modelHint')}</p>
      {state.models.length === 0 ? <p className={css.note}>{t('noModels')}</p> : null}
      {selectedMeta?.supportsVision === false ? <p className={css.note}>{t('textOnlyWarning')}</p> : null}
      {!state.writable ? <p className={css.note}>{t('readonly')}</p> : null}
      {state.error !== undefined ? <p className={css.error}>{state.error || t('saveError')}</p> : null}
      {state.notice === 'saved' ? <p className={css.notice}>{t('saved')}</p> : null}
      <div className={css.promptActions}>
        <Button
          variant="primary"
          size="sm"
          disabled={disabled || !state.dirty}
          onClick={() => { void controller.save() }}
        >
          {t('save')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || !state.dirty}
          onClick={() => { controller.discard() }}
        >
          {t('discard')}
        </Button>
      </div>
    </div>
  )
}

function PromptEditor(props: {
  state: PhotoPickSettingsState
  controller: PhotoPickSettingsStore
  t: (key: PhotoPickUiKey) => string
}) {
  const { state, controller, t } = props
  if (state.status !== 'ready') {
    return <p className={css.note}>{t('panel.loading')}</p>
  }
  const disabled = !state.writable || state.saving
  return (
    <div className={css.sectionBody} aria-label={t('panel.promptSection')}>
      <label className={css.promptField}>
        <span className={css.detailLabel}>{t('panel.promptDefault')}</span>
        <pre className={css.defaultPrompt}>{state.defaultVisionScorePrompt || '—'}</pre>
      </label>
      <label className={css.promptField}>
        <span className={css.detailLabel}>{t('panel.promptCustom')}</span>
        <textarea
          className={css.promptInput}
          rows={8}
          value={state.draft.visionScorePrompt}
          disabled={disabled}
          placeholder={t('panel.promptCustomHint')}
          onChange={(event) => { controller.edit('visionScorePrompt', event.target.value) }}
        />
      </label>
      <label className={css.promptField}>
        <span className={css.detailLabel}>{t('panel.promptSuffix')}</span>
        <pre className={css.defaultPrompt}>{state.visionScoreJsonSuffix || '—'}</pre>
      </label>
      <p className={css.note}>{t('panel.promptCustomHint')}</p>
      {state.notice === 'saved' ? <p className={css.notice}>{t('panel.promptSaved')}</p> : null}
      <div className={css.promptActions}>
        <Button
          variant="primary"
          size="sm"
          disabled={!state.dirty || disabled}
          onClick={() => { void controller.save() }}
        >
          {t('panel.promptSave')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={state.draft.visionScorePrompt.length === 0 || disabled}
          onClick={() => { controller.resetPrompt() }}
        >
          {t('panel.promptReset')}
        </Button>
      </div>
    </div>
  )
}

function CandidateCard(props: {
  root: string
  image: CandidateImage
  checked: boolean
  onToggle: () => void
  onPreview: () => void
  t: (key: PhotoPickUiKey) => string
}) {
  const { root, image, checked, onToggle, onPreview, t } = props
  const [thumbFailed, setThumbFailed] = useState(false)
  const fileName = image.relativePath.split(/[/\\]/).pop() || image.relativePath
  return (
    <li className={checked ? `${css.card} ${css.cardActive}` : css.card} data-active={checked || undefined}>
      <button
        type="button"
        className={css.thumbButton}
        aria-label={t('panel.previewOpen')}
        disabled={thumbFailed}
        onClick={onPreview}
      >
        {!thumbFailed ? (
          <img
            className={css.thumb}
            src={photoPickFileUrl(root, image.relativePath)}
            alt=""
            loading="lazy"
            onError={() => { setThumbFailed(true) }}
          />
        ) : (
          <span className={css.thumbFallback}>{t('panel.previewFailed')}</span>
        )}
      </button>
      <div className={css.cardBody}>
        <button
          type="button"
          className={css.cardFoot}
          onClick={onToggle}
          aria-pressed={checked}
          aria-label={t('panel.selectAria').replace('{name}', fileName)}
          title={image.relativePath}
        >
          <span className={css.cardCheck} aria-hidden>
            <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
          </span>
          <span className={css.cardTitle}>
            <span className={css.cardPath}>{fileName}</span>
          </span>
        </button>
      </div>
    </li>
  )
}

function Lightbox(props: {
  root: string
  relativePath: string
  image: CandidateImage | undefined
  onClose: () => void
  t: (key: PhotoPickUiKey) => string
}) {
  const { root, relativePath, image, onClose, t } = props
  /** Detail side panel — same affordance as media-library preview. */
  const [logOpen, setLogOpen] = useState(true)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [natural, setNatural] = useState<{ width: number; height: number } | undefined>(undefined)
  const [viewport, setViewport] = useState<{ width: number; height: number } | undefined>(undefined)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)

  useEffect(() => {
    setZoom(1)
    setNatural(undefined)
    setDragging(false)
    setLogOpen(true)
    dragRef.current = null
  }, [relativePath])

  useEffect(() => {
    const el = viewportRef.current
    if (el === null) return
    const sync = () => {
      setViewport({ width: el.clientWidth, height: el.clientHeight })
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1 : -1
      setZoom(current => Math.min(
        PREVIEW_ZOOM_MAX,
        Math.max(PREVIEW_ZOOM_MIN, Math.round((current + direction * PREVIEW_ZOOM_STEP) * 100) / 100),
      ))
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => {
      observer.disconnect()
      el.removeEventListener('wheel', onWheelNative)
    }
  }, [logOpen])

  const fitScale = natural !== undefined && viewport !== undefined && natural.width > 0 && natural.height > 0
    ? Math.min(viewport.width / natural.width, viewport.height / natural.height, 1)
    : 1
  const displayWidth = natural !== undefined ? Math.max(1, natural.width * fitScale * zoom) : undefined
  const displayHeight = natural !== undefined ? Math.max(1, natural.height * fitScale * zoom) : undefined

  const setClampedZoom = (next: number) => {
    setZoom(Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round(next * 100) / 100)))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const el = viewportRef.current
    if (el === null) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    }
    setDragging(true)
    el.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const el = viewportRef.current
    if (drag === null || el === null || drag.pointerId !== event.pointerId) return
    el.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX)
    el.scrollTop = drag.scrollTop - (event.clientY - drag.startY)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer already released by the browser.
    }
  }

  return createPortal((
    <div className={css.lightbox} role="dialog" aria-modal="true" aria-label={t('panel.preview')}>
      <button type="button" className={css.lightboxMask} aria-label={t('panel.previewClose')} onClick={onClose} />
      <div className={css.lightboxCard} data-log-open={logOpen || undefined}>
        <div className={css.lightboxHead}>
          <span className={css.cardPath} title={relativePath}>{relativePath}</span>
          <div className={css.lightboxZoom}>
            <Button
              variant="outline"
              size="sm"
              disabled={zoom <= PREVIEW_ZOOM_MIN}
              title={t('panel.previewZoomOut')}
              aria-label={t('panel.previewZoomOut')}
              onClick={() => { setClampedZoom(zoom - PREVIEW_ZOOM_STEP) }}
            >
              −
            </Button>
            <span className={css.lightboxZoomValue}>{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              disabled={zoom >= PREVIEW_ZOOM_MAX}
              title={t('panel.previewZoomIn')}
              aria-label={t('panel.previewZoomIn')}
              onClick={() => { setClampedZoom(zoom + PREVIEW_ZOOM_STEP) }}
            >
              <IconPlusOutline16 size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={zoom === 1}
              title={t('panel.previewZoomReset')}
              onClick={() => { setZoom(1) }}
            >
              {t('panel.previewZoomReset')}
            </Button>
            <button
              type="button"
              className={css.lightboxTab}
              data-active={logOpen || undefined}
              title={logOpen ? t('panel.tabDetailHide') : t('panel.tabDetailShow')}
              aria-pressed={logOpen}
              onClick={() => { setLogOpen(open => !open) }}
            >
              {t('panel.tabDetail')}
            </button>
            <Button variant="ghost" size="sm" onClick={onClose}>{t('panel.previewClose')}</Button>
          </div>
        </div>
        <div className={css.lightboxSplit} data-log-open={logOpen || undefined}>
          <section className={css.lightboxPreviewPane}>
            <p className={css.lightboxHint}>{t('panel.previewZoomHint')}</p>
            <div
              ref={viewportRef}
              className={css.lightboxViewport}
              data-dragging={dragging || undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                className={css.lightboxImage}
                src={photoPickFileUrl(root, relativePath)}
                alt={relativePath}
                style={displayWidth !== undefined && displayHeight !== undefined
                  ? { width: displayWidth, height: displayHeight }
                  : undefined}
                onLoad={(event) => {
                  setNatural({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }}
                draggable={false}
              />
            </div>
          </section>
          {logOpen ? (
            <section className={css.lightboxLogPane} aria-label={t('panel.tabDetail')}>
              <div className={css.lightboxLog}>
                <LogField label={t('panel.path')} value={relativePath} />
                {image !== undefined ? (
                  <LogField label={t('panel.fileSize')} value={formatFileSize(image.size)} />
                ) : null}
                {natural !== undefined ? (
                  <LogField
                    label={t('panel.imageSize')}
                    value={`${natural.width} × ${natural.height}`}
                  />
                ) : null}
                {image !== undefined ? (
                  <LogField label={t('panel.mtime')} value={formatMtime(image.mtimeMs)} />
                ) : null}
                {image?.category !== undefined && image.category.length > 0 ? (
                  <LogField label={t('panel.category')} value={image.category} />
                ) : null}
                {image?.tagStatus !== undefined ? (
                  <LogField
                    label={t('panel.tagStatus')}
                    value={tagStatusLabel(image.tagStatus, t)}
                    valueClass={tagStatusClass(image.tagStatus)}
                  />
                ) : null}
                <div className={css.logBlock}>
                  <div className={css.detailLabel}>{t('panel.description')}</div>
                  <div>
                    {image?.description !== undefined && image.description.length > 0
                      ? image.description
                      : '—'}
                  </div>
                </div>
                <div className={css.logBlock}>
                  <div className={css.detailLabel}>{t('panel.tags')}</div>
                  {image !== undefined && image.tags.length > 0 ? (
                    <div className={css.tags}>
                      {image.tags.map(tag => <span key={tag} className={css.tag}>{tag}</span>)}
                    </div>
                  ) : (
                    <div className={css.note}>{t('panel.noTags')}</div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  ), document.body)
}

function LogField(props: {
  label: string
  value: string
  valueClass?: string | undefined
}) {
  return (
    <div className={css.logField}>
      <span className={css.detailLabel}>{props.label}</span>
      <span className={props.valueClass}>{props.value}</span>
    </div>
  )
}

/** Human-readable file size for detail panels. */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unit]}`
}

function formatMtime(mtimeMs: number): string {
  if (!Number.isFinite(mtimeMs) || mtimeMs <= 0) return '—'
  return new Date(mtimeMs).toLocaleString()
}

function tagStatusLabel(
  status: NonNullable<CandidateImage['tagStatus']>,
  t: (key: PhotoPickUiKey) => string,
): string {
  if (status === 'ok') return t('panel.tagOk')
  if (status === 'failed') return t('panel.tagFailed')
  if (status === 'skipped') return t('panel.tagSkipped')
  return t('panel.tagPending')
}

function tagStatusClass(status: NonNullable<CandidateImage['tagStatus']>): string | undefined {
  if (status === 'ok') return css.statusOk
  if (status === 'failed') return css.statusFailed
  if (status === 'skipped') return css.statusSkipped
  return undefined
}

function photoPickFileUrl(root: string, relativePath: string): string {
  return `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(relativePath)}`
}

/**
 * Load photo-pick candidates, then soft-merge media-library fields when available.
 * @param root - workspace root path.
 */
async function loadCandidatesWithSoftTags(root: string): Promise<{
  images: CandidateImage[]
  mediaTagsAvailable: boolean
}> {
  const url = `${CANDIDATES_PATH}?root=${encodeURIComponent(root)}`
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json() as {
    images?: ReadonlyArray<{
      relativePath: string
      size: number
      mtimeMs: number
    }>
  }
  const base: CandidateImage[] = (body.images ?? []).map(image => ({
    relativePath: image.relativePath,
    size: image.size,
    mtimeMs: image.mtimeMs,
    tags: [],
  }))
  try {
    const mediaUrl = `${MEDIA_ASSETS_PATH}?root=${encodeURIComponent(root)}`
    const mediaResponse = await fetch(mediaUrl, { credentials: 'same-origin' })
    if (!mediaResponse.ok) {
      return { images: base, mediaTagsAvailable: false }
    }
    const mediaBody = await mediaResponse.json() as {
      assets?: ReadonlyArray<{
        relativePath: string
        tags?: readonly string[]
        description?: string
        category?: string
        tagStatus?: 'pending' | 'ok' | 'skipped' | 'failed'
      }>
    }
    const mediaByPath = new Map<string, {
      tags: readonly string[]
      description?: string
      category?: string
      tagStatus?: 'pending' | 'ok' | 'skipped' | 'failed'
    }>()
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
      })
    }
    return {
      images: base.map(image => {
        const media = mediaByPath.get(image.relativePath)
        if (media === undefined) return image
        return {
          ...image,
          tags: media.tags,
          ...media.description !== undefined ? { description: media.description } : {},
          ...media.category !== undefined ? { category: media.category } : {},
          ...media.tagStatus !== undefined ? { tagStatus: media.tagStatus } : {},
        }
      }),
      mediaTagsAvailable: true,
    }
  } catch {
    // Media plugin absent or unreachable — keep empty tags.
    return { images: base, mediaTagsAvailable: false }
  }
}

function collectTagOptions(images: readonly CandidateImage[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const image of images) {
    for (const tag of image.tags) {
      const trimmed = tag.trim()
      if (trimmed.length === 0) continue
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
    .map(([name, count]) => ({ name, count }))
}

function filterImagesByTags(
  images: readonly CandidateImage[],
  selected: readonly string[],
): CandidateImage[] {
  if (selected.length === 0) return [...images]
  const wantUntagged = selected.includes(UNTAGGED_FILTER)
  const tags = selected.filter(tag => tag !== UNTAGGED_FILTER)
  return images.filter(image => {
    const untagged = image.tags.length === 0
    if (wantUntagged && tags.length === 0) return untagged
    if (wantUntagged && untagged) return true
    if (tags.length === 0) return false
    const lower = new Set(image.tags.map(tag => tag.trim().toLowerCase()))
    return tags.every(tag => lower.has(tag.toLowerCase()))
  })
}

function Breadcrumb(props: {
  dir: string
  rootLabel: string
  onNavigate: (dir: string) => void
}) {
  const { dir, rootLabel, onNavigate } = props
  const parts = dir.length === 0 ? [] : dir.split('/').filter(Boolean)
  return (
    <nav className={css.breadcrumb} aria-label={rootLabel}>
      <button
        type="button"
        className={css.breadcrumbCrumb}
        disabled={parts.length === 0}
        onClick={() => { onNavigate('') }}
      >
        {rootLabel}
      </button>
      {parts.map((part, index) => {
        const target = parts.slice(0, index + 1).join('/')
        const last = index === parts.length - 1
        return (
          <span key={target} className={css.breadcrumbItem}>
            <span className={css.breadcrumbSep} aria-hidden>/</span>
            <button
              type="button"
              className={css.breadcrumbCrumb}
              disabled={last}
              onClick={() => { onNavigate(target) }}
            >
              {part}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

function entriesInDirectory(
  images: readonly CandidateImage[],
  dir: string,
): { folders: string[]; files: CandidateImage[] } {
  const prefix = dir.length === 0 ? '' : `${dir}/`
  const folders = new Set<string>()
  const files: CandidateImage[] = []
  for (const image of images) {
    if (!image.relativePath.startsWith(prefix)) continue
    const rest = image.relativePath.slice(prefix.length)
    const slash = rest.indexOf('/')
    if (slash >= 0) {
      const name = rest.slice(0, slash)
      if (name.length > 0) folders.add(name)
      continue
    }
    if (rest.length > 0) files.push(image)
  }
  return { folders: [...folders], files }
}

function sortFolderNames(names: readonly string[], sort: FilesSortKey): string[] {
  const out = [...names]
  out.sort((a, b) => a.localeCompare(b))
  if (sort === 'name-desc') out.reverse()
  return out
}

function sortImages(images: readonly CandidateImage[], sort: FilesSortKey): CandidateImage[] {
  const out = [...images]
  switch (sort) {
    case 'name-asc':
      out.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      break
    case 'name-desc':
      out.sort((a, b) => b.relativePath.localeCompare(a.relativePath))
      break
    case 'mtime-desc':
      out.sort((a, b) => b.mtimeMs - a.mtimeMs)
      break
    case 'mtime-asc':
      out.sort((a, b) => a.mtimeMs - b.mtimeMs)
      break
    case 'size-desc':
      out.sort((a, b) => b.size - a.size)
      break
    case 'size-asc':
      out.sort((a, b) => a.size - b.size)
      break
    default:
      break
  }
  return out
}

function groupModels(models: readonly PhotoPickVisionModelOption[]): Array<{
  provider: string
  label: string
  models: PhotoPickVisionModelOption[]
}> {
  const order: string[] = []
  const map = new Map<string, { provider: string; label: string; models: PhotoPickVisionModelOption[] }>()
  for (const model of models) {
    let group = map.get(model.provider)
    if (group === undefined) {
      group = {
        provider: model.provider,
        label: model.providerName || model.provider,
        models: [],
      }
      map.set(model.provider, group)
      order.push(model.provider)
    }
    group.models.push(model)
  }
  return order.map(id => map.get(id)!)
}

function formatModelLabel(
  model: PhotoPickVisionModelOption,
  t: (key: PhotoPickUiKey) => string,
): string {
  if (model.supportsVision === true) return `${model.name} · ${t('visionCapable')}`
  if (model.supportsVision === false) return `${model.name} · ${t('textOnly')}`
  return model.name
}
