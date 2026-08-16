/**
 * Photo-pick settings section UI.
 * @module dsh-photo-pick-ui/client/PhotoPickSection
 */

import { useEffect } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-web-react'
import type { PhotoPickUiKey } from './locales.ts'
import {
  encodeModelKey,
  type PhotoPickSettingsState,
  type PhotoPickSettingsStore,
  type PhotoPickVisionModelOption,
} from './store.ts'
import css from './PhotoPickSection.module.css'

/** Injected dependencies of {@link PhotoPickSection}. */
export interface PhotoPickSectionInjected {
  /** Page store. */
  controller: PhotoPickSettingsStore
  /** Bound snapshot selector. */
  useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>
  /** Localized copy. */
  t: (key: PhotoPickUiKey) => string
}

/** Props delivered by the slot outlet. */
export type PhotoPickSectionProps = Partial<PhotoPickSectionInjected>

/**
 * Render the photo-pick vision settings page.
 * @param props - inject face from the slot registration.
 */
export function PhotoPickSection(props: PhotoPickSectionProps) {
  if (props.controller === undefined || props.useSnapshot === undefined || props.t === undefined) {
    return null
  }
  return (
    <PhotoPickSectionReady
      controller={props.controller}
      useSnapshot={props.useSnapshot}
      t={props.t}
    />
  )
}

function PhotoPickSectionReady(props: {
  controller: PhotoPickSettingsStore
  useSnapshot: SnapshotSelectorHook<PhotoPickSettingsState>
  t: (key: PhotoPickUiKey) => string
}) {
  const { controller, useSnapshot, t } = props
  const state = useSnapshot(snapshot => snapshot)

  useEffect(() => {
    if (state.status === 'idle') void controller.load()
  }, [controller, state.status])

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className={css.section} />
  }

  if (state.status === 'error') {
    return (
      <div className={css.section}>
        <h2 className={css.title}>{t('title')}</h2>
        <p className={css.error}>{t('loadError')}</p>
        {state.error !== undefined ? <p className={css.hint}>{state.error}</p> : null}
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
    <div className={css.section}>
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>
      {!state.writable ? <p className={css.notice}>{t('readonly')}</p> : null}

      <label className={css.toggleRow}>
        <input
          type="checkbox"
          checked={state.draft.visionEnabled}
          disabled={disabled}
          onChange={(event) => { controller.edit('visionEnabled', event.target.checked) }}
        />
        <span>
          <span className={css.label}>{t('visionEnabled')}</span>
          <span className={css.hint}>{t('visionEnabledHint')}</span>
        </span>
      </label>

      <div className={css.field}>
        <label className={css.label} htmlFor="photo-pick-vision-model">{t('model')}</label>
        <select
          id="photo-pick-vision-model"
          className={css.input}
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
        <p className={css.hint}>{t('modelHint')}</p>
        {state.models.length === 0 ? <p className={css.notice}>{t('noModels')}</p> : null}
        {selectedMeta?.supportsVision === false ? (
          <p className={css.notice}>{t('textOnlyWarning')}</p>
        ) : null}
      </div>

      {state.error !== undefined ? <p className={css.error}>{state.error || t('saveError')}</p> : null}
      {state.notice === 'saved' ? <p className={css.saved}>{t('saved')}</p> : null}

      <div className={css.actions}>
        <Button
          variant="primary"
          disabled={disabled || !state.dirty}
          onClick={() => { void controller.save() }}
        >
          {t('save')}
        </Button>
        <Button
          variant="ghost"
          disabled={disabled || !state.dirty}
          onClick={() => { controller.discard() }}
        >
          {t('discard')}
        </Button>
      </div>
    </div>
  )
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
