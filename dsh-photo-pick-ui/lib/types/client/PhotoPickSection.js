import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Photo-pick settings section UI.
 * @module dsh-photo-pick-ui/client/PhotoPickSection
 */
import { useEffect } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { encodeModelKey, } from "./store.js";
import css from './PhotoPickSection.module.css';
/**
 * Render the photo-pick vision settings page.
 * @param props - inject face from the slot registration.
 */
export function PhotoPickSection(props) {
    if (props.controller === undefined || props.useSnapshot === undefined || props.t === undefined) {
        return null;
    }
    return (_jsx(PhotoPickSectionReady, { controller: props.controller, useSnapshot: props.useSnapshot, t: props.t }));
}
function PhotoPickSectionReady(props) {
    const { controller, useSnapshot, t } = props;
    const state = useSnapshot(snapshot => snapshot);
    useEffect(() => {
        if (state.status === 'idle')
            void controller.load();
    }, [controller, state.status]);
    if (state.status === 'loading' || state.status === 'idle') {
        return _jsx("div", { className: css.section });
    }
    if (state.status === 'error') {
        return (_jsxs("div", { className: css.section, children: [_jsx("h2", { className: css.title, children: t('title') }), _jsx("p", { className: css.error, children: t('loadError') }), state.error !== undefined ? _jsx("p", { className: css.hint, children: state.error }) : null, _jsx(Button, { variant: "outline", onClick: () => { void controller.load(); }, children: t('retry') })] }));
    }
    const disabled = !state.writable || state.saving;
    const selected = state.draft.visionLlmProvider.length > 0 && state.draft.visionModel.length > 0
        ? encodeModelKey(state.draft.visionLlmProvider, state.draft.visionModel)
        : '';
    const selectedMeta = state.models.find(model => (model.provider === state.draft.visionLlmProvider && model.id === state.draft.visionModel));
    const groups = groupModels(state.models);
    return (_jsxs("div", { className: css.section, children: [_jsx("h2", { className: css.title, children: t('title') }), _jsx("p", { className: css.intro, children: t('intro') }), !state.writable ? _jsx("p", { className: css.notice, children: t('readonly') }) : null, _jsxs("label", { className: css.toggleRow, children: [_jsx("input", { type: "checkbox", checked: state.draft.visionEnabled, disabled: disabled, onChange: (event) => { controller.edit('visionEnabled', event.target.checked); } }), _jsxs("span", { children: [_jsx("span", { className: css.label, children: t('visionEnabled') }), _jsx("span", { className: css.hint, children: t('visionEnabledHint') })] })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { className: css.label, htmlFor: "photo-pick-vision-model", children: t('model') }), _jsxs("select", { id: "photo-pick-vision-model", className: css.input, value: selected, disabled: disabled || state.models.length === 0, onChange: (event) => { controller.selectModel(event.target.value); }, children: [_jsx("option", { value: "", children: t('modelPlaceholder') }), groups.map(group => (_jsx("optgroup", { label: group.label, children: group.models.map(model => (_jsx("option", { value: encodeModelKey(model.provider, model.id), children: formatModelLabel(model, t) }, encodeModelKey(model.provider, model.id)))) }, group.provider)))] }), _jsx("p", { className: css.hint, children: t('modelHint') }), state.models.length === 0 ? _jsx("p", { className: css.notice, children: t('noModels') }) : null, selectedMeta?.supportsVision === false ? (_jsx("p", { className: css.notice, children: t('textOnlyWarning') })) : null] }), state.error !== undefined ? _jsx("p", { className: css.error, children: state.error || t('saveError') }) : null, state.notice === 'saved' ? _jsx("p", { className: css.saved, children: t('saved') }) : null, _jsxs("div", { className: css.actions, children: [_jsx(Button, { variant: "primary", disabled: disabled || !state.dirty, onClick: () => { void controller.save(); }, children: t('save') }), _jsx(Button, { variant: "ghost", disabled: disabled || !state.dirty, onClick: () => { controller.discard(); }, children: t('discard') })] })] }));
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
//# sourceMappingURL=PhotoPickSection.js.map