/**
 * Ranked photo compare dialog: free pair pick, synced zoom/pan, and a trash queue.
 * @module dsh-photo-pick-ui/client/PhotoPickCompareDialog
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  IconBrowseOutline16,
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconFolderOpenOutline16,
  IconPlusOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PhotoPickUiKey } from './locales.ts'
import type { PhotoPickRankMeta, PhotoPickRankRow } from './rank-meta.ts'
import css from './PhotoPickCompareDialog.module.css'

/** Props for {@link PhotoPickCompareDialog}. */
export interface PhotoPickCompareDialogProps {
  /** Session workspace root for preview URLs. */
  readonly root: string
  /** Ranking payload from tool presentationMeta. */
  readonly meta: PhotoPickRankMeta
  /** Optional path to focus when the dialog opens. */
  readonly initialPath?: string
  /** Close handler. */
  readonly onClose: () => void
  /** Locale thunk. */
  readonly t: (key: PhotoPickUiKey) => string
}

type CompareMode = 'single' | 'split'
type FocusSide = 'left' | 'right'

const ZOOM_MIN = 0.25
const ZOOM_MAX = 5
const ZOOM_STEP = 0.25

interface PanState {
  readonly x: number
  readonly y: number
}

/**
 * Full-screen compare overlay for scored photo_pick_best results.
 * Active thumbs stay in the compare queue; passed photos move to a recycle bin
 * and can be restored. In split mode, thumbs assign left/right freely.
 * @param props - root, ranking, close, locale.
 */
export function PhotoPickCompareDialog(props: PhotoPickCompareDialogProps) {
  const { root, meta, initialPath, onClose, t } = props
  const allRows = meta.ranked
  const rankByPath = useMemo(() => {
    const map = new Map<string, number>()
    allRows.forEach((row, i) => { map.set(row.relativePath, i + 1) })
    return map
  }, [allRows])
  const rowByPath = useMemo(() => {
    const map = new Map<string, PhotoPickRankRow>()
    for (const row of allRows) map.set(row.relativePath, row)
    return map
  }, [allRows])

  const initialLeft = initialPath !== undefined && allRows.some(row => row.relativePath === initialPath)
    ? initialPath
    : (allRows[0]?.relativePath ?? '')
  const initialRight = allRows.find(row => row.relativePath !== initialLeft)?.relativePath
    ?? initialLeft

  const [activePaths, setActivePaths] = useState<string[]>(() => allRows.map(r => r.relativePath))
  const [trashPaths, setTrashPaths] = useState<string[]>([])
  const [leftPath, setLeftPath] = useState(initialLeft)
  const [rightPath, setRightPath] = useState(initialRight)
  const [focusSide, setFocusSide] = useState<FocusSide>('left')
  const [mode, setMode] = useState<CompareMode>(() => (
    allRows.length >= 2 ? 'split' : 'single'
  ))
  const [trashOpen, setTrashOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 })
  const [focusedNatural, setFocusedNatural] = useState<{ width: number; height: number } | undefined>(undefined)

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const paths = allRows.map(r => r.relativePath)
    const nextLeft = initialPath !== undefined && paths.includes(initialPath)
      ? initialPath
      : (paths[0] ?? '')
    const nextRight = paths.find(path => path !== nextLeft) ?? nextLeft
    setActivePaths(paths)
    setTrashPaths([])
    setLeftPath(nextLeft)
    setRightPath(nextRight)
    setFocusSide('left')
    setMode(paths.length >= 2 ? 'split' : 'single')
    setTrashOpen(false)
    resetView()
  }, [meta, allRows, initialPath, resetView])

  const activeRows = useMemo(
    () => activePaths
      .map(path => rowByPath.get(path))
      .filter((row): row is PhotoPickRankRow => row !== undefined),
    [activePaths, rowByPath],
  )
  const trashRows = useMemo(
    () => trashPaths
      .map(path => rowByPath.get(path))
      .filter((row): row is PhotoPickRankRow => row !== undefined),
    [trashPaths, rowByPath],
  )

  // Keep left/right pointing at still-active photos when the queue changes.
  useEffect(() => {
    if (activePaths.length === 0) return
    const leftOk = activePaths.includes(leftPath)
    const rightOk = activePaths.includes(rightPath)
    if (!leftOk) {
      const nextLeft = activePaths[0]!
      setLeftPath(nextLeft)
      if (!rightOk || rightPath === nextLeft) {
        setRightPath(activePaths[1] ?? nextLeft)
      }
      return
    }
    if (!rightOk) {
      setRightPath(activePaths.find(path => path !== leftPath) ?? leftPath)
    }
  }, [activePaths, leftPath, rightPath])

  useEffect(() => {
    if (mode === 'split' && activePaths.length < 2) setMode('single')
  }, [mode, activePaths.length])

  const split = mode === 'split' && activePaths.length >= 2
    && leftPath.length > 0 && rightPath.length > 0

  useEffect(() => {
    resetView()
  }, [leftPath, rightPath, mode, detailOpen, resetView])

  const moveFocusAlongQueue = useCallback((delta: number) => {
    if (activePaths.length === 0) return
    const current = focusSide === 'left' ? leftPath : rightPath
    const at = Math.max(0, activePaths.indexOf(current))
    let next = at
    for (let step = 0; step < activePaths.length; step += 1) {
      next = (next + delta + activePaths.length) % activePaths.length
      const candidate = activePaths[next]!
      if (!split || candidate !== (focusSide === 'left' ? rightPath : leftPath) || activePaths.length === 1) {
        if (focusSide === 'left') setLeftPath(candidate)
        else setRightPath(candidate)
        return
      }
    }
  }, [activePaths, focusSide, leftPath, rightPath, split])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        moveFocusAlongQueue(-1)
        return
      }
      if (event.key === 'ArrowRight') {
        moveFocusAlongQueue(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [onClose, moveFocusAlongQueue])

  if (allRows.length === 0) return null

  const left = rowByPath.get(leftPath)
  const right = rowByPath.get(rightPath)

  const setClampedZoom = useCallback((next: number) => {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100)))
  }, [])

  const onZoomDelta = useCallback((delta: number) => {
    setZoom(current => Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, Math.round((current + delta) * 100) / 100),
    ))
  }, [])

  const layoutKey = `${mode}:${detailOpen ? '1' : '0'}`

  const passPhoto = (path: string) => {
    if (!activePaths.includes(path)) return
    setActivePaths(current => current.filter(item => item !== path))
    setTrashPaths(current => current.includes(path) ? current : [...current, path])
    setTrashOpen(true)
  }

  const restorePhoto = (path: string) => {
    if (!trashPaths.includes(path)) return
    setTrashPaths(current => current.filter(item => item !== path))
    setActivePaths(current => insertByOriginalOrder(current, path, allRows))
  }

  const onThumbClick = (path: string) => {
    if (!split) {
      setLeftPath(path)
      setFocusSide('left')
      return
    }
    if (path === leftPath) {
      setFocusSide('left')
      return
    }
    if (path === rightPath) {
      setFocusSide('right')
      return
    }
    if (focusSide === 'left') setLeftPath(path)
    else setRightPath(path)
  }

  const enterSplit = () => {
    if (activePaths.length < 2) return
    setMode('split')
    if (leftPath === rightPath || !activePaths.includes(rightPath)) {
      const other = activePaths.find(path => path !== leftPath) ?? activePaths[1]!
      setRightPath(other)
    }
    setFocusSide('right')
  }

  const showLeft = left ?? activeRows[0]
  const showRight = right ?? activeRows[1] ?? activeRows[0]
  const canNavigate = activePaths.length > 1
  const focusedRow = split
    ? (focusSide === 'left' ? showLeft : showRight)
    : showLeft
  const focusedRank = focusedRow !== undefined
    ? (rankByPath.get(focusedRow.relativePath) ?? 1)
    : 1

  useEffect(() => {
    setFocusedNatural(undefined)
  }, [focusedRow?.relativePath])

  return createPortal((
    <div className={css.root} role="dialog" aria-modal="true" aria-label={t('compare.title')}>
      <button type="button" className={css.mask} aria-label={t('compare.close')} onClick={onClose} />
      <div className={css.card}>
        <header className={css.head}>
          <div className={css.headStart}>
            <h2 className={css.title}>{t('compare.title')}</h2>
            <span className={css.meta}>
              {meta.visionProvider.length > 0 && meta.visionModel.length > 0
                ? `${meta.visionProvider} / ${meta.visionModel}`
                : null}
              {meta.visionCalls > 0
                ? ` · ${t('compare.calls').replace('{n}', String(meta.visionCalls))}`
                : null}
            </span>
          </div>
          <div className={css.headEnd}>
            <div className={css.zoomBar} role="group" aria-label={t('compare.zoom')}>
              <Button
                variant="outline"
                size="sm"
                disabled={zoom <= ZOOM_MIN}
                title={t('panel.previewZoomOut')}
                aria-label={t('panel.previewZoomOut')}
                onClick={() => { setClampedZoom(zoom - ZOOM_STEP) }}
              >
                −
              </Button>
              <span className={css.zoomValue}>{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                disabled={zoom >= ZOOM_MAX}
                title={t('panel.previewZoomIn')}
                aria-label={t('panel.previewZoomIn')}
                onClick={() => { setClampedZoom(zoom + ZOOM_STEP) }}
              >
                <IconPlusOutline16 size={12} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
                title={t('panel.previewZoomReset')}
                onClick={resetView}
              >
                {t('panel.previewZoomReset')}
              </Button>
            </div>
            <div className={css.modeToggle} role="group" aria-label={t('compare.mode')}>
              <button
                type="button"
                className={css.modeBtn}
                data-active={mode === 'single' || undefined}
                onClick={() => {
                  setMode('single')
                  setFocusSide('left')
                  resetView()
                }}
              >
                {t('compare.modeSingle')}
              </button>
              <button
                type="button"
                className={css.modeBtn}
                data-active={mode === 'split' || undefined}
                disabled={activePaths.length < 2}
                onClick={() => {
                  enterSplit()
                  resetView()
                }}
              >
                {t('compare.modeSplit')}
              </button>
            </div>
            <button
              type="button"
              className={css.modeBtn}
              data-active={detailOpen || undefined}
              title={detailOpen ? t('panel.tabDetailHide') : t('panel.tabDetailShow')}
              aria-pressed={detailOpen}
              onClick={() => { setDetailOpen(open => !open) }}
            >
              {t('compare.tabDetail')}
            </button>
            <button type="button" className={css.close} aria-label={t('compare.close')} onClick={onClose}>
              <IconCloseOutline16 size={14} />
            </button>
          </div>
        </header>

        <p className={css.hint}>
          {split ? t('compare.hintSplitPick') : t('compare.hintSingle')}
        </p>

        {showLeft === undefined ? (
          <div className={css.emptyQueue}>
            <p className={css.noteEmpty}>{t('compare.queueEmpty')}</p>
            {trashRows.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => { setTrashOpen(true) }}>
                {t('compare.trashOpen')}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className={css.mainRow} data-detail={detailOpen || undefined}>
            <div className={css.body} data-split={split || undefined}>
              {showLeft !== undefined ? (
                <RankPane
                  key={`L:${layoutKey}:${showLeft.relativePath}`}
                  root={root}
                  row={showLeft}
                  rank={rankByPath.get(showLeft.relativePath) ?? 1}
                  {...(split ? { sideLabel: t('compare.sideLeft') } : {})}
                  focused={split && focusSide === 'left'}
                  onFocus={() => { setFocusSide('left') }}
                  onPass={() => { passPhoto(showLeft.relativePath) }}
                  t={t}
                  zoom={zoom}
                  pan={pan}
                  onZoomDelta={onZoomDelta}
                  onPanChange={setPan}
                  {...(!split || focusSide === 'left'
                    ? { onNaturalSize: setFocusedNatural }
                    : {})}
                />
              ) : null}
              {split && showRight !== undefined ? (
                <RankPane
                  key={`R:${layoutKey}:${showRight.relativePath}`}
                  root={root}
                  row={showRight}
                  rank={rankByPath.get(showRight.relativePath) ?? 1}
                  sideLabel={t('compare.sideRight')}
                  focused={focusSide === 'right'}
                  onFocus={() => { setFocusSide('right') }}
                  onPass={() => { passPhoto(showRight.relativePath) }}
                  t={t}
                  zoom={zoom}
                  pan={pan}
                  onZoomDelta={onZoomDelta}
                  onPanChange={setPan}
                  {...(focusSide === 'right' ? { onNaturalSize: setFocusedNatural } : {})}
                />
              ) : null}
            </div>
            {detailOpen && focusedRow !== undefined ? (
              <aside className={css.detailPane} aria-label={t('compare.tabDetail')}>
                <div className={css.detailLog}>
                  <div className={css.detailField}>
                    <span className={css.detailLabel}>{t('compare.detailPath')}</span>
                    <span title={focusedRow.relativePath}>{focusedRow.relativePath}</span>
                  </div>
                  <div className={css.detailField}>
                    <span className={css.detailLabel}>{t('compare.detailRank')}</span>
                    <span>#{focusedRank}</span>
                  </div>
                  <div className={css.detailField}>
                    <span className={css.detailLabel}>{t('compare.detailScore')}</span>
                    <span>{focusedRow.score}</span>
                  </div>
                  {(meta.visionProvider.length > 0 || meta.visionModel.length > 0) ? (
                    <div className={css.detailField}>
                      <span className={css.detailLabel}>{t('compare.detailModel')}</span>
                      <span>
                        {[meta.visionProvider, meta.visionModel].filter(s => s.length > 0).join(' / ')}
                      </span>
                    </div>
                  ) : null}
                  {focusedNatural !== undefined ? (
                    <div className={css.detailField}>
                      <span className={css.detailLabel}>{t('compare.detailSize')}</span>
                      <span>{focusedNatural.width} × {focusedNatural.height}</span>
                    </div>
                  ) : null}
                  <div className={css.detailBlock}>
                    <span className={css.detailLabel}>{t('compare.reasons')}</span>
                    {focusedRow.reasons.length > 0 ? (
                      <ul>{focusedRow.reasons.map(text => <li key={text}>{text}</li>)}</ul>
                    ) : (
                      <p className={css.noteEmpty}>{t('compare.none')}</p>
                    )}
                  </div>
                  <div className={css.detailBlock}>
                    <span className={css.detailLabel}>{t('compare.flaws')}</span>
                    {focusedRow.flaws.length > 0 ? (
                      <ul>{focusedRow.flaws.map(text => <li key={text}>{text}</li>)}</ul>
                    ) : (
                      <p className={css.noteEmpty}>{t('compare.none')}</p>
                    )}
                  </div>
                  {focusedRow.error !== undefined ? (
                    <p className={css.error}>{focusedRow.error}</p>
                  ) : null}
                </div>
              </aside>
            ) : null}
          </div>
        )}

        <footer className={css.foot}>
          <div className={css.nav}>
            <Button
              variant="outline"
              size="sm"
              disabled={!canNavigate}
              aria-label={t('compare.prev')}
              onClick={() => { moveFocusAlongQueue(-1) }}
            >
              <IconChevronLeftOutline14 size={14} />
              {t('compare.prev')}
            </Button>
            <span className={css.position}>
              {split
                ? t('compare.positionPair')
                  .replace('{a}', String(rankByPath.get(leftPath) ?? '?'))
                  .replace('{b}', String(rankByPath.get(rightPath) ?? '?'))
                  .replace('{n}', String(activePaths.length))
                : t('compare.position')
                  .replace('{i}', String(Math.max(1, activePaths.indexOf(leftPath) + 1)))
                  .replace('{n}', String(activePaths.length))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!canNavigate}
              aria-label={t('compare.next')}
              onClick={() => { moveFocusAlongQueue(1) }}
            >
              {t('compare.next')}
              <IconChevronRightOutline14 size={14} />
            </Button>
          </div>

          <div className={css.queueBlock}>
            <div className={css.queueHead}>
              <span className={css.queueTitle}>
                {t('compare.queueActive').replace('{n}', String(activeRows.length))}
              </span>
              {split ? (
                <span className={css.queueHint}>
                  {focusSide === 'left' ? t('compare.focusLeft') : t('compare.focusRight')}
                </span>
              ) : null}
            </div>
            <ul className={css.thumbs}>
              {activeRows.map((row) => {
                const path = row.relativePath
                const rank = rankByPath.get(path) ?? 0
                const isLeft = path === leftPath
                const isRight = split && path === rightPath
                const isFocus = split
                  ? (focusSide === 'left' ? isLeft : isRight)
                  : isLeft
                return (
                  <li key={path} className={css.thumbItem}>
                    <button
                      type="button"
                      className={css.thumb}
                      data-active={(isLeft || isRight) || undefined}
                      data-focus={isFocus || undefined}
                      data-side={isLeft && isRight ? 'both' : isLeft ? 'left' : isRight ? 'right' : undefined}
                      title={`#${rank} · ${row.score}`}
                      onClick={() => { onThumbClick(path) }}
                    >
                      <img src={fileUrl(root, path)} alt="" loading="lazy" />
                      <span className={css.thumbBadge}>#{rank}</span>
                      {isLeft || isRight ? (
                        <span className={css.thumbSide}>
                          {isLeft && isRight ? 'L/R' : isLeft ? 'L' : 'R'}
                        </span>
                      ) : null}
                      <span className={css.thumbScore}>{row.score}</span>
                    </button>
                    <button
                      type="button"
                      className={css.thumbPass}
                      title={t('compare.pass')}
                      aria-label={t('compare.pass')}
                      onClick={(event) => {
                        event.stopPropagation()
                        passPhoto(path)
                      }}
                    >
                      −
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={css.trashBlock}>
            <button
              type="button"
              className={css.trashToggle}
              aria-expanded={trashOpen}
              onClick={() => { setTrashOpen(current => !current) }}
            >
              <span>{t('compare.trash').replace('{n}', String(trashRows.length))}</span>
              <span className={css.trashChevron} data-open={trashOpen || undefined}>▾</span>
            </button>
            {trashOpen ? (
              trashRows.length === 0 ? (
                <p className={css.trashEmpty}>{t('compare.trashEmpty')}</p>
              ) : (
                <ul className={css.thumbs}>
                  {trashRows.map((row) => {
                    const path = row.relativePath
                    const rank = rankByPath.get(path) ?? 0
                    return (
                      <li key={path} className={css.thumbItem}>
                        <button
                          type="button"
                          className={css.thumb}
                          data-trashed=""
                          title={`#${rank} · ${row.score}`}
                          onClick={() => { restorePhoto(path) }}
                        >
                          <img src={fileUrl(root, path)} alt="" loading="lazy" />
                          <span className={css.thumbBadge}>#{rank}</span>
                          <span className={css.thumbScore}>{row.score}</span>
                        </button>
                        <button
                          type="button"
                          className={css.thumbRestore}
                          title={t('compare.restore')}
                          aria-label={t('compare.restore')}
                          onClick={() => { restorePhoto(path) }}
                        >
                          +
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  ), document.body)
}

/**
 * Insert a path back into the active queue using original ranking order.
 * @param current - active paths.
 * @param path - restored path.
 * @param allRows - original ranked rows.
 */
function insertByOriginalOrder(
  current: readonly string[],
  path: string,
  allRows: readonly PhotoPickRankRow[],
): string[] {
  if (current.includes(path)) return [...current]
  const order = new Map(allRows.map((row, i) => [row.relativePath, i]))
  const next = [...current, path]
  next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  return next
}

function RankPane(props: {
  root: string
  row: PhotoPickRankRow
  rank: number
  sideLabel?: string
  focused?: boolean
  onFocus?: () => void
  onPass?: () => void
  t: (key: PhotoPickUiKey) => string
  zoom: number
  pan: PanState
  onZoomDelta: (delta: number) => void
  onPanChange: (pan: PanState) => void
  /** Report decoded image size when this pane owns the focused detail. */
  onNaturalSize?: (size: { width: number; height: number } | undefined) => void
}) {
  const {
    root, row, rank, sideLabel, focused, onFocus, onPass, t,
    zoom, pan, onZoomDelta, onPanChange, onNaturalSize,
  } = props
  const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath
  const viewportRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [revealBusy, setRevealBusy] = useState(false)
  const [openBusy, setOpenBusy] = useState(false)
  const [natural, setNatural] = useState<{ width: number; height: number } | undefined>(undefined)
  const [viewport, setViewport] = useState<{ width: number; height: number } | undefined>(undefined)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useEffect(() => {
    setNatural(undefined)
  }, [row.relativePath])

  useEffect(() => {
    onNaturalSize?.(natural)
  }, [natural, onNaturalSize])

  // Parent remounts this pane on single↔split via key=…layoutKey…, so measure once
  // on mount + ResizeObserver — no stale full-width size from the previous mode.
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (el === null) return
    const sync = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      if (width <= 0 || height <= 0) return
      setViewport(current => (
        current !== undefined && current.width === width && current.height === height
          ? current
          : { width, height }
      ))
    }
    sync()
    const raf = requestAnimationFrame(sync)
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1 : -1
      onZoomDelta(direction * ZOOM_STEP)
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      el.removeEventListener('wheel', onWheelNative)
    }
  }, [onZoomDelta])

  const fitScale = natural !== undefined && viewport !== undefined && natural.width > 0 && natural.height > 0
    ? Math.min(viewport.width / natural.width, viewport.height / natural.height)
    : undefined
  const displayWidth = fitScale !== undefined && natural !== undefined
    ? Math.max(1, natural.width * fitScale)
    : undefined
  const displayHeight = fitScale !== undefined && natural !== undefined
    ? Math.max(1, natural.height * fitScale)
    : undefined

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    onFocus?.()
    const el = viewportRef.current
    if (el === null) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    setDragging(true)
    el.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    onPanChange({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    })
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

  return (
    <section
      className={css.pane}
      data-focused={focused || undefined}
      onClick={() => { onFocus?.() }}
    >
      <div className={css.paneHead}>
        {sideLabel !== undefined ? <span className={css.sideTag}>{sideLabel}</span> : null}
        <span className={css.rankBadge} title={`#${rank}`}>
          <span className={css.rankBadgeHash}>#</span>
          <span className={css.rankBadgeNum}>{rank}</span>
        </span>
        <span className={css.scoreBadge} title={t('compare.score').replace('{n}', String(row.score))}>
          <span className={css.scoreBadgeValue}>{row.score}</span>
          <span className={css.scoreBadgeUnit}>{t('compare.scoreUnit')}</span>
        </span>
        <span className={css.path} title={row.relativePath}>{fileName}</span>
        <div className={css.paneHeadActions}>
          <button
            type="button"
            className={css.paneAction}
            title={openBusy ? t('compare.openBusy') : t('compare.open')}
            aria-label={t('compare.open')}
            aria-busy={openBusy || undefined}
            disabled={openBusy}
            onClick={(event) => {
              event.stopPropagation()
              void (async () => {
                setOpenBusy(true)
                try {
                  await openInDefaultApp(root, row.relativePath, t)
                } finally {
                  setOpenBusy(false)
                }
              })()
            }}
          >
            <IconBrowseOutline16 size={14} />
          </button>
          <button
            type="button"
            className={css.paneAction}
            title={revealBusy ? t('compare.revealBusy') : t('compare.reveal')}
            aria-label={t('compare.reveal')}
            aria-busy={revealBusy || undefined}
            disabled={revealBusy}
            onClick={(event) => {
              event.stopPropagation()
              void (async () => {
                setRevealBusy(true)
                try {
                  await revealInFileManager(root, row.relativePath, t)
                } finally {
                  setRevealBusy(false)
                }
              })()
            }}
          >
            <IconFolderOpenOutline16 size={14} />
          </button>
          {onPass !== undefined ? (
            <button
              type="button"
              className={css.panePassAction}
              title={t('compare.pass')}
              aria-label={t('compare.pass')}
              onClick={(event) => {
                event.stopPropagation()
                onPass()
              }}
            >
              −
            </button>
          ) : null}
        </div>
      </div>
      <div
        ref={viewportRef}
        className={css.preview}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          className={css.previewImage}
          src={fileUrl(root, row.relativePath)}
          alt={row.relativePath}
          style={{
            ...(displayWidth !== undefined && displayHeight !== undefined
              ? { width: displayWidth, height: displayHeight }
              : { maxWidth: '100%', maxHeight: '100%' }),
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
          onLoad={(event) => {
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }}
          draggable={false}
        />
      </div>
      <div className={css.notes}>
        <div className={css.noteBlock}>
          <span className={css.noteLabel} data-kind="pro">{t('compare.reasons')}</span>
          {row.reasons.length > 0 ? (
            <ul className={css.chipList}>
              {row.reasons.map(text => (
                <li key={text} className={css.chip} data-kind="pro" title={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className={css.noteEmpty}>{t('compare.none')}</p>
          )}
        </div>
        <div className={css.noteBlock}>
          <span className={css.noteLabel} data-kind="con">{t('compare.flaws')}</span>
          {row.flaws.length > 0 ? (
            <ul className={css.chipList}>
              {row.flaws.map(text => (
                <li key={text} className={css.chip} data-kind="con" title={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className={css.noteEmpty}>{t('compare.none')}</p>
          )}
        </div>
        {row.error !== undefined ? (
          <p className={css.error}>{row.error}</p>
        ) : null}
      </div>
    </section>
  )
}

function fileUrl(root: string, relativePath: string): string {
  return `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(relativePath)}`
}

/**
 * Ask the Host to open this photo with the OS default application.
 * @param root - workspace root.
 * @param relativePath - path under root.
 * @param t - locale thunk for failure toast text.
 */
async function openInDefaultApp(
  root: string,
  relativePath: string,
  t: (key: PhotoPickUiKey) => string,
): Promise<void> {
  try {
    const response = await fetch('/api/photo-pick/open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ root, path: relativePath }),
    })
    if (!response.ok) {
      window.alert(t('compare.openFailed'))
    }
  } catch {
    window.alert(t('compare.openFailed'))
  }
}

/**
 * Ask the Host to select this photo in the OS file manager.
 * @param root - workspace root.
 * @param relativePath - path under root.
 * @param t - locale thunk for failure toast text.
 */
async function revealInFileManager(
  root: string,
  relativePath: string,
  t: (key: PhotoPickUiKey) => string,
): Promise<void> {
  try {
    const response = await fetch('/api/photo-pick/reveal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ root, path: relativePath }),
    })
    if (!response.ok) {
      window.alert(t('compare.revealFailed'))
    }
  } catch {
    window.alert(t('compare.revealFailed'))
  }
}
