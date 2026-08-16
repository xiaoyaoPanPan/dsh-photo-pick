/**
 * Keyed toolview for photo_pick_best: thumbnail ranking + open compare dialog.
 * @module dsh-photo-pick-ui/client/PhotoPickResultRow
 */

import { useState } from 'react'
import { Button, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { parsePhotoPickRankMeta, type PhotoPickRankRow } from './rank-meta.ts'
import { PhotoPickCompareDialog } from './PhotoPickCompareDialog.tsx'
import css from './PhotoPickResultRow.module.css'

type PhotoPickResultRowProps = ToolCallViewProps & PropsLocale<'settings.photo-pick'>

/** How many ranked thumbs to show inline in the chat card. */
const INLINE_TOP_N = 6

/**
 * Render the photo_pick_best chat tool card with inline ranked thumbnails.
 * @param props - toolview owner currency + photo-pick locale.
 */
export function PhotoPickResultRow(props: PhotoPickResultRowProps) {
  const { block, cwd, t } = props
  const [open, setOpen] = useState(false)
  const [focusPath, setFocusPath] = useState<string | undefined>(undefined)
  if (t === undefined) return null

  const done = 'kind' in block
  const running = !done
  const isError = done && block.isError
  const meta = done ? parsePhotoPickRankMeta(block.meta) : undefined
  const top = meta?.ranked[0]
  const summary = running
    ? t('result.running')
    : isError
      ? t('result.error')
      : top === undefined
        ? t('result.empty')
        : t('result.summary')
          .replace('{n}', String(meta?.ranked.length ?? 0))
          .replace('{score}', String(top.score))
          .replace('{path}', top.relativePath.split(/[/\\]/).pop() || top.relativePath)

  const canCompare = meta !== undefined && cwd !== undefined && cwd.length > 0 && !isError
  const inlineRows = meta?.ranked.slice(0, INLINE_TOP_N) ?? []
  const moreCount = meta !== undefined ? Math.max(0, meta.ranked.length - inlineRows.length) : 0

  const openCompare = (path?: string) => {
    setFocusPath(path)
    setOpen(true)
  }

  return (
    <div className={css.row} data-state={running ? 'running' : isError ? 'error' : 'ok'}>
      <span className={css.icon} aria-hidden>
        <IconBrowseOutline16 size={14} />
      </span>
      <div className={css.main}>
        <div className={css.titleLine}>
          <span className={css.title}>{t('result.title')}</span>
          <span className={css.dot} aria-hidden>·</span>
          <span className={css.summary}>{summary}</span>
        </div>

        {canCompare && inlineRows.length > 0 && cwd !== undefined ? (
          <div className={css.rankStrip} aria-label={t('result.rankStrip')}>
            <div className={css.rankHead}>
              <span className={css.rankTitle}>{t('result.rankTitle')}</span>
              {moreCount > 0 ? (
                <span className={css.rankMore}>
                  {t('result.rankMore').replace('{n}', String(moreCount))}
                </span>
              ) : null}
            </div>
            <ul className={css.thumbs}>
              {inlineRows.map((row, index) => (
                <li key={row.relativePath}>
                  <RankThumb
                    root={cwd}
                    row={row}
                    rank={index + 1}
                    onOpen={() => { openCompare(row.relativePath) }}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {canCompare ? (
          <div className={css.actions}>
            <Button variant="primary" size="sm" onClick={() => { openCompare() }}>
              {t('result.compare')}
            </Button>
            <span className={css.hint}>{t('result.compareHint')}</span>
          </div>
        ) : null}
      </div>
      {open && canCompare && meta !== undefined && cwd !== undefined ? (
        <PhotoPickCompareDialog
          root={cwd}
          meta={meta}
          {...(focusPath !== undefined ? { initialPath: focusPath } : {})}
          onClose={() => {
            setOpen(false)
            setFocusPath(undefined)
          }}
          t={t}
        />
      ) : null}
    </div>
  )
}

function RankThumb(props: {
  root: string
  row: PhotoPickRankRow
  rank: number
  onOpen: () => void
  t: (key: import('./locales.ts').PhotoPickUiKey) => string
}) {
  const { root, row, rank, onOpen, t } = props
  const [failed, setFailed] = useState(false)
  const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath
  return (
    <button
      type="button"
      className={css.thumbCard}
      title={`#${rank} · ${row.score} · ${row.relativePath}`}
      onClick={onOpen}
    >
      <span className={css.thumbFrame}>
        {!failed ? (
          <img
            className={css.thumbImg}
            src={`/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(row.relativePath)}`}
            alt=""
            loading="lazy"
            onError={() => { setFailed(true) }}
          />
        ) : (
          <span className={css.thumbFallback}>{t('panel.previewFailed')}</span>
        )}
        <span className={css.thumbRank}>#{rank}</span>
        <span className={css.thumbScore}>{row.score}</span>
      </span>
      <span className={css.thumbName}>{fileName}</span>
    </button>
  )
}
