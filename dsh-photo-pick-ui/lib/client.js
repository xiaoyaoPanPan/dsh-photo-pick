window.__ModuleLoader__.load({
	id: "dsh-photo-pick-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_web_react = require("@deepseek-ai/dsh-client-web-react");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/store.ts
		/**
		* Object-layer store for the photo-pick settings page (Host catalog model picker).
		* Adapted from `dsh-media-ui/client/store`.
		* @module dsh-photo-pick-ui/client/store
		*/
		const EMPTY_DRAFT = {
			visionEnabled: true,
			visionLlmProvider: "",
			visionModel: "",
			visionScorePrompt: ""
		};
		const SETTINGS_PATH = "/api/photo-pick/settings";
		/** Encode provider + model for a `<select>` option value. */
		function encodeModelKey(provider, model) {
			return `${provider}\u001f${model}`;
		}
		/** Decode a `<select>` option value into provider + model. */
		function decodeModelKey(key) {
			const sep = key.indexOf("");
			if (sep <= 0 || sep >= key.length - 1) return void 0;
			return {
				provider: key.slice(0, sep),
				model: key.slice(sep + 1)
			};
		}
		/**
		* Loads and saves photo-pick vision settings (model + scoring prompt).
		*/
		var PhotoPickSettingsStore = class {
			store;
			constructor() {
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
					status: "idle",
					writable: true,
					models: [],
					defaultVisionScorePrompt: "",
					visionScoreJsonSuffix: "",
					draft: { ...EMPTY_DRAFT },
					baseline: { ...EMPTY_DRAFT },
					dirty: false,
					saving: false
				});
			}
			/** Fetch Host settings and LLM catalog options. */
			async load() {
				this.setStatusLoading();
				try {
					const view = await fetchSettings();
					const draft = {
						visionEnabled: view.visionEnabled,
						visionLlmProvider: view.visionLlmProvider,
						visionModel: view.visionModel,
						visionScorePrompt: view.visionScorePrompt
					};
					this.store.set({
						status: "ready",
						writable: view.writable,
						models: view.models,
						defaultVisionScorePrompt: view.defaultVisionScorePrompt,
						visionScoreJsonSuffix: view.visionScoreJsonSuffix,
						draft,
						baseline: { ...draft },
						dirty: false,
						saving: false
					});
				} catch (error) {
					this.store.set({
						...this.store.getSnapshot(),
						status: "error",
						error: error instanceof Error ? error.message : String(error),
						saving: false
					});
				}
			}
			/**
			* Stage one draft field.
			* @param field - draft key.
			* @param value - next value.
			*/
			edit(field, value) {
				const snap = this.store.getSnapshot();
				if (snap.status !== "ready" || snap.saving) return;
				this.publishDraft(snap, {
					...snap.draft,
					[field]: value
				});
			}
			/**
			* Select a catalog model (provider + id).
			* @param key - {@link encodeModelKey} value, or empty to clear.
			*/
			selectModel(key) {
				const snap = this.store.getSnapshot();
				if (snap.status !== "ready" || snap.saving) return;
				if (key.length === 0) {
					this.publishDraft(snap, {
						...snap.draft,
						visionLlmProvider: "",
						visionModel: ""
					});
					return;
				}
				const decoded = decodeModelKey(key);
				if (decoded === void 0) return;
				this.publishDraft(snap, {
					...snap.draft,
					visionLlmProvider: decoded.provider,
					visionModel: decoded.model
				});
			}
			/** Drop staged edits. */
			discard() {
				const snap = this.store.getSnapshot();
				if (snap.status !== "ready") return;
				this.publishDraft(snap, { ...snap.baseline }, false);
			}
			/** Clear the custom scoring prompt (revert to built-in default). */
			resetPrompt() {
				this.edit("visionScorePrompt", "");
			}
			/** Persist settings HTTP body. */
			async save() {
				const snap = this.store.getSnapshot();
				if (snap.status !== "ready" || !snap.dirty || snap.saving) return;
				this.store.set({
					status: snap.status,
					writable: snap.writable,
					models: snap.models,
					defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
					visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
					draft: snap.draft,
					baseline: snap.baseline,
					dirty: snap.dirty,
					saving: true
				});
				try {
					const { draft } = this.store.getSnapshot();
					const view = await putSettings({
						visionEnabled: draft.visionEnabled,
						visionLlmProvider: draft.visionLlmProvider.trim(),
						visionModel: draft.visionModel.trim(),
						visionScorePrompt: draft.visionScorePrompt
					});
					const nextDraft = {
						visionEnabled: view.visionEnabled,
						visionLlmProvider: view.visionLlmProvider,
						visionModel: view.visionModel,
						visionScorePrompt: view.visionScorePrompt
					};
					this.store.set({
						status: "ready",
						writable: view.writable,
						models: view.models,
						defaultVisionScorePrompt: view.defaultVisionScorePrompt,
						visionScoreJsonSuffix: view.visionScoreJsonSuffix,
						draft: nextDraft,
						baseline: { ...nextDraft },
						dirty: false,
						saving: false,
						notice: "saved"
					});
				} catch (error) {
					this.store.set({
						...this.store.getSnapshot(),
						saving: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
			publishDraft(snap, draft, dirty = !sameDraft(draft, snap.baseline)) {
				const next = {
					status: snap.status,
					writable: snap.writable,
					models: snap.models,
					defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
					visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
					draft,
					baseline: snap.baseline,
					dirty,
					saving: snap.saving
				};
				if (snap.error !== void 0) next.error = snap.error;
				this.store.set(next);
			}
			setStatusLoading() {
				const snap = this.store.getSnapshot();
				this.store.set({
					status: "loading",
					writable: snap.writable,
					models: snap.models,
					defaultVisionScorePrompt: snap.defaultVisionScorePrompt,
					visionScoreJsonSuffix: snap.visionScoreJsonSuffix,
					draft: snap.draft,
					baseline: snap.baseline,
					dirty: snap.dirty,
					saving: false
				});
			}
		};
		function sameDraft(a, b) {
			return a.visionEnabled === b.visionEnabled && a.visionLlmProvider === b.visionLlmProvider && a.visionModel === b.visionModel && a.visionScorePrompt === b.visionScorePrompt;
		}
		async function fetchSettings() {
			const response = await fetch(SETTINGS_PATH, { credentials: "same-origin" });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		}
		async function putSettings(body) {
			const response = await fetch(SETTINGS_PATH, {
				method: "PUT",
				credentials: "same-origin",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				let detail = `HTTP ${response.status}`;
				try {
					const err = await response.json();
					if (typeof err.error === "string") detail = err.error;
				} catch {}
				throw new Error(detail);
			}
			return await response.json();
		}
		//#endregion
		//#region \0dsh-css:E:\Develop-MyProject\deepseek-harness-xy\xy-dev\plugins\photo-pick\dsh-photo-pick-ui\src\client\PhotoPickSection.module.css.mjs
		const css$3 = "._4rAE_a_section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;padding:4px 2px 8px;display:flex}._4rAE_a_title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:600;line-height:24px}._4rAE_a_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}._4rAE_a_notice{color:var(--dsw-alias-state-warn-label);background:0 0;border:none;border-radius:0;margin:0;padding:0;font-size:12px;line-height:18px}._4rAE_a_saved{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px;line-height:18px}._4rAE_a_error{color:var(--dsw-alias-label-error);margin:0;font-size:12px;line-height:18px}._4rAE_a_toggleRow{cursor:pointer;background:0 0;border:none;border-radius:0;align-items:flex-start;gap:10px;padding:8px 0;display:flex}._4rAE_a_toggleRow input{margin-top:3px}._4rAE_a_field{border:none;border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent);background:0 0;border-radius:0;flex-direction:column;gap:6px;padding:10px 0;display:flex}._4rAE_a_label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:1.5}._4rAE_a_input{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 70%, transparent);background:var(--dsw-alias-bg-layer-1);height:32px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:4px;padding:0 10px;font-size:13px;line-height:1.5;transition:border-color .1s}._4rAE_a_input:focus-visible{border-color:var(--dsw-alias-brand-primary);box-shadow:none;outline:none}._4rAE_a_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}._4rAE_a_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5;display:block}._4rAE_a_actions{gap:8px;padding-top:8px;display:flex}";
		const tagId$3 = "dsh-photo-pick-ui/PhotoPickSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-photo-pick-ui";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var PhotoPickSection_module_css_default = {
			"error": "_4rAE_a_error",
			"input": "_4rAE_a_input",
			"hint": "_4rAE_a_hint",
			"label": "_4rAE_a_label",
			"actions": "_4rAE_a_actions",
			"title": "_4rAE_a_title",
			"section": "_4rAE_a_section",
			"field": "_4rAE_a_field",
			"toggleRow": "_4rAE_a_toggleRow",
			"intro": "_4rAE_a_intro",
			"saved": "_4rAE_a_saved",
			"notice": "_4rAE_a_notice"
		};
		//#endregion
		//#region src/client/PhotoPickSection.tsx
		/**
		* Photo-pick settings section UI.
		* @module dsh-photo-pick-ui/client/PhotoPickSection
		*/
		/**
		* Render the photo-pick vision settings page.
		* @param props - inject face from the slot registration.
		*/
		function PhotoPickSection(props) {
			if (props.controller === void 0 || props.useSnapshot === void 0 || props.t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PhotoPickSectionReady, {
				controller: props.controller,
				useSnapshot: props.useSnapshot,
				t: props.t
			});
		}
		function PhotoPickSectionReady(props) {
			const { controller, useSnapshot, t } = props;
			const state = useSnapshot((snapshot) => snapshot);
			(0, react.useEffect)(() => {
				if (state.status === "idle") controller.load();
			}, [controller, state.status]);
			if (state.status === "loading" || state.status === "idle") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: PhotoPickSection_module_css_default.section });
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: PhotoPickSection_module_css_default.title,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.error,
						children: t("loadError")
					}),
					state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.hint,
						children: state.error
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							controller.load();
						},
						children: t("retry")
					})
				]
			});
			const disabled = !state.writable || state.saving;
			const selected = state.draft.visionLlmProvider.length > 0 && state.draft.visionModel.length > 0 ? encodeModelKey(state.draft.visionLlmProvider, state.draft.visionModel) : "";
			const selectedMeta = state.models.find((model) => model.provider === state.draft.visionLlmProvider && model.id === state.draft.visionModel);
			const groups = groupModels$1(state.models);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: PhotoPickSection_module_css_default.title,
						children: t("title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.intro,
						children: t("intro")
					}),
					!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.notice,
						children: t("readonly")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickSection_module_css_default.toggleRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: state.draft.visionEnabled,
							disabled,
							onChange: (event) => {
								controller.edit("visionEnabled", event.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickSection_module_css_default.label,
							children: t("visionEnabled")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickSection_module_css_default.hint,
							children: t("visionEnabledHint")
						})] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickSection_module_css_default.field,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: PhotoPickSection_module_css_default.label,
								htmlFor: "photo-pick-vision-model",
								children: t("model")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								id: "photo-pick-vision-model",
								className: PhotoPickSection_module_css_default.input,
								value: selected,
								disabled: disabled || state.models.length === 0,
								onChange: (event) => {
									controller.selectModel(event.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("modelPlaceholder")
								}), groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
									label: group.label,
									children: group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: encodeModelKey(model.provider, model.id),
										children: formatModelLabel$1(model, t)
									}, encodeModelKey(model.provider, model.id)))
								}, group.provider))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickSection_module_css_default.hint,
								children: t("modelHint")
							}),
							state.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickSection_module_css_default.notice,
								children: t("noModels")
							}) : null,
							selectedMeta?.supportsVision === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickSection_module_css_default.notice,
								children: t("textOnlyWarning")
							}) : null
						]
					}),
					state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.error,
						children: state.error || t("saveError")
					}) : null,
					state.notice === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickSection_module_css_default.saved,
						children: t("saved")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickSection_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: disabled || !state.dirty,
							onClick: () => {
								controller.save();
							},
							children: t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							disabled: disabled || !state.dirty,
							onClick: () => {
								controller.discard();
							},
							children: t("discard")
						})]
					})
				]
			});
		}
		function groupModels$1(models) {
			const order = [];
			const map = /* @__PURE__ */ new Map();
			for (const model of models) {
				let group = map.get(model.provider);
				if (group === void 0) {
					group = {
						provider: model.provider,
						label: model.providerName || model.provider,
						models: []
					};
					map.set(model.provider, group);
					order.push(model.provider);
				}
				group.models.push(model);
			}
			return order.map((id) => map.get(id));
		}
		function formatModelLabel$1(model, t) {
			if (model.supportsVision === true) return `${model.name} · ${t("visionCapable")}`;
			if (model.supportsVision === false) return `${model.name} · ${t("textOnly")}`;
			return model.name;
		}
		//#endregion
		//#region src/client/preset.ts
		/** Agent preset id shipped by `dsh-photo-pick-app`. */
		const PHOTO_PICK_AGENT_PRESET_ID = "photo-pick";
		//#endregion
		//#region src/client/criteria-presets.ts
		/** Built-in chip catalog (order = UI order). */
		const CRITERIA_PRESET_IDS = [
			"noLegs",
			"halfBody",
			"headUpperThird",
			"eyesOpen",
			"naturalSmile",
			"frontFacing",
			"cleanBackground",
			"noHeadCrop"
		];
		/**
		* Split criteria text into comparable clauses.
		* Accepts Chinese fullwidth `；`, ASCII `;`, and newlines as separators.
		* @param text - raw criteria draft.
		*/
		function splitCriteriaClauses(text) {
			return text.split(/[；;\n]+/u).map((part) => part.trim()).filter((part) => part.length > 0);
		}
		/**
		* Join clauses with a Chinese fullwidth semicolon (readable in both locales).
		* @param clauses - trimmed non-empty clauses.
		*/
		function joinCriteriaClauses(clauses) {
			return clauses.join("；");
		}
		/**
		* Whether the draft already contains this preset clause (exact clause match).
		* @param draft - current criteria text.
		* @param clause - preset insert text.
		*/
		function criteriaHasClause(draft, clause) {
			const want = clause.trim();
			if (want.length === 0) return false;
			return splitCriteriaClauses(draft).includes(want);
		}
		/**
		* Toggle one preset clause in/out of the draft (multi-select).
		* @param draft - current criteria text.
		* @param clause - preset insert text to add or remove.
		* @returns updated draft.
		*/
		function toggleCriteriaClause(draft, clause) {
			const want = clause.trim();
			if (want.length === 0) return draft.trim();
			const parts = splitCriteriaClauses(draft);
			const index = parts.indexOf(want);
			if (index >= 0) return joinCriteriaClauses(parts.filter((_, i) => i !== index));
			return joinCriteriaClauses([...parts, want]);
		}
		/**
		* Build the composer draft for Confirm-to-chat.
		* When criteria is non-empty, uses {@link opts.leadWithCriteria} and inserts a
		* labeled criteria line; otherwise uses {@link opts.lead} with no criteria talk.
		* @param opts - lead copy, paths, and optional per-batch criteria.
		*/
		function buildConfirmDraft(opts) {
			const criteria = opts.criteria?.trim() ?? "";
			const criteriaLead = opts.criteriaLead?.trim() ?? "";
			const hasCriteria = criteria.length > 0 && criteriaLead.length > 0;
			const lines = [hasCriteria ? opts.leadWithCriteria : opts.lead];
			if (hasCriteria) lines.push(`${criteriaLead}${criteria}`);
			for (const path of opts.paths) lines.push(`- ${path}`);
			return lines.join("\n");
		}
		//#endregion
		//#region src/client/criteria-history.ts
		/**
		* Browser-local history + draft for per-batch photo-pick criteria.
		* @module dsh-photo-pick-ui/client/criteria-history
		*/
		/** localStorage key for recent criteria strings. */
		const CRITERIA_HISTORY_KEY = "dsh-photo-pick.criteria-history";
		/** sessionStorage key for the in-progress criteria draft. */
		const CRITERIA_DRAFT_KEY = "dsh-photo-pick.criteria-draft";
		/**
		* Read the session criteria draft (empty when missing / unavailable).
		*/
		function loadCriteriaDraft() {
			try {
				return sessionStorage.getItem("dsh-photo-pick.criteria-draft") ?? "";
			} catch {
				return "";
			}
		}
		/**
		* Persist the session criteria draft.
		* @param text - current textarea value.
		*/
		function saveCriteriaDraft(text) {
			try {
				sessionStorage.setItem(CRITERIA_DRAFT_KEY, text);
			} catch {}
		}
		/**
		* Load recent criteria strings (newest first).
		*/
		function loadCriteriaHistory() {
			try {
				const raw = localStorage.getItem(CRITERIA_HISTORY_KEY);
				if (raw === null || raw.length === 0) return [];
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return [];
				return parsed.filter((item) => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 20);
			} catch {
				return [];
			}
		}
		/**
		* Remember a non-empty criteria string (dedupe, newest first).
		* @param text - criteria used for Confirm-to-chat.
		* @returns updated history list.
		*/
		function rememberCriteria(text) {
			const trimmed = text.trim();
			if (trimmed.length === 0) return loadCriteriaHistory();
			const next = [trimmed, ...loadCriteriaHistory().filter((item) => item !== trimmed)].slice(0, 20);
			try {
				localStorage.setItem(CRITERIA_HISTORY_KEY, JSON.stringify(next));
			} catch {}
			return next;
		}
		//#endregion
		//#region \0dsh-css:E:\Develop-MyProject\deepseek-harness-xy\xy-dev\plugins\photo-pick\dsh-photo-pick-ui\src\client\PhotoPickConfigPanel.module.css.mjs
		const css$2 = ".wdCfKq_root{align-items:center;display:inline-flex;position:relative}.wdCfKq_trigger{max-width:160px;min-height:22px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;text-overflow:ellipsis;background:0 0;border:none;border-radius:4px;align-items:center;gap:4px;padding:0 8px;font-family:inherit;font-size:12px;font-weight:550;line-height:22px;transition:background .1s,color .1s;display:inline-flex;overflow:hidden}.wdCfKq_trigger:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary);border-color:#0000}.wdCfKq_trigger[data-active]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:#0000}.wdCfKq_triggerComposer{max-width:148px;min-height:30px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;text-overflow:ellipsis;background:0 0;border:none;border-radius:4px;align-items:center;gap:5px;padding:0 10px;font-family:inherit;font-size:12px;font-weight:550;line-height:20px;transition:background .1s,color .1s;display:inline-flex;overflow:hidden}.wdCfKq_triggerComposer:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary);border-color:#0000}.wdCfKq_triggerComposer[data-active]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);box-shadow:none;border-color:#0000}.wdCfKq_dialog{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:0;width:min(1680px,98vw);height:min(94vh,1080px);max-height:min(94vh,1080px);padding:0;box-shadow:0 16px 48px #00000047,0 2px 8px #0000001f}.wdCfKq_criteriaStepDialog{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:0;width:min(560px,94vw);max-height:min(84vh,720px);padding:0;box-shadow:0 16px 48px #00000047,0 2px 8px #0000001f}.wdCfKq_criteriaStepShell{flex-direction:column;min-height:0;max-height:min(84vh,720px);display:flex;overflow:hidden}.wdCfKq_criteriaStepHeader{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex:none;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;min-height:40px;padding:0 4px 0 16px;display:grid}.wdCfKq_criteriaStepHeaderStart{justify-self:start;min-width:0}.wdCfKq_criteriaStepHeaderEnd{justify-self:end}.wdCfKq_criteriaStepStep{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.wdCfKq_criteriaStepTitle{text-align:center;color:var(--dsw-alias-label-primary);justify-self:center;margin:0;font-size:13px;font-weight:600;line-height:20px}.wdCfKq_criteriaStepBody{flex-direction:column;flex:auto;gap:12px;min-height:0;padding:14px 16px;display:flex;overflow:auto}.wdCfKq_criteriaStepFooter{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex:none;justify-content:flex-end;align-items:center;gap:8px;padding:10px 16px;display:flex}.wdCfKq_dialogShell{flex-direction:column;flex:auto;height:100%;min-height:0;display:flex;overflow:hidden}.wdCfKq_dialogHeader{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);background:0 0;flex:none;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;min-height:40px;padding:0 4px 0 16px;display:grid}.wdCfKq_dialogHeaderStart{justify-self:start;align-items:center;gap:10px;min-width:0;display:inline-flex}.wdCfKq_dialogHeaderEnd{justify-content:flex-end;justify-self:end;align-items:center;gap:4px;min-width:0;display:inline-flex}.wdCfKq_dialogTitle{text-align:center;min-width:0;color:var(--dsw-alias-label-primary);justify-self:center;margin:0;font-size:13px;font-weight:600;line-height:20px}.wdCfKq_dialogClose{cursor:pointer;width:46px;height:40px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:0;flex:none;justify-content:center;align-items:center;transition:background .1s,color .1s;display:inline-flex}.wdCfKq_dialogClose:hover{color:#fff;background:#c42b1c}.wdCfKq_dialogBody{flex-direction:column;flex:1 1 0;min-height:0;display:flex;overflow:hidden}.wdCfKq_body{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:1 1 0;gap:0;min-height:0;padding:0;display:flex;position:relative;overflow:hidden}.wdCfKq_layout{flex-direction:row;flex:1 1 0;align-items:stretch;gap:0;min-height:0;padding-bottom:0;display:flex;overflow:hidden}@media (width<=900px){.wdCfKq_layout{flex-direction:column;overflow:auto}.wdCfKq_configCol{flex:none;width:auto;max-height:min(48vh,420px)}}.wdCfKq_configCol{border:none;border-right:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 50%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 72%, var(--dsw-alias-bg-layer-1));width:clamp(288px,23vw,340px);min-width:268px;min-height:0;box-shadow:none;border-radius:0;flex-direction:column;flex:0 0 clamp(288px,23vw,340px);padding:10px 12px 8px;font-size:13px;line-height:20px;display:flex;overflow:hidden}.wdCfKq_configScroll{overscroll-behavior:contain;flex-direction:column;flex:auto;gap:0;min-height:0;padding-right:2px;display:flex;overflow:hidden auto}.wdCfKq_configSection{border:none;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent);box-shadow:none;background:0 0;border-radius:0;flex-direction:column;gap:8px;margin:0;padding:10px 2px 12px;display:flex}.wdCfKq_configSection:focus-within{border-bottom-color:color-mix(in srgb, var(--dsw-alias-border-l2) 55%, transparent);box-shadow:none}.wdCfKq_configSection:first-child{padding-top:4px}.wdCfKq_configSection:last-child{border-bottom:none;padding-bottom:4px}.wdCfKq_configSectionTitle{min-width:0;color:var(--dsw-alias-label-primary);text-align:left;flex:auto;font-size:13px;font-weight:650;line-height:20px}.wdCfKq_configSectionHead{width:100%;color:inherit;font:inherit;cursor:pointer;text-align:left;background:0 0;border:none;border-radius:8px;align-items:center;gap:6px;margin:0;padding:2px;display:flex}.wdCfKq_configSectionHead:hover{background:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover-solid) 70%, transparent)}.wdCfKq_configSectionHead:hover .wdCfKq_configSectionTitle{color:var(--dsw-alias-label-primary)}.wdCfKq_configSectionHead:hover .wdCfKq_foldChevron{color:var(--dsw-alias-label-secondary)}.wdCfKq_configCol .wdCfKq_note,.wdCfKq_configCol .wdCfKq_notice,.wdCfKq_configCol .wdCfKq_error,.wdCfKq_configCol .wdCfKq_toggleLabel,.wdCfKq_configCol .wdCfKq_select{font-size:13px;line-height:20px}.wdCfKq_configCol .wdCfKq_detailLabel,.wdCfKq_configCol .wdCfKq_defaultPrompt,.wdCfKq_configCol .wdCfKq_promptInput,.wdCfKq_configCol .wdCfKq_transcript{font-size:12px;line-height:18px}.wdCfKq_filesCol{background:0 0;border:none;border-radius:0;flex-direction:column;flex:auto;gap:10px;min-width:0;min-height:0;padding:12px 16px 8px;display:flex;overflow:hidden}.wdCfKq_filesHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;display:flex}.wdCfKq_filesHeadLeft{align-items:center;gap:8px;min-width:0;display:flex}.wdCfKq_filesHeadRight{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;display:flex}.wdCfKq_filesBackBtn{min-height:28px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;align-items:center;gap:2px;padding:0 10px 0 6px;font-size:12px;font-weight:550;line-height:18px;transition:background .1s;display:inline-flex}.wdCfKq_filesBackBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_filesBackBtn:disabled{opacity:.45;cursor:default}.wdCfKq_filesSort{align-items:center;gap:6px;min-width:0;display:inline-flex}.wdCfKq_filesSortLabel{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px;line-height:18px}.wdCfKq_filesSortSelect{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);max-width:160px;min-height:28px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:2px 8px;font-size:12px;line-height:18px}.wdCfKq_filesViewToggle{background:0 0;border:none;border-radius:4px;align-items:center;gap:0;padding:0;display:inline-flex}.wdCfKq_filesViewBtn{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:550;line-height:18px;transition:background .1s,color .1s}.wdCfKq_filesViewBtn:hover:not([data-active]){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_filesViewBtn[data-active]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);box-shadow:none}.wdCfKq_filesBody{flex-direction:row;flex:auto;gap:12px;min-height:0;display:flex;overflow:hidden}.wdCfKq_tagSidebar{border-right:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 80%, transparent);flex-direction:column;flex:0 0 clamp(200px,28%,320px);min-width:180px;max-width:340px;min-height:0;padding:8px 10px 8px 0;display:flex}.wdCfKq_tagSidebarChips{flex-wrap:wrap;flex:auto;align-content:flex-start;gap:6px;min-height:0;padding-right:2px;display:flex;overflow:hidden auto}.wdCfKq_tagFilterChip{max-width:100%;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;align-items:center;gap:4px;padding:3px 9px;font-size:11px;line-height:16px;transition:background .1s,color .1s;display:inline-flex}.wdCfKq_tagFilterChip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid);border-color:#0000}.wdCfKq_tagFilterChip[data-active]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);box-shadow:none;border-color:#0000;font-weight:600}.wdCfKq_tagFilterChipName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.wdCfKq_tagFilterChipCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none}.wdCfKq_tagFilterChip[data-active] .wdCfKq_tagFilterChipCount{color:var(--dsw-alias-label-secondary)}.wdCfKq_filesMain{flex-direction:column;flex:auto;gap:10px;min-width:0;min-height:0;display:flex;overflow:hidden}.wdCfKq_filesCount{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.wdCfKq_headToggle{border:1px solid var(--dsw-alias-border-l2);min-height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;flex:none;align-items:center;gap:2px;padding:0 6px 0 8px;font-size:12px;line-height:18px;display:inline-flex}.wdCfKq_headToggle:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_headToggle[data-active]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.wdCfKq_headToggle[data-filtered]:not([data-active]){border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l2));color:var(--dsw-alias-label-primary)}.wdCfKq_filesPathBar{flex:none;align-items:center;gap:8px;min-width:0;display:flex}.wdCfKq_breadcrumb{flex-wrap:wrap;flex:auto;align-items:center;gap:4px;min-width:0;font-size:12px;line-height:18px;display:flex}.wdCfKq_breadcrumbCrumb{font:inherit;color:var(--dsw-alias-brand-primary);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:none;max-width:140px;padding:0;overflow:hidden}.wdCfKq_breadcrumbCrumb:disabled{color:var(--dsw-alias-label-primary);cursor:default}.wdCfKq_breadcrumbSep{color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary));flex:none}.wdCfKq_breadcrumbItem{align-items:center;gap:4px;min-width:0;display:inline-flex}.wdCfKq_folderItem{align-self:start;min-width:0;list-style:none}.wdCfKq_folderCard{background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 80%, transparent);width:100%;min-height:184px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;text-align:center;outline-offset:-2px;border:none;border-radius:4px;outline:2px solid #0000;flex-direction:column;justify-content:center;align-items:stretch;gap:8px;padding:16px 12px;transition:background .1s,outline-color .1s;display:flex}.wdCfKq_folderCard:hover{background:var(--dsw-alias-interactive-bg-hover-solid);outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent);box-shadow:none;border-style:none;transform:none}.wdCfKq_folderIcon{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, var(--dsw-alias-bg-layer-3));width:36px;height:28px;box-shadow:inset 0 8px 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);border-radius:4px 4px 2px 2px;margin:0 auto}.wdCfKq_folderName{word-break:break-all;font-size:12px;font-weight:600;line-height:18px}.wdCfKq_grid{flex:1;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));grid-auto-rows:max-content;align-content:start;gap:12px;min-height:0;margin:0;padding:0 2px 8px;list-style:none;display:grid;overflow:hidden auto}.wdCfKq_card{z-index:0;background:var(--dsw-alias-bg-layer-2);outline-offset:-2px;border:none;border-radius:4px;outline:2px solid #0000;flex-direction:column;align-self:start;width:100%;min-width:0;height:max-content;transition:outline-color .1s,background .1s;display:flex;position:relative;overflow:hidden}.wdCfKq_card:hover{outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);box-shadow:none;transform:none}.wdCfKq_cardActive,.wdCfKq_cardProcessing{outline-color:var(--dsw-alias-brand-primary);box-shadow:none;transform:none}.wdCfKq_thumbButton{background:var(--dsw-alias-bg-layer-3);cursor:pointer;border:none;flex:none;width:100%;height:148px;padding:0;display:block;position:relative;overflow:hidden}.wdCfKq_thumbButton:disabled{cursor:default}.wdCfKq_thumb{object-fit:cover;width:100%;height:100%;display:block}.wdCfKq_card:hover .wdCfKq_thumb{transform:none}.wdCfKq_thumbFallback{box-sizing:border-box;text-align:center;width:100%;height:100%;color:var(--dsw-alias-label-tertiary);justify-content:center;align-items:center;padding:12px;font-size:11px;line-height:16px;display:flex}.wdCfKq_thumbSpinner{border:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;width:14px;height:14px;animation:.7s linear infinite wdCfKq_mediaSpin;position:absolute;top:8px;right:8px}.wdCfKq_thumbProcessingOverlay{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, #00000073);pointer-events:none;flex-direction:column;justify-content:center;align-items:center;gap:8px;display:flex;position:absolute;inset:0}.wdCfKq_thumbProcessingSpinner{border:3px solid #ffffff59;border-top-color:#fff;border-radius:50%;width:28px;height:28px;animation:.7s linear infinite wdCfKq_mediaSpin}.wdCfKq_thumbProcessingBadge{color:#fff;letter-spacing:.02em;background:#00000073;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;line-height:16px}.wdCfKq_cardBody{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);flex-direction:column;flex:none;min-width:0;display:flex}.wdCfKq_cardFoot{box-sizing:border-box;width:100%;min-width:0;min-height:36px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:6px;padding:6px 8px;display:flex}.wdCfKq_cardFoot:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_cardTitle{text-align:left;min-width:0;color:inherit;font:inherit;pointer-events:none;background:0 0;border:none;flex:auto;align-items:center;gap:6px;padding:0;display:flex}.wdCfKq_cardPath{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary);flex:auto;font-size:11px;line-height:16px;overflow:hidden}.wdCfKq_cardMetaInline{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;align-items:center;gap:4px;font-size:11px;line-height:16px;display:inline-flex}.wdCfKq_cardKind{flex:none}.wdCfKq_cardRetag{flex:none;min-height:24px!important;padding-inline:6px!important;font-size:11px!important;line-height:16px!important}.wdCfKq_cardCheck{cursor:pointer;flex:none;align-items:center;display:inline-flex}.wdCfKq_cardActions{display:none}.wdCfKq_lightbox{z-index:1100;justify-content:center;align-items:center;padding:16px;display:flex;position:fixed;inset:0}.wdCfKq_lightboxMask{backdrop-filter:blur(8px);cursor:pointer;background:#00000073;border:none;position:absolute;inset:0}.wdCfKq_lightboxCard{z-index:1;border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent);background:var(--dsw-alias-bg-layer-1);border-radius:8px;flex-direction:column;gap:0;width:min(1280px,96vw);height:min(92vh,920px);max-height:100%;padding:0;display:flex;position:relative;overflow:hidden;box-shadow:0 16px 48px #00000047,0 2px 8px #0000001f}.wdCfKq_lightboxHead{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex:none;justify-content:space-between;align-items:center;gap:8px;min-height:40px;padding:0 8px 0 12px;display:flex}.wdCfKq_lightboxTabs{flex:none;gap:2px;display:flex}.wdCfKq_lightboxTab{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:4px 10px;font-size:12px;line-height:18px}.wdCfKq_lightboxTab[data-active]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:#0000}.wdCfKq_lightboxZoom{flex:none;align-items:center;gap:6px;display:flex}.wdCfKq_lightboxZoomValue{text-align:center;min-width:44px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.wdCfKq_lightboxHint{color:var(--dsw-alias-label-tertiary);flex:none;margin:0;padding:4px 12px 8px;font-size:11px;line-height:16px}.wdCfKq_lightboxSplit{flex:auto;grid-template-columns:1fr;gap:0;min-height:0;padding:8px 12px 12px;transition:grid-template-columns .16s;display:grid}.wdCfKq_lightboxSplit[data-log-open]{grid-template-columns:minmax(0,1.15fr) minmax(280px,1fr);gap:12px}.wdCfKq_lightboxPreviewPane,.wdCfKq_lightboxLogPane{flex-direction:column;gap:8px;min-width:0;min-height:0;display:flex;overflow:hidden}.wdCfKq_lightboxLogPane{border:none;border-left:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);background:0 0;border-radius:0;padding:8px 0 0 12px;overflow:auto}.wdCfKq_lightboxLog{flex-direction:column;gap:10px;display:flex}.wdCfKq_logField{color:var(--dsw-alias-label-primary);word-break:break-word;grid-template-columns:88px minmax(0,1fr);align-items:start;gap:8px;font-size:12px;line-height:18px;display:grid}.wdCfKq_logBlock{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:4px;font-size:12px;line-height:18px;display:flex}.wdCfKq_lightboxViewport{background:var(--dsw-alias-bg-layer-3);cursor:grab;touch-action:none;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:8px;flex:auto;place-items:center;min-height:0;display:grid;overflow:auto}.wdCfKq_lightboxViewport[data-dragging]{cursor:grabbing}.wdCfKq_lightboxImage{user-select:none;pointer-events:none;max-width:none;display:block}.wdCfKq_note,.wdCfKq_error,.wdCfKq_notice{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.wdCfKq_error{color:var(--dsw-alias-state-error-primary)}.wdCfKq_notice{color:var(--dsw-alias-state-success-primary)}.wdCfKq_toolbar{flex-wrap:wrap;gap:8px;display:flex}.wdCfKq_fold{box-shadow:none;background:0 0;border:none;border-radius:0;flex-direction:column;display:flex;overflow:hidden}.wdCfKq_foldHead,.wdCfKq_foldHeadStatic{min-height:32px;color:inherit;font:inherit;text-align:left;background:0 0;border:none;border-radius:4px;align-items:center;gap:8px;padding:4px 2px;display:flex}.wdCfKq_foldHead{cursor:pointer;width:100%}.wdCfKq_foldHead:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_foldChevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .14s;display:inline-flex;transform:rotate(-90deg)}.wdCfKq_foldChevron[data-open]{transform:rotate(0)}.wdCfKq_foldTitle{min-width:0;color:var(--dsw-alias-label-primary);flex:auto;font-size:13px;font-weight:600;line-height:20px}.wdCfKq_foldBadge{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);color:var(--dsw-alias-brand-primary);border-radius:999px;flex:none;padding:1px 6px;font-size:11px;font-weight:600;line-height:16px}.wdCfKq_foldBody{border-top:none;flex-direction:column;gap:8px;padding:4px 2px 8px;display:flex}.wdCfKq_sectionBody{flex-direction:column;gap:8px;display:flex}.wdCfKq_promptBox{background:0 0;border:none;border-radius:0;flex-direction:column;gap:8px;padding:0;display:flex}.wdCfKq_promptTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px}.wdCfKq_promptField{flex-direction:column;gap:4px;display:flex}.wdCfKq_defaultPrompt,.wdCfKq_promptInput,.wdCfKq_transcript{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;font:inherit;border-radius:8px;margin:0;padding:8px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px}.wdCfKq_defaultPrompt{max-height:96px;overflow:auto}.wdCfKq_promptInput{resize:vertical;min-height:72px;color:var(--dsw-alias-label-primary);transition:border-color .12s,box-shadow .12s}.wdCfKq_promptInput:focus{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-border-l2));box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);outline:none}.wdCfKq_select{box-sizing:border-box;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:8px 10px;font-size:12px;line-height:18px;transition:border-color .12s,box-shadow .12s}.wdCfKq_select:focus{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-border-l2));box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);outline:none}.wdCfKq_toggleRow{cursor:pointer;align-items:flex-start;gap:10px;display:flex}.wdCfKq_toggleRow input{margin-top:3px}.wdCfKq_toggleLabel{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;line-height:18px;display:block}.wdCfKq_promptActions{flex-wrap:wrap;gap:8px;display:flex}.wdCfKq_criteriaPresets{flex-wrap:wrap;gap:6px;display:flex}.wdCfKq_criteriaChip{background:var(--dsw-alias-interactive-bg-hover-solid);max-width:100%;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border:none;border-radius:4px;align-items:center;padding:3px 9px;font-size:12px;line-height:18px;transition:background .1s,color .1s;display:inline-flex}.wdCfKq_criteriaChip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:#0000}.wdCfKq_criteriaChip[data-active]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);color:var(--dsw-alias-label-primary);box-shadow:none;border-color:#0000;font-weight:600}.wdCfKq_criteriaChip[data-active]:hover{transform:none}.wdCfKq_criteriaHistory{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent);flex-direction:column;gap:6px;padding-top:8px;display:flex}.wdCfKq_criteriaHistoryList{flex-direction:column;gap:2px;max-height:140px;margin:0;padding:0;list-style:none;display:flex;overflow:auto}.wdCfKq_criteriaHistoryItem{margin:0}.wdCfKq_criteriaHistoryBtn{width:100%;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:4px;align-items:center;gap:8px;padding:6px 8px;font-size:11px;line-height:16px;transition:background .1s;display:flex}.wdCfKq_criteriaHistoryBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid);border-color:#0000}.wdCfKq_criteriaHistoryText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.wdCfKq_criteriaHistoryApply{color:var(--dsw-alias-brand-primary);flex:none;font-weight:600}.wdCfKq_jobFooter{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);min-height:40px;color:var(--dsw-alias-label-tertiary);background:0 0;flex:none;justify-content:space-between;align-items:center;gap:12px;margin:auto 0 0;padding:8px 16px;font-size:12px;line-height:18px;display:flex;overflow:hidden}.wdCfKq_jobFooterEmpty{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.wdCfKq_jobFooterError{color:var(--dsw-alias-label-danger,#c0392b);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.wdCfKq_jobStatusLine{white-space:nowrap;align-items:center;gap:6px;width:100%;min-width:0;display:flex;overflow:hidden}.wdCfKq_jobStatusSeg{flex:none}.wdCfKq_jobStatusModel{text-overflow:ellipsis;max-width:22%;overflow:hidden}.wdCfKq_jobStatusCurrent{text-overflow:ellipsis;flex:auto;min-width:0;max-width:none;overflow:hidden}.wdCfKq_jobStatusLabel{color:var(--dsw-alias-label-tertiary)}.wdCfKq_jobStatusDot{color:var(--dsw-alias-label-quaternary,var(--dsw-alias-label-tertiary));flex:none}.wdCfKq_jobStatusCurrent strong{color:var(--dsw-alias-label-primary);font-weight:600}.wdCfKq_list{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.wdCfKq_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;overflow:hidden}.wdCfKq_rowActive{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1))}.wdCfKq_rowTop{align-items:flex-start;gap:4px;padding-right:6px;display:flex}.wdCfKq_rowHead{text-align:left;cursor:pointer;min-width:0;color:inherit;font:inherit;background:0 0;border:none;flex:1;align-items:flex-start;gap:8px;padding:8px 10px;display:flex}.wdCfKq_rowHead:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.wdCfKq_path{min-width:0;color:var(--dsw-alias-label-primary);word-break:break-all;flex:1;align-items:flex-start;gap:8px;font-size:12px;line-height:18px;display:flex}.wdCfKq_meta{color:var(--dsw-alias-label-tertiary);flex-direction:column;flex:none;align-items:flex-end;gap:2px;font-size:11px;line-height:16px;display:flex}.wdCfKq_statusOk{color:var(--dsw-alias-state-success-primary)}.wdCfKq_statusFailed{color:var(--dsw-alias-state-error-primary)}.wdCfKq_statusSkipped{color:var(--dsw-alias-label-tertiary)}.wdCfKq_statusActive{color:var(--dsw-alias-brand-primary);font-weight:600}.wdCfKq_detail{color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;margin:0;padding:10px 8px 12px;font-size:12px;line-height:18px;display:flex}.wdCfKq_detailLabel{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px;font-size:11px;font-weight:600;line-height:16px}.wdCfKq_transcript{max-height:160px;overflow:auto}.wdCfKq_tags{flex-wrap:wrap;gap:4px;display:flex}.wdCfKq_tag{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 6px;font-size:11px;line-height:16px}.wdCfKq_spinner{border:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;flex:none;width:12px;height:12px;animation:.7s linear infinite wdCfKq_mediaSpin}@keyframes wdCfKq_mediaSpin{to{transform:rotate(360deg)}}";
		const tagId$2 = "dsh-photo-pick-ui/PhotoPickConfigPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-photo-pick-ui";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var PhotoPickConfigPanel_module_css_default = {
			"thumbProcessingSpinner": "wdCfKq_thumbProcessingSpinner",
			"filesSort": "wdCfKq_filesSort",
			"configScroll": "wdCfKq_configScroll",
			"promptInput": "wdCfKq_promptInput",
			"jobFooterEmpty": "wdCfKq_jobFooterEmpty",
			"thumb": "wdCfKq_thumb",
			"cardProcessing": "wdCfKq_cardProcessing",
			"filesViewToggle": "wdCfKq_filesViewToggle",
			"filesPathBar": "wdCfKq_filesPathBar",
			"dialogTitle": "wdCfKq_dialogTitle",
			"tagSidebarChips": "wdCfKq_tagSidebarChips",
			"configSectionTitle": "wdCfKq_configSectionTitle",
			"dialogBody": "wdCfKq_dialogBody",
			"thumbSpinner": "wdCfKq_thumbSpinner",
			"thumbButton": "wdCfKq_thumbButton",
			"criteriaPresets": "wdCfKq_criteriaPresets",
			"folderIcon": "wdCfKq_folderIcon",
			"toolbar": "wdCfKq_toolbar",
			"statusActive": "wdCfKq_statusActive",
			"fold": "wdCfKq_fold",
			"cardBody": "wdCfKq_cardBody",
			"notice": "wdCfKq_notice",
			"criteriaStepHeader": "wdCfKq_criteriaStepHeader",
			"root": "wdCfKq_root",
			"thumbFallback": "wdCfKq_thumbFallback",
			"cardActive": "wdCfKq_cardActive",
			"configCol": "wdCfKq_configCol",
			"folderCard": "wdCfKq_folderCard",
			"promptActions": "wdCfKq_promptActions",
			"lightboxViewport": "wdCfKq_lightboxViewport",
			"criteriaHistoryBtn": "wdCfKq_criteriaHistoryBtn",
			"cardPath": "wdCfKq_cardPath",
			"select": "wdCfKq_select",
			"jobStatusLabel": "wdCfKq_jobStatusLabel",
			"tagFilterChip": "wdCfKq_tagFilterChip",
			"filesBackBtn": "wdCfKq_filesBackBtn",
			"headToggle": "wdCfKq_headToggle",
			"card": "wdCfKq_card",
			"lightboxHint": "wdCfKq_lightboxHint",
			"tagFilterChipCount": "wdCfKq_tagFilterChipCount",
			"criteriaStepStep": "wdCfKq_criteriaStepStep",
			"logField": "wdCfKq_logField",
			"breadcrumb": "wdCfKq_breadcrumb",
			"lightboxMask": "wdCfKq_lightboxMask",
			"lightboxLogPane": "wdCfKq_lightboxLogPane",
			"jobStatusSeg": "wdCfKq_jobStatusSeg",
			"layout": "wdCfKq_layout",
			"criteriaStepHeaderEnd": "wdCfKq_criteriaStepHeaderEnd",
			"dialog": "wdCfKq_dialog",
			"criteriaStepHeaderStart": "wdCfKq_criteriaStepHeaderStart",
			"dialogHeader": "wdCfKq_dialogHeader",
			"filesBody": "wdCfKq_filesBody",
			"lightboxZoomValue": "wdCfKq_lightboxZoomValue",
			"promptBox": "wdCfKq_promptBox",
			"tag": "wdCfKq_tag",
			"filesHeadLeft": "wdCfKq_filesHeadLeft",
			"criteriaChip": "wdCfKq_criteriaChip",
			"error": "wdCfKq_error",
			"filesCol": "wdCfKq_filesCol",
			"foldTitle": "wdCfKq_foldTitle",
			"lightboxCard": "wdCfKq_lightboxCard",
			"triggerComposer": "wdCfKq_triggerComposer",
			"foldHead": "wdCfKq_foldHead",
			"filesSortSelect": "wdCfKq_filesSortSelect",
			"row": "wdCfKq_row",
			"cardFoot": "wdCfKq_cardFoot",
			"criteriaStepDialog": "wdCfKq_criteriaStepDialog",
			"thumbProcessingOverlay": "wdCfKq_thumbProcessingOverlay",
			"lightboxSplit": "wdCfKq_lightboxSplit",
			"toggleLabel": "wdCfKq_toggleLabel",
			"jobStatusModel": "wdCfKq_jobStatusModel",
			"criteriaHistoryText": "wdCfKq_criteriaHistoryText",
			"breadcrumbSep": "wdCfKq_breadcrumbSep",
			"criteriaStepTitle": "wdCfKq_criteriaStepTitle",
			"path": "wdCfKq_path",
			"configSectionHead": "wdCfKq_configSectionHead",
			"dialogHeaderEnd": "wdCfKq_dialogHeaderEnd",
			"thumbProcessingBadge": "wdCfKq_thumbProcessingBadge",
			"rowTop": "wdCfKq_rowTop",
			"folderName": "wdCfKq_folderName",
			"logBlock": "wdCfKq_logBlock",
			"spinner": "wdCfKq_spinner",
			"toggleRow": "wdCfKq_toggleRow",
			"criteriaHistoryList": "wdCfKq_criteriaHistoryList",
			"filesCount": "wdCfKq_filesCount",
			"body": "wdCfKq_body",
			"jobStatusLine": "wdCfKq_jobStatusLine",
			"dialogClose": "wdCfKq_dialogClose",
			"filesSortLabel": "wdCfKq_filesSortLabel",
			"note": "wdCfKq_note",
			"grid": "wdCfKq_grid",
			"cardCheck": "wdCfKq_cardCheck",
			"cardMetaInline": "wdCfKq_cardMetaInline",
			"cardTitle": "wdCfKq_cardTitle",
			"lightboxTabs": "wdCfKq_lightboxTabs",
			"dialogShell": "wdCfKq_dialogShell",
			"rowHead": "wdCfKq_rowHead",
			"lightbox": "wdCfKq_lightbox",
			"trigger": "wdCfKq_trigger",
			"lightboxImage": "wdCfKq_lightboxImage",
			"foldBadge": "wdCfKq_foldBadge",
			"jobFooter": "wdCfKq_jobFooter",
			"statusSkipped": "wdCfKq_statusSkipped",
			"criteriaStepFooter": "wdCfKq_criteriaStepFooter",
			"jobStatusCurrent": "wdCfKq_jobStatusCurrent",
			"lightboxTab": "wdCfKq_lightboxTab",
			"meta": "wdCfKq_meta",
			"mediaSpin": "wdCfKq_mediaSpin",
			"cardRetag": "wdCfKq_cardRetag",
			"detailLabel": "wdCfKq_detailLabel",
			"folderItem": "wdCfKq_folderItem",
			"tags": "wdCfKq_tags",
			"criteriaHistoryItem": "wdCfKq_criteriaHistoryItem",
			"rowActive": "wdCfKq_rowActive",
			"tagSidebar": "wdCfKq_tagSidebar",
			"criteriaHistory": "wdCfKq_criteriaHistory",
			"promptTitle": "wdCfKq_promptTitle",
			"filesHead": "wdCfKq_filesHead",
			"statusFailed": "wdCfKq_statusFailed",
			"configSection": "wdCfKq_configSection",
			"dialogHeaderStart": "wdCfKq_dialogHeaderStart",
			"filesViewBtn": "wdCfKq_filesViewBtn",
			"lightboxLog": "wdCfKq_lightboxLog",
			"jobFooterError": "wdCfKq_jobFooterError",
			"transcript": "wdCfKq_transcript",
			"defaultPrompt": "wdCfKq_defaultPrompt",
			"lightboxZoom": "wdCfKq_lightboxZoom",
			"cardActions": "wdCfKq_cardActions",
			"filesHeadRight": "wdCfKq_filesHeadRight",
			"breadcrumbItem": "wdCfKq_breadcrumbItem",
			"criteriaStepShell": "wdCfKq_criteriaStepShell",
			"list": "wdCfKq_list",
			"filesMain": "wdCfKq_filesMain",
			"promptField": "wdCfKq_promptField",
			"lightboxHead": "wdCfKq_lightboxHead",
			"foldHeadStatic": "wdCfKq_foldHeadStatic",
			"tagFilterChipName": "wdCfKq_tagFilterChipName",
			"lightboxPreviewPane": "wdCfKq_lightboxPreviewPane",
			"foldBody": "wdCfKq_foldBody",
			"foldChevron": "wdCfKq_foldChevron",
			"cardKind": "wdCfKq_cardKind",
			"criteriaStepBody": "wdCfKq_criteriaStepBody",
			"breadcrumbCrumb": "wdCfKq_breadcrumbCrumb",
			"criteriaHistoryApply": "wdCfKq_criteriaHistoryApply",
			"statusOk": "wdCfKq_statusOk",
			"sectionBody": "wdCfKq_sectionBody",
			"detail": "wdCfKq_detail",
			"jobStatusDot": "wdCfKq_jobStatusDot"
		};
		//#endregion
		//#region src/client/PhotoPickConfigPanel.tsx
		/**
		* Session-header photo-pick workspace.
		* Dialog shell / config folds / tiled browse mirror media-ui Image & video scan;
		* actions select paths for photo_pick_best instead of tagging jobs.
		* @module dsh-photo-pick-ui/client/PhotoPickConfigPanel
		*/
		const CANDIDATES_PATH = "/api/photo-pick/candidates";
		/** Soft optional media index; absent when the media plugin is not installed. */
		const MEDIA_ASSETS_PATH = "/api/media-library/assets";
		/** Sentinel tag-filter value for images with no tags. */
		const UNTAGGED_FILTER = "__untagged__";
		const PREVIEW_ZOOM_MIN = .25;
		const PREVIEW_ZOOM_MAX = 5;
		const PREVIEW_ZOOM_STEP = .25;
		/**
		* Render the photo-pick header chip and workspace dialog.
		* Hidden on blank sessions with the session header; use
		* {@link PhotoPickComposerAction} for the always-visible composer entry.
		* @param props - slot runtime + inject face.
		*/
		function PhotoPickConfigPanel(props) {
			const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
			if (controller === void 0 || useSnapshot === void 0 || insertDraft === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PhotoPickWorkspaceReady, {
				placement: "header",
				sessionId,
				useSessions,
				controller,
				useSnapshot,
				insertDraft,
				t
			});
		}
		/**
		* Photo-pick chip on the composer tool row — visible in blank/hero sessions
		* where the session header (and its actions) are hidden.
		* @param props - input.left runtime + inject face.
		*/
		function PhotoPickComposerAction(props) {
			const { sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
			if (controller === void 0 || useSnapshot === void 0 || insertDraft === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PhotoPickWorkspaceReady, {
				placement: "composer",
				sessionId,
				useSessions,
				controller,
				useSnapshot,
				insertDraft,
				t
			});
		}
		function PhotoPickWorkspaceReady(props) {
			const { placement, sessionId, useSessions, controller, useSnapshot, insertDraft, t } = props;
			const agentPreset = useSessions((s) => s.byId[sessionId]?.agentPreset);
			const cwd = useSessions((s) => s.byId[sessionId]?.cwd);
			const enabled = agentPreset === PHOTO_PICK_AGENT_PRESET_ID;
			const state = useSnapshot((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const [images, setImages] = (0, react.useState)([]);
			const [imagesError, setImagesError] = (0, react.useState)(void 0);
			const [imagesLoading, setImagesLoading] = (0, react.useState)(false);
			const [selected, setSelected] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [previewPath, setPreviewPath] = (0, react.useState)(void 0);
			const [copied, setCopied] = (0, react.useState)(false);
			const [foldOpen, setFoldOpen] = (0, react.useState)({
				actions: true,
				vision: true,
				prompt: false
			});
			const [criteriaDraft, setCriteriaDraft] = (0, react.useState)(() => loadCriteriaDraft());
			const [criteriaHistory, setCriteriaHistory] = (0, react.useState)(() => loadCriteriaHistory());
			const [criteriaStepOpen, setCriteriaStepOpen] = (0, react.useState)(false);
			const [filesView, setFilesView] = (0, react.useState)("tree");
			const [browseDir, setBrowseDir] = (0, react.useState)("");
			const [filesSort, setFilesSort] = (0, react.useState)("name-asc");
			const [tagFilter, setTagFilter] = (0, react.useState)([]);
			const [configCollapsed, setConfigCollapsed] = (0, react.useState)(true);
			const [tagCollapsed, setTagCollapsed] = (0, react.useState)(true);
			const [mediaTagsAvailable, setMediaTagsAvailable] = (0, react.useState)(false);
			const toggleFold = (id) => {
				setFoldOpen((current) => ({
					...current,
					[id]: !current[id]
				}));
			};
			(0, react.useEffect)(() => {
				setBrowseDir("");
				setTagFilter([]);
				setPreviewPath(void 0);
			}, [cwd]);
			(0, react.useEffect)(() => {
				if (!enabled) {
					setOpen(false);
					setPreviewPath(void 0);
					setCriteriaStepOpen(false);
					return;
				}
				if (open && state.status === "idle") controller.load();
			}, [
				enabled,
				open,
				controller,
				state.status
			]);
			const reloadImages = async (root) => {
				setImagesLoading(true);
				setImagesError(void 0);
				try {
					const loaded = await loadCandidatesWithSoftTags(root);
					setImages(loaded.images);
					setMediaTagsAvailable(loaded.mediaTagsAvailable);
				} catch (error) {
					setImages([]);
					setMediaTagsAvailable(false);
					setImagesError(error instanceof Error ? error.message : String(error));
				} finally {
					setImagesLoading(false);
				}
			};
			(0, react.useEffect)(() => {
				if (!enabled || !open || cwd === void 0 || cwd.length === 0) return;
				let cancelled = false;
				(async () => {
					setImagesLoading(true);
					setImagesError(void 0);
					try {
						const loaded = await loadCandidatesWithSoftTags(cwd);
						if (cancelled) return;
						setImages(loaded.images);
						setMediaTagsAvailable(loaded.mediaTagsAvailable);
						setSelected(/* @__PURE__ */ new Set());
						setTagFilter([]);
						setPreviewPath(void 0);
					} catch (error) {
						if (cancelled) return;
						setImages([]);
						setMediaTagsAvailable(false);
						setImagesError(error instanceof Error ? error.message : String(error));
					} finally {
						if (!cancelled) setImagesLoading(false);
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [
				enabled,
				open,
				cwd
			]);
			(0, react.useEffect)(() => {
				if (previewPath === void 0) return;
				if (images.some((image) => image.relativePath === previewPath)) return;
				setPreviewPath(void 0);
			}, [images, previewPath]);
			const selectedList = (0, react.useMemo)(() => [...selected].sort((a, b) => a.localeCompare(b)), [selected]);
			if (!enabled) return null;
			const canGoBack = filesView === "tree" && browseDir.length > 0;
			const availableTags = collectTagOptions(images);
			const untaggedCount = images.reduce((count, image) => count + (image.tags.length === 0 ? 1 : 0), 0);
			const filteredImages = filterImagesByTags(images, tagFilter);
			const treeEntries = filesView === "tree" ? entriesInDirectory(filteredImages, browseDir) : {
				folders: [],
				files: [...filteredImages]
			};
			const sortedFolders = sortFolderNames(treeEntries.folders, filesSort);
			const sortedFiles = sortImages(treeEntries.files, filesSort);
			const visibleCount = filesView === "tree" ? sortedFolders.length + sortedFiles.length : sortedFiles.length;
			const visiblePaths = sortedFiles.map((image) => image.relativePath);
			const goBack = () => {
				if (!canGoBack) return;
				const parts = browseDir.split("/").filter(Boolean);
				parts.pop();
				setBrowseDir(parts.join("/"));
			};
			const toggleTagFilter = (tag) => {
				setTagFilter((current) => {
					if (tag === UNTAGGED_FILTER) return current.includes(UNTAGGED_FILTER) ? [] : [UNTAGGED_FILTER];
					const withoutUntagged = current.filter((item) => item !== UNTAGGED_FILTER);
					return withoutUntagged.includes(tag) ? withoutUntagged.filter((item) => item !== tag) : [...withoutUntagged, tag];
				});
			};
			const togglePath = (relativePath) => {
				setSelected((current) => {
					const next = new Set(current);
					if (next.has(relativePath)) next.delete(relativePath);
					else next.add(relativePath);
					return next;
				});
			};
			const selectVisible = () => {
				setSelected((current) => {
					const next = new Set(current);
					for (const path of visiblePaths) next.add(path);
					return next;
				});
			};
			const copySelected = async () => {
				if (selectedList.length === 0) return;
				try {
					await navigator.clipboard.writeText(selectedList.join("\n"));
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1600);
				} catch {
					setCopied(false);
				}
			};
			const setCriteria = (next) => {
				setCriteriaDraft(next);
				saveCriteriaDraft(next);
			};
			const openCriteriaStep = () => {
				if (selectedList.length === 0) return;
				setCriteriaStepOpen(true);
			};
			const confirmIntoChat = () => {
				if (selectedList.length === 0) return;
				if (!insertDraft(sessionId, buildConfirmDraft({
					lead: t("panel.confirmDraftLead"),
					leadWithCriteria: t("panel.confirmDraftLeadWithCriteria"),
					paths: selectedList,
					criteriaLead: t("panel.confirmDraftCriteriaLead"),
					criteria: criteriaDraft
				}))) return;
				if (criteriaDraft.trim().length > 0) setCriteriaHistory(rememberCriteria(criteriaDraft));
				setCriteriaStepOpen(false);
				setOpen(false);
				setPreviewPath(void 0);
			};
			const closeDialog = () => {
				if (previewPath !== void 0) {
					setPreviewPath(void 0);
					return;
				}
				if (criteriaStepOpen) {
					setCriteriaStepOpen(false);
					return;
				}
				setOpen(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.root,
				"data-placement": placement,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: placement === "composer" ? PhotoPickConfigPanel_module_css_default.triggerComposer : PhotoPickConfigPanel_module_css_default.trigger,
					"data-active": open || void 0,
					"aria-label": t("panel.triggerAria"),
					"aria-expanded": open,
					title: t("panel.triggerHint"),
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.trigger") })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					headless: true,
					open,
					onClose: closeDialog,
					title: t("panel.title"),
					className: PhotoPickConfigPanel_module_css_default.dialog,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.dialogShell,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: PhotoPickConfigPanel_module_css_default.dialogHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: PhotoPickConfigPanel_module_css_default.dialogHeaderStart,
									children: cwd === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: PhotoPickConfigPanel_module_css_default.headToggle,
										"data-active": !configCollapsed || void 0,
										"data-filtered": state.dirty || void 0,
										title: configCollapsed ? t("panel.configExpand") : t("panel.configCollapse"),
										"aria-label": configCollapsed ? t("panel.configExpand") : t("panel.configCollapse"),
										"aria-expanded": !configCollapsed,
										onClick: () => {
											setConfigCollapsed((current) => !current);
										},
										children: [configCollapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.config") })]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: PhotoPickConfigPanel_module_css_default.dialogTitle,
									children: t("panel.title")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: PhotoPickConfigPanel_module_css_default.dialogHeaderEnd,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickConfigPanel_module_css_default.dialogClose,
										"aria-label": t("panel.close"),
										onClick: closeDialog,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
									})
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PhotoPickConfigPanel_module_css_default.dialogBody,
							children: cwd === void 0 || cwd.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickConfigPanel_module_css_default.note,
								children: t("panel.noCwd")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickConfigPanel_module_css_default.body,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickConfigPanel_module_css_default.layout,
										children: [!configCollapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
											className: PhotoPickConfigPanel_module_css_default.configCol,
											"aria-label": t("panel.config"),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: PhotoPickConfigPanel_module_css_default.configScroll,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
														className: PhotoPickConfigPanel_module_css_default.configSection,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.configSectionHead,
															"aria-expanded": foldOpen.actions,
															onClick: () => {
																toggleFold("actions");
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: PhotoPickConfigPanel_module_css_default.foldChevron,
																"data-open": foldOpen.actions || void 0,
																"aria-hidden": true,
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: PhotoPickConfigPanel_module_css_default.configSectionTitle,
																children: t("panel.foldActions")
															})]
														}), foldOpen.actions ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: PhotoPickConfigPanel_module_css_default.toolbar,
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "primary",
																	disabled: selectedList.length === 0,
																	title: t("panel.nextHint"),
																	onClick: openCriteriaStep,
																	children: t("panel.next")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "outline",
																	disabled: visiblePaths.length === 0,
																	onClick: selectVisible,
																	children: t("panel.selectAll")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "outline",
																	disabled: selectedList.length === 0,
																	onClick: () => {
																		setSelected(/* @__PURE__ */ new Set());
																		setCopied(false);
																	},
																	children: t("panel.clearSelection")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "ghost",
																	disabled: selectedList.length === 0,
																	onClick: () => {
																		copySelected();
																	},
																	children: copied ? t("panel.copied") : t("panel.copyPaths")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "ghost",
																	disabled: imagesLoading,
																	onClick: () => {
																		reloadImages(cwd);
																	},
																	children: t("panel.refresh")
																})
															]
														}) : null]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
														className: PhotoPickConfigPanel_module_css_default.configSection,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.configSectionHead,
															"aria-expanded": foldOpen.vision,
															onClick: () => {
																toggleFold("vision");
															},
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.foldChevron,
																	"data-open": foldOpen.vision || void 0,
																	"aria-hidden": true,
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.configSectionTitle,
																	children: t("panel.foldVision")
																}),
																state.dirty && state.status === "ready" && (state.draft.visionEnabled !== state.baseline.visionEnabled || state.draft.visionLlmProvider !== state.baseline.visionLlmProvider || state.draft.visionModel !== state.baseline.visionModel) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.foldBadge,
																	children: t("panel.foldDirty")
																}) : null
															]
														}), foldOpen.vision ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VisionEditor, {
															state,
															controller,
															t
														}) : null]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
														className: PhotoPickConfigPanel_module_css_default.configSection,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.configSectionHead,
															"aria-expanded": foldOpen.prompt,
															onClick: () => {
																toggleFold("prompt");
															},
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.foldChevron,
																	"data-open": foldOpen.prompt || void 0,
																	"aria-hidden": true,
																	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.configSectionTitle,
																	children: t("panel.foldPrompt")
																}),
																state.dirty && state.status === "ready" && state.draft.visionScorePrompt !== state.baseline.visionScorePrompt ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.foldBadge,
																	children: t("panel.foldDirty")
																}) : null
															]
														}), foldOpen.prompt ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PromptEditor, {
															state,
															controller,
															t
														}) : null]
													})
												]
											})
										}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
											className: PhotoPickConfigPanel_module_css_default.filesCol,
											"aria-label": t("panel.files"),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: PhotoPickConfigPanel_module_css_default.filesHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: PhotoPickConfigPanel_module_css_default.filesHeadLeft,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickConfigPanel_module_css_default.promptTitle,
															children: t("panel.files")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickConfigPanel_module_css_default.filesCount,
															children: tagFilter.length > 0 ? `${filteredImages.length}/${images.length}` : images.length
														}),
														images.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.headToggle,
															"data-active": !tagCollapsed || void 0,
															"data-filtered": tagFilter.length > 0 || void 0,
															title: tagCollapsed ? t("panel.filesTagExpand") : t("panel.filesTagCollapse"),
															"aria-label": tagCollapsed ? t("panel.filesTagExpand") : t("panel.filesTagCollapse"),
															"aria-expanded": !tagCollapsed,
															onClick: () => {
																setTagCollapsed((current) => !current);
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.filesTagFilter") }), tagCollapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 14 })]
														}) : null
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: PhotoPickConfigPanel_module_css_default.filesHeadRight,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
														className: PhotoPickConfigPanel_module_css_default.filesSort,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickConfigPanel_module_css_default.filesSortLabel,
															children: t("panel.filesSort")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
															className: PhotoPickConfigPanel_module_css_default.filesSortSelect,
															value: filesSort,
															onChange: (event) => {
																setFilesSort(event.target.value);
															},
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "name-asc",
																	children: t("panel.filesSortNameAsc")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "name-desc",
																	children: t("panel.filesSortNameDesc")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "mtime-desc",
																	children: t("panel.filesSortMtimeDesc")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "mtime-asc",
																	children: t("panel.filesSortMtimeAsc")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "size-desc",
																	children: t("panel.filesSortSizeDesc")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
																	value: "size-asc",
																	children: t("panel.filesSortSizeAsc")
																})
															]
														})]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: PhotoPickConfigPanel_module_css_default.filesViewToggle,
														role: "group",
														"aria-label": t("panel.files"),
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.filesViewBtn,
															"data-active": filesView === "tree" || void 0,
															onClick: () => {
																setFilesView("tree");
															},
															children: t("panel.filesViewTree")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: PhotoPickConfigPanel_module_css_default.filesViewBtn,
															"data-active": filesView === "flat" || void 0,
															onClick: () => {
																setFilesView("flat");
															},
															children: t("panel.filesViewFlat")
														})]
													})]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: PhotoPickConfigPanel_module_css_default.filesBody,
												children: [images.length > 0 && !tagCollapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
													className: PhotoPickConfigPanel_module_css_default.tagSidebar,
													"aria-label": t("panel.filesTagFilter"),
													children: [!mediaTagsAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: PhotoPickConfigPanel_module_css_default.note,
														children: t("panel.filesTagUnavailable")
													}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: PhotoPickConfigPanel_module_css_default.tagSidebarChips,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: PhotoPickConfigPanel_module_css_default.tagFilterChip,
																"data-active": tagFilter.length === 0 || void 0,
																onClick: () => {
																	setTagFilter([]);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipName,
																	children: t("panel.filesTagFilterAll")
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipCount,
																	children: images.length
																})]
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: PhotoPickConfigPanel_module_css_default.tagFilterChip,
																"data-active": tagFilter.includes(UNTAGGED_FILTER) || void 0,
																onClick: () => {
																	toggleTagFilter(UNTAGGED_FILTER);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipName,
																	children: t("panel.filesTagFilterNone")
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipCount,
																	children: untaggedCount
																})]
															}),
															availableTags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: PhotoPickConfigPanel_module_css_default.tagFilterChip,
																"data-active": tagFilter.includes(tag.name) || void 0,
																title: tag.name,
																onClick: () => {
																	toggleTagFilter(tag.name);
																},
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipName,
																	children: tag.name
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: PhotoPickConfigPanel_module_css_default.tagFilterChipCount,
																	children: tag.count
																})]
															}, tag.name))
														]
													})]
												}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: PhotoPickConfigPanel_module_css_default.filesMain,
													children: [
														filesView === "tree" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: PhotoPickConfigPanel_module_css_default.filesPathBar,
															children: [canGoBack ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																type: "button",
																className: PhotoPickConfigPanel_module_css_default.filesBackBtn,
																title: t("panel.filesBack"),
																"aria-label": t("panel.filesBack"),
																onClick: goBack,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("panel.filesBack") })]
															}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Breadcrumb, {
																dir: browseDir,
																rootLabel: t("panel.filesRoot"),
																onNavigate: setBrowseDir
															})]
														}) : null,
														imagesLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: PhotoPickConfigPanel_module_css_default.note,
															children: t("panel.loading")
														}) : null,
														imagesError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: PhotoPickConfigPanel_module_css_default.error,
															children: imagesError
														}) : null,
														!imagesLoading && imagesError === void 0 && images.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: PhotoPickConfigPanel_module_css_default.note,
															children: t("panel.empty")
														}) : null,
														!imagesLoading && images.length > 0 && filteredImages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: PhotoPickConfigPanel_module_css_default.note,
															children: t("panel.filesTagFilterEmpty")
														}) : null,
														!imagesLoading && filteredImages.length > 0 && visibleCount === 0 && filesView === "tree" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: PhotoPickConfigPanel_module_css_default.note,
															children: t("panel.emptyFolder")
														}) : null,
														visibleCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
															className: PhotoPickConfigPanel_module_css_default.grid,
															children: [filesView === "tree" ? sortedFolders.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
																className: PhotoPickConfigPanel_module_css_default.folderItem,
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
																	type: "button",
																	className: PhotoPickConfigPanel_module_css_default.folderCard,
																	"aria-label": `${t("panel.folderOpen")}: ${name}`,
																	onClick: () => {
																		setBrowseDir(browseDir.length === 0 ? name : `${browseDir}/${name}`);
																	},
																	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: PhotoPickConfigPanel_module_css_default.folderIcon,
																		"aria-hidden": true
																	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: PhotoPickConfigPanel_module_css_default.folderName,
																		children: name
																	})]
																})
															}, `dir:${browseDir}/${name}`)) : null, sortedFiles.map((image) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CandidateCard, {
																root: cwd,
																image,
																checked: selected.has(image.relativePath),
																onToggle: () => {
																	togglePath(image.relativePath);
																},
																onPreview: () => {
																	setPreviewPath(image.relativePath);
																},
																t
															}, image.relativePath))]
														}) : null
													]
												})]
											})]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("footer", {
										className: PhotoPickConfigPanel_module_css_default.jobFooter,
										"aria-label": t("panel.foldJob"),
										children: selectedList.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: PhotoPickConfigPanel_module_css_default.jobFooterEmpty,
											children: [
												t("panel.selectedCount").replace("{n}", String(selectedList.length)),
												" · ",
												t("panel.nextHint")
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "primary",
											size: "sm",
											onClick: openCriteriaStep,
											children: t("panel.next")
										})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PhotoPickConfigPanel_module_css_default.jobFooterEmpty,
											children: t("panel.foldJobEmpty")
										})
									}),
									previewPath !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Lightbox, {
										root: cwd,
										relativePath: previewPath,
										image: images.find((row) => row.relativePath === previewPath),
										onClose: () => {
											setPreviewPath(void 0);
										},
										t
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
										headless: true,
										open: criteriaStepOpen,
										onClose: () => {
											setCriteriaStepOpen(false);
										},
										title: t("panel.criteriaStepTitle"),
										className: PhotoPickConfigPanel_module_css_default.criteriaStepDialog,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickConfigPanel_module_css_default.criteriaStepShell,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
													className: PhotoPickConfigPanel_module_css_default.criteriaStepHeader,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: PhotoPickConfigPanel_module_css_default.criteriaStepHeaderStart,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: PhotoPickConfigPanel_module_css_default.criteriaStepStep,
																children: t("panel.criteriaStepBadge").replace("{n}", String(selectedList.length))
															})
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
															className: PhotoPickConfigPanel_module_css_default.criteriaStepTitle,
															children: t("panel.criteriaStepTitle")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: PhotoPickConfigPanel_module_css_default.criteriaStepHeaderEnd,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: PhotoPickConfigPanel_module_css_default.dialogClose,
																"aria-label": t("panel.close"),
																onClick: () => {
																	setCriteriaStepOpen(false);
																},
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
															})
														})
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: PhotoPickConfigPanel_module_css_default.criteriaStepBody,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: PhotoPickConfigPanel_module_css_default.note,
														children: t("panel.criteriaStepHint")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CriteriaEditor, {
														draft: criteriaDraft,
														history: criteriaHistory,
														onChange: setCriteria,
														t
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
													className: PhotoPickConfigPanel_module_css_default.criteriaStepFooter,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														onClick: () => {
															setCriteriaStepOpen(false);
														},
														children: t("panel.criteriaStepBack")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "primary",
														title: t("panel.confirmHint"),
														onClick: confirmIntoChat,
														children: t("panel.confirm")
													})]
												})
											]
										})
									})
								]
							})
						})]
					})
				})]
			});
		}
		function CriteriaEditor(props) {
			const { draft, history, onChange, t } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.sectionBody,
				"aria-label": t("panel.criteriaSection"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("panel.criteriaHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PhotoPickConfigPanel_module_css_default.criteriaPresets,
						role: "group",
						"aria-label": t("panel.criteriaPresets"),
						children: CRITERIA_PRESET_IDS.map((id) => {
							const clause = t(criteriaTextKey(id));
							const active = criteriaHasClause(draft, clause);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: PhotoPickConfigPanel_module_css_default.criteriaChip,
								"data-active": active || void 0,
								title: clause,
								"aria-pressed": active,
								onClick: () => {
									onChange(toggleCriteriaClause(draft, clause));
								},
								children: t(criteriaChipKey(id))
							}, id);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.promptField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("panel.criteriaSection")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: PhotoPickConfigPanel_module_css_default.promptInput,
							rows: 4,
							value: draft,
							placeholder: t("panel.criteriaPlaceholder"),
							onChange: (event) => {
								onChange(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PhotoPickConfigPanel_module_css_default.promptActions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							disabled: draft.length === 0,
							onClick: () => {
								onChange("");
							},
							children: t("panel.criteriaClear")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.criteriaHistory,
						"aria-label": t("panel.criteriaHistory"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("panel.criteriaHistory")
						}), history.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PhotoPickConfigPanel_module_css_default.note,
							children: t("panel.criteriaHistoryEmpty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: PhotoPickConfigPanel_module_css_default.criteriaHistoryList,
							children: history.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: PhotoPickConfigPanel_module_css_default.criteriaHistoryItem,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: PhotoPickConfigPanel_module_css_default.criteriaHistoryBtn,
									title: item,
									onClick: () => {
										onChange(item);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickConfigPanel_module_css_default.criteriaHistoryText,
										children: item
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickConfigPanel_module_css_default.criteriaHistoryApply,
										children: t("panel.criteriaHistoryApply")
									})]
								})
							}, item))
						})]
					})
				]
			});
		}
		function criteriaChipKey(id) {
			return `panel.criteriaChip.${id}`;
		}
		function criteriaTextKey(id) {
			return `panel.criteriaText.${id}`;
		}
		function VisionEditor(props) {
			const { state, controller, t } = props;
			if (state.status === "loading" || state.status === "idle") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: PhotoPickConfigPanel_module_css_default.note,
				children: t("panel.loading")
			});
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.sectionBody,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.error,
						children: t("loadError")
					}),
					state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: state.error
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							controller.load();
						},
						children: t("retry")
					})
				]
			});
			const disabled = !state.writable || state.saving;
			const selected = state.draft.visionLlmProvider.length > 0 && state.draft.visionModel.length > 0 ? encodeModelKey(state.draft.visionLlmProvider, state.draft.visionModel) : "";
			const selectedMeta = state.models.find((model) => model.provider === state.draft.visionLlmProvider && model.id === state.draft.visionModel);
			const groups = groupModels(state.models);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.sectionBody,
				"aria-label": t("panel.visionSection"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.toggleRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: state.draft.visionEnabled,
							disabled,
							onChange: (event) => {
								controller.edit("visionEnabled", event.target.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("visionEnabled")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.note,
							children: t("visionEnabledHint")
						})] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.promptField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("model")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: PhotoPickConfigPanel_module_css_default.filesSortSelect,
							value: selected,
							disabled: disabled || state.models.length === 0,
							onChange: (event) => {
								controller.selectModel(event.target.value);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("modelPlaceholder")
							}), groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("optgroup", {
								label: group.label,
								children: group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: encodeModelKey(model.provider, model.id),
									children: formatModelLabel(model, t)
								}, encodeModelKey(model.provider, model.id)))
							}, group.provider))]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("modelHint")
					}),
					state.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("noModels")
					}) : null,
					selectedMeta?.supportsVision === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("textOnlyWarning")
					}) : null,
					!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("readonly")
					}) : null,
					state.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.error,
						children: state.error || t("saveError")
					}) : null,
					state.notice === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.notice,
						children: t("saved")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.promptActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "sm",
							disabled: disabled || !state.dirty,
							onClick: () => {
								controller.save();
							},
							children: t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							disabled: disabled || !state.dirty,
							onClick: () => {
								controller.discard();
							},
							children: t("discard")
						})]
					})
				]
			});
		}
		function PromptEditor(props) {
			const { state, controller, t } = props;
			if (state.status !== "ready") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: PhotoPickConfigPanel_module_css_default.note,
				children: t("panel.loading")
			});
			const disabled = !state.writable || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.sectionBody,
				"aria-label": t("panel.promptSection"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.promptField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("panel.promptDefault")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: PhotoPickConfigPanel_module_css_default.defaultPrompt,
							children: state.defaultVisionScorePrompt || "—"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.promptField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("panel.promptCustom")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: PhotoPickConfigPanel_module_css_default.promptInput,
							rows: 8,
							value: state.draft.visionScorePrompt,
							disabled,
							placeholder: t("panel.promptCustomHint"),
							onChange: (event) => {
								controller.edit("visionScorePrompt", event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: PhotoPickConfigPanel_module_css_default.promptField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.detailLabel,
							children: t("panel.promptSuffix")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: PhotoPickConfigPanel_module_css_default.defaultPrompt,
							children: state.visionScoreJsonSuffix || "—"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.note,
						children: t("panel.promptCustomHint")
					}),
					state.notice === "saved" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PhotoPickConfigPanel_module_css_default.notice,
						children: t("panel.promptSaved")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.promptActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "sm",
							disabled: !state.dirty || disabled,
							onClick: () => {
								controller.save();
							},
							children: t("panel.promptSave")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							disabled: state.draft.visionScorePrompt.length === 0 || disabled,
							onClick: () => {
								controller.resetPrompt();
							},
							children: t("panel.promptReset")
						})]
					})
				]
			});
		}
		function CandidateCard(props) {
			const { root, image, checked, onToggle, onPreview, t } = props;
			const [thumbFailed, setThumbFailed] = (0, react.useState)(false);
			const fileName = image.relativePath.split(/[/\\]/).pop() || image.relativePath;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: checked ? `${PhotoPickConfigPanel_module_css_default.card} ${PhotoPickConfigPanel_module_css_default.cardActive}` : PhotoPickConfigPanel_module_css_default.card,
				"data-active": checked || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: PhotoPickConfigPanel_module_css_default.thumbButton,
					"aria-label": t("panel.previewOpen"),
					disabled: thumbFailed,
					onClick: onPreview,
					children: !thumbFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: PhotoPickConfigPanel_module_css_default.thumb,
						src: photoPickFileUrl(root, image.relativePath),
						alt: "",
						loading: "lazy",
						onError: () => {
							setThumbFailed(true);
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PhotoPickConfigPanel_module_css_default.thumbFallback,
						children: t("panel.previewFailed")
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PhotoPickConfigPanel_module_css_default.cardBody,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: PhotoPickConfigPanel_module_css_default.cardFoot,
						onClick: onToggle,
						"aria-pressed": checked,
						"aria-label": t("panel.selectAria").replace("{name}", fileName),
						title: image.relativePath,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.cardCheck,
							"aria-hidden": true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked,
								readOnly: true,
								tabIndex: -1
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.cardTitle,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PhotoPickConfigPanel_module_css_default.cardPath,
								children: fileName
							})
						})]
					})
				})]
			});
		}
		function Lightbox(props) {
			const { root, relativePath, image, onClose, t } = props;
			/** Detail side panel — same affordance as media-library preview. */
			const [logOpen, setLogOpen] = (0, react.useState)(true);
			const viewportRef = (0, react.useRef)(null);
			const [zoom, setZoom] = (0, react.useState)(1);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [natural, setNatural] = (0, react.useState)(void 0);
			const [viewport, setViewport] = (0, react.useState)(void 0);
			const dragRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setZoom(1);
				setNatural(void 0);
				setDragging(false);
				setLogOpen(true);
				dragRef.current = null;
			}, [relativePath]);
			(0, react.useEffect)(() => {
				const el = viewportRef.current;
				if (el === null) return;
				const sync = () => {
					setViewport({
						width: el.clientWidth,
						height: el.clientHeight
					});
				};
				sync();
				const observer = new ResizeObserver(sync);
				observer.observe(el);
				const onWheelNative = (event) => {
					event.preventDefault();
					const direction = event.deltaY < 0 ? 1 : -1;
					setZoom((current) => Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round((current + direction * PREVIEW_ZOOM_STEP) * 100) / 100)));
				};
				el.addEventListener("wheel", onWheelNative, { passive: false });
				return () => {
					observer.disconnect();
					el.removeEventListener("wheel", onWheelNative);
				};
			}, [logOpen]);
			const fitScale = natural !== void 0 && viewport !== void 0 && natural.width > 0 && natural.height > 0 ? Math.min(viewport.width / natural.width, viewport.height / natural.height, 1) : 1;
			const displayWidth = natural !== void 0 ? Math.max(1, natural.width * fitScale * zoom) : void 0;
			const displayHeight = natural !== void 0 ? Math.max(1, natural.height * fitScale * zoom) : void 0;
			const setClampedZoom = (next) => {
				setZoom(Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round(next * 100) / 100)));
			};
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				const el = viewportRef.current;
				if (el === null) return;
				dragRef.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					scrollLeft: el.scrollLeft,
					scrollTop: el.scrollTop
				};
				setDragging(true);
				el.setPointerCapture(event.pointerId);
			};
			const onPointerMove = (event) => {
				const drag = dragRef.current;
				const el = viewportRef.current;
				if (drag === null || el === null || drag.pointerId !== event.pointerId) return;
				el.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
				el.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
			};
			const endDrag = (event) => {
				const drag = dragRef.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				dragRef.current = null;
				setDragging(false);
				try {
					event.currentTarget.releasePointerCapture(event.pointerId);
				} catch {}
			};
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.lightbox,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("panel.preview"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: PhotoPickConfigPanel_module_css_default.lightboxMask,
					"aria-label": t("panel.previewClose"),
					onClick: onClose
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PhotoPickConfigPanel_module_css_default.lightboxCard,
					"data-log-open": logOpen || void 0,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.lightboxHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.cardPath,
							title: relativePath,
							children: relativePath
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PhotoPickConfigPanel_module_css_default.lightboxZoom,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									disabled: zoom <= PREVIEW_ZOOM_MIN,
									title: t("panel.previewZoomOut"),
									"aria-label": t("panel.previewZoomOut"),
									onClick: () => {
										setClampedZoom(zoom - PREVIEW_ZOOM_STEP);
									},
									children: "−"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: PhotoPickConfigPanel_module_css_default.lightboxZoomValue,
									children: [Math.round(zoom * 100), "%"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									disabled: zoom >= PREVIEW_ZOOM_MAX,
									title: t("panel.previewZoomIn"),
									"aria-label": t("panel.previewZoomIn"),
									onClick: () => {
										setClampedZoom(zoom + PREVIEW_ZOOM_STEP);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 12 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: zoom === 1,
									title: t("panel.previewZoomReset"),
									onClick: () => {
										setZoom(1);
									},
									children: t("panel.previewZoomReset")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PhotoPickConfigPanel_module_css_default.lightboxTab,
									"data-active": logOpen || void 0,
									title: logOpen ? t("panel.tabDetailHide") : t("panel.tabDetailShow"),
									"aria-pressed": logOpen,
									onClick: () => {
										setLogOpen((open) => !open);
									},
									children: t("panel.tabDetail")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: onClose,
									children: t("panel.previewClose")
								})
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickConfigPanel_module_css_default.lightboxSplit,
						"data-log-open": logOpen || void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: PhotoPickConfigPanel_module_css_default.lightboxPreviewPane,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickConfigPanel_module_css_default.lightboxHint,
								children: t("panel.previewZoomHint")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: viewportRef,
								className: PhotoPickConfigPanel_module_css_default.lightboxViewport,
								"data-dragging": dragging || void 0,
								onPointerDown,
								onPointerMove,
								onPointerUp: endDrag,
								onPointerCancel: endDrag,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: PhotoPickConfigPanel_module_css_default.lightboxImage,
									src: photoPickFileUrl(root, relativePath),
									alt: relativePath,
									style: displayWidth !== void 0 && displayHeight !== void 0 ? {
										width: displayWidth,
										height: displayHeight
									} : void 0,
									onLoad: (event) => {
										setNatural({
											width: event.currentTarget.naturalWidth,
											height: event.currentTarget.naturalHeight
										});
									},
									draggable: false
								})
							})]
						}), logOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
							className: PhotoPickConfigPanel_module_css_default.lightboxLogPane,
							"aria-label": t("panel.tabDetail"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickConfigPanel_module_css_default.lightboxLog,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.path"),
										value: relativePath
									}),
									image !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.fileSize"),
										value: formatFileSize(image.size)
									}) : null,
									natural !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.imageSize"),
										value: `${natural.width} × ${natural.height}`
									}) : null,
									image !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.mtime"),
										value: formatMtime(image.mtimeMs)
									}) : null,
									image?.category !== void 0 && image.category.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.category"),
										value: image.category
									}) : null,
									image?.tagStatus !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogField, {
										label: t("panel.tagStatus"),
										value: tagStatusLabel(image.tagStatus, t),
										valueClass: tagStatusClass(image.tagStatus)
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickConfigPanel_module_css_default.logBlock,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PhotoPickConfigPanel_module_css_default.detailLabel,
											children: t("panel.description")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: image?.description !== void 0 && image.description.length > 0 ? image.description : "—" })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickConfigPanel_module_css_default.logBlock,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PhotoPickConfigPanel_module_css_default.detailLabel,
											children: t("panel.tags")
										}), image !== void 0 && image.tags.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PhotoPickConfigPanel_module_css_default.tags,
											children: image.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickConfigPanel_module_css_default.tag,
												children: tag
											}, tag))
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: PhotoPickConfigPanel_module_css_default.note,
											children: t("panel.noTags")
										})]
									})
								]
							})
						}) : null]
					})]
				})]
			}), document.body);
		}
		function LogField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickConfigPanel_module_css_default.logField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PhotoPickConfigPanel_module_css_default.detailLabel,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: props.valueClass,
					children: props.value
				})]
			});
		}
		/** Human-readable file size for detail panels. */
		function formatFileSize(bytes) {
			if (!Number.isFinite(bytes) || bytes < 0) return "—";
			if (bytes < 1024) return `${Math.round(bytes)} B`;
			const units = [
				"KB",
				"MB",
				"GB"
			];
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
			if (!Number.isFinite(mtimeMs) || mtimeMs <= 0) return "—";
			return new Date(mtimeMs).toLocaleString();
		}
		function tagStatusLabel(status, t) {
			if (status === "ok") return t("panel.tagOk");
			if (status === "failed") return t("panel.tagFailed");
			if (status === "skipped") return t("panel.tagSkipped");
			return t("panel.tagPending");
		}
		function tagStatusClass(status) {
			if (status === "ok") return PhotoPickConfigPanel_module_css_default.statusOk;
			if (status === "failed") return PhotoPickConfigPanel_module_css_default.statusFailed;
			if (status === "skipped") return PhotoPickConfigPanel_module_css_default.statusSkipped;
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
			const response = await fetch(url, { credentials: "same-origin" });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const base = ((await response.json()).images ?? []).map((image) => ({
				relativePath: image.relativePath,
				size: image.size,
				mtimeMs: image.mtimeMs,
				tags: []
			}));
			try {
				const mediaUrl = `${MEDIA_ASSETS_PATH}?root=${encodeURIComponent(root)}`;
				const mediaResponse = await fetch(mediaUrl, { credentials: "same-origin" });
				if (!mediaResponse.ok) return {
					images: base,
					mediaTagsAvailable: false
				};
				const mediaBody = await mediaResponse.json();
				const mediaByPath = /* @__PURE__ */ new Map();
				for (const asset of mediaBody.assets ?? []) mediaByPath.set(asset.relativePath, {
					tags: asset.tags ?? [],
					...typeof asset.description === "string" && asset.description.length > 0 ? { description: asset.description } : {},
					...typeof asset.category === "string" && asset.category.length > 0 ? { category: asset.category } : {},
					...asset.tagStatus !== void 0 ? { tagStatus: asset.tagStatus } : {}
				});
				return {
					images: base.map((image) => {
						const media = mediaByPath.get(image.relativePath);
						if (media === void 0) return image;
						return {
							...image,
							tags: media.tags,
							...media.description !== void 0 ? { description: media.description } : {},
							...media.category !== void 0 ? { category: media.category } : {},
							...media.tagStatus !== void 0 ? { tagStatus: media.tagStatus } : {}
						};
					}),
					mediaTagsAvailable: true
				};
			} catch {
				return {
					images: base,
					mediaTagsAvailable: false
				};
			}
		}
		function collectTagOptions(images) {
			const counts = /* @__PURE__ */ new Map();
			for (const image of images) for (const tag of image.tags) {
				const trimmed = tag.trim();
				if (trimmed.length === 0) continue;
				counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
			}
			return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], void 0, { sensitivity: "base" })).map(([name, count]) => ({
				name,
				count
			}));
		}
		function filterImagesByTags(images, selected) {
			if (selected.length === 0) return [...images];
			const wantUntagged = selected.includes(UNTAGGED_FILTER);
			const tags = selected.filter((tag) => tag !== UNTAGGED_FILTER);
			return images.filter((image) => {
				const untagged = image.tags.length === 0;
				if (wantUntagged && tags.length === 0) return untagged;
				if (wantUntagged && untagged) return true;
				if (tags.length === 0) return false;
				const lower = new Set(image.tags.map((tag) => tag.trim().toLowerCase()));
				return tags.every((tag) => lower.has(tag.toLowerCase()));
			});
		}
		function Breadcrumb(props) {
			const { dir, rootLabel, onNavigate } = props;
			const parts = dir.length === 0 ? [] : dir.split("/").filter(Boolean);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: PhotoPickConfigPanel_module_css_default.breadcrumb,
				"aria-label": rootLabel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: PhotoPickConfigPanel_module_css_default.breadcrumbCrumb,
					disabled: parts.length === 0,
					onClick: () => {
						onNavigate("");
					},
					children: rootLabel
				}), parts.map((part, index) => {
					const target = parts.slice(0, index + 1).join("/");
					const last = index === parts.length - 1;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: PhotoPickConfigPanel_module_css_default.breadcrumbItem,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickConfigPanel_module_css_default.breadcrumbSep,
							"aria-hidden": true,
							children: "/"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PhotoPickConfigPanel_module_css_default.breadcrumbCrumb,
							disabled: last,
							onClick: () => {
								onNavigate(target);
							},
							children: part
						})]
					}, target);
				})]
			});
		}
		function entriesInDirectory(images, dir) {
			const prefix = dir.length === 0 ? "" : `${dir}/`;
			const folders = /* @__PURE__ */ new Set();
			const files = [];
			for (const image of images) {
				if (!image.relativePath.startsWith(prefix)) continue;
				const rest = image.relativePath.slice(prefix.length);
				const slash = rest.indexOf("/");
				if (slash >= 0) {
					const name = rest.slice(0, slash);
					if (name.length > 0) folders.add(name);
					continue;
				}
				if (rest.length > 0) files.push(image);
			}
			return {
				folders: [...folders],
				files
			};
		}
		function sortFolderNames(names, sort) {
			const out = [...names];
			out.sort((a, b) => a.localeCompare(b));
			if (sort === "name-desc") out.reverse();
			return out;
		}
		function sortImages(images, sort) {
			const out = [...images];
			switch (sort) {
				case "name-asc":
					out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
					break;
				case "name-desc":
					out.sort((a, b) => b.relativePath.localeCompare(a.relativePath));
					break;
				case "mtime-desc":
					out.sort((a, b) => b.mtimeMs - a.mtimeMs);
					break;
				case "mtime-asc":
					out.sort((a, b) => a.mtimeMs - b.mtimeMs);
					break;
				case "size-desc":
					out.sort((a, b) => b.size - a.size);
					break;
				case "size-asc":
					out.sort((a, b) => a.size - b.size);
					break;
				default: break;
			}
			return out;
		}
		function groupModels(models) {
			const order = [];
			const map = /* @__PURE__ */ new Map();
			for (const model of models) {
				let group = map.get(model.provider);
				if (group === void 0) {
					group = {
						provider: model.provider,
						label: model.providerName || model.provider,
						models: []
					};
					map.set(model.provider, group);
					order.push(model.provider);
				}
				group.models.push(model);
			}
			return order.map((id) => map.get(id));
		}
		function formatModelLabel(model, t) {
			if (model.supportsVision === true) return `${model.name} · ${t("visionCapable")}`;
			if (model.supportsVision === false) return `${model.name} · ${t("textOnly")}`;
			return model.name;
		}
		//#endregion
		//#region src/client/rank-meta.ts
		/**
		* Read ranking metadata from a tool-result block's `meta` field.
		* @param meta - `ToolResultNode.meta` (presentationMeta payload).
		*/
		function parsePhotoPickRankMeta(meta) {
			if (meta === null || typeof meta !== "object" || Array.isArray(meta)) return void 0;
			const raw = meta;
			if (!Array.isArray(raw.ranked)) return void 0;
			const ranked = [];
			for (const item of raw.ranked) {
				if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
				const row = item;
				if (typeof row.relativePath !== "string" || typeof row.score !== "number") continue;
				if (!Array.isArray(row.reasons) || !Array.isArray(row.flaws)) continue;
				const reasons = row.reasons.filter((x) => typeof x === "string");
				const flaws = row.flaws.filter((x) => typeof x === "string");
				ranked.push({
					relativePath: row.relativePath,
					score: row.score,
					reasons,
					flaws,
					...typeof row.error === "string" ? { error: row.error } : {}
				});
			}
			if (ranked.length === 0) return void 0;
			return {
				ranked,
				visionProvider: typeof raw.visionProvider === "string" ? raw.visionProvider : "",
				visionModel: typeof raw.visionModel === "string" ? raw.visionModel : "",
				visionCalls: typeof raw.visionCalls === "number" ? raw.visionCalls : ranked.length
			};
		}
		//#endregion
		//#region \0dsh-css:E:\Develop-MyProject\deepseek-harness-xy\xy-dev\plugins\photo-pick\dsh-photo-pick-ui\src\client\PhotoPickCompareDialog.module.css.mjs
		const css$1 = "._29yubW_root{z-index:1200;justify-content:center;align-items:center;padding:8px 12px;display:flex;position:fixed;inset:0}._29yubW_mask{backdrop-filter:blur(8px);cursor:pointer;background:#00000073;border:none;position:absolute;inset:0}._29yubW_card{z-index:1;border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent);background:var(--dsw-alias-bg-layer-1);border-radius:8px;flex-direction:column;gap:0;width:min(1760px,99vw);height:min(99vh,1200px);max-height:100%;padding:0;display:flex;position:relative;overflow:hidden;box-shadow:0 16px 48px #00000047,0 2px 8px #0000001f}._29yubW_head{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex:none;justify-content:space-between;align-items:center;gap:12px;min-height:40px;padding:0 4px 0 16px;display:flex}._29yubW_headStart{flex-direction:column;gap:0;min-width:0;display:flex}._29yubW_title{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:20px}._29yubW_meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}._29yubW_headEnd{flex-wrap:wrap;flex:none;justify-content:flex-end;align-items:center;gap:6px;display:inline-flex}._29yubW_zoomBar{background:0 0;border:none;border-radius:4px;align-items:center;gap:2px;padding:0;display:inline-flex}._29yubW_zoomValue{text-align:center;min-width:44px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}._29yubW_modeToggle{background:0 0;border:none;border-radius:4px;display:inline-flex;overflow:hidden}._29yubW_modeBtn{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:550;line-height:18px;transition:background .1s,color .1s}._29yubW_modeBtn:hover:not(:disabled):not([data-active]){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}._29yubW_modeBtn[data-active]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._29yubW_modeBtn:disabled{opacity:.45;cursor:default}._29yubW_close{width:46px;height:40px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:0;justify-content:center;align-items:center;transition:background .1s,color .1s;display:inline-flex}._29yubW_close:hover{color:#fff;background:#c42b1c;border-color:#0000}._29yubW_hint{border:none;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 35%, transparent);color:var(--dsw-alias-label-tertiary);background:0 0;border-radius:0;flex:none;margin:0;padding:6px 16px;font-size:11px;line-height:16px}._29yubW_body{flex:auto;grid-template-rows:minmax(0,1fr);grid-template-columns:1fr;align-items:stretch;gap:0;min-height:0;padding:8px 12px;display:grid;overflow:hidden}._29yubW_mainRow{flex-direction:row;flex:auto;min-height:0;display:flex;overflow:hidden}._29yubW_mainRow ._29yubW_body{flex:auto}._29yubW_mainRow[data-detail] ._29yubW_body{min-width:0}._29yubW_detailPane{border-left:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex:0 0 min(320px,34vw);min-width:240px;max-width:380px;padding:10px 14px 12px;overflow:auto}._29yubW_detailLog{flex-direction:column;gap:10px;display:flex}._29yubW_detailField{color:var(--dsw-alias-label-primary);word-break:break-word;grid-template-columns:72px minmax(0,1fr);align-items:start;gap:8px;font-size:12px;line-height:18px;display:grid}._29yubW_detailLabel{color:var(--dsw-alias-label-tertiary);font-weight:600;display:block}._29yubW_detailBlock{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:4px;font-size:12px;line-height:17px;display:flex}._29yubW_detailBlock ul{margin:0;padding-left:16px}._29yubW_body[data-split]{grid-template-columns:1fr 1fr;gap:8px}._29yubW_pane{outline-offset:-2px;background:0 0;border:none;border-radius:4px;outline:2px solid #0000;flex-direction:column;gap:6px;min-width:0;height:100%;min-height:0;padding:4px;transition:background .1s,outline-color .1s;display:flex;overflow:hidden}._29yubW_pane[data-focused]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent);outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);box-shadow:none;border-color:#0000}._29yubW_paneHead{box-sizing:border-box;flex:0 0 32px;align-items:center;gap:8px;min-width:0;height:32px;min-height:32px;max-height:32px;display:flex;overflow:hidden}._29yubW_sideTag{background:var(--dsw-alias-interactive-bg-hover);height:22px;color:var(--dsw-alias-label-primary);border-radius:4px;flex:none;align-items:center;padding:0 7px;font-size:11px;font-weight:700;line-height:1;display:inline-flex}._29yubW_panePass{width:28px;height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;font-size:16px;line-height:1;transition:background .1s,color .1s;display:inline-flex}._29yubW_panePass:hover:not(:disabled){color:#fff;background:#c42b1c;border-color:#0000;transform:none}._29yubW_panePass:disabled{opacity:.4;cursor:default}._29yubW_paneHeadActions{z-index:2;flex:none;align-items:center;gap:2px;margin-left:auto;display:inline-flex;position:relative}._29yubW_paneAction{width:28px;height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;font-size:16px;line-height:1;transition:background .1s,color .1s;display:inline-flex}._29yubW_paneAction:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}._29yubW_paneAction:disabled{opacity:.4;cursor:default}._29yubW_panePassAction{width:28px;height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;font-size:16px;line-height:1;transition:background .1s,color .1s;display:inline-flex}._29yubW_panePassAction:hover:not(:disabled){color:#fff;background:#c42b1c}._29yubW_panePassAction:disabled{opacity:.4;cursor:default}._29yubW_rankBadge{background:var(--dsw-alias-bg-layer-2);height:24px;color:var(--dsw-alias-label-primary);box-sizing:border-box;box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-border-l2) 80%, transparent);border-radius:6px;flex:none;align-items:center;gap:1px;padding:0 8px;line-height:1;display:inline-flex}._29yubW_rankBadgeHash{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;line-height:1}._29yubW_rankBadgeNum{font-variant-numeric:tabular-nums;letter-spacing:-.02em;font-size:15px;font-weight:700;line-height:1}._29yubW_scoreBadge{background:color-mix(in srgb, #0f766e 12%, var(--dsw-alias-bg-layer-2));color:#0f766e;box-sizing:border-box;border-radius:6px;flex:none;align-items:center;gap:3px;height:24px;padding:0 10px;line-height:1;display:inline-flex;box-shadow:inset 0 0 0 1px #0f766e47}._29yubW_scoreBadgeValue{font-variant-numeric:tabular-nums;letter-spacing:-.02em;font-size:16px;font-weight:750;line-height:1}._29yubW_scoreBadgeUnit{opacity:.85;font-size:11px;font-weight:600;line-height:1}._29yubW_path{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1 1 0;font-size:12px;line-height:32px;overflow:hidden}._29yubW_preview{background:var(--dsw-alias-bg-layer-2);cursor:grab;touch-action:none;border-radius:4px;flex:1 1 0;place-items:center;min-width:0;min-height:0;display:grid;position:relative;overflow:hidden}._29yubW_preview[data-dragging]{cursor:grabbing}._29yubW_previewImage{object-fit:contain;object-position:center;user-select:none;pointer-events:none;transform-origin:50%;will-change:transform;max-width:100%;max-height:100%;display:block}._29yubW_notes{box-sizing:border-box;border:none;border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 35%, transparent);background:0 0;border-radius:0;flex:0 0 120px;grid-template-columns:1fr 1fr;gap:14px;height:120px;min-height:120px;max-height:120px;padding:8px 4px 2px;display:grid;overflow:auto}._29yubW_noteBlock{min-width:0;color:var(--dsw-alias-label-secondary);flex-direction:column;gap:8px;font-size:12px;line-height:17px;display:flex}._29yubW_noteLabel{letter-spacing:.01em;color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;font-size:11px;font-weight:600;line-height:16px;display:inline-flex}._29yubW_noteLabel:before{content:\"\";background:var(--dsw-alias-label-tertiary);border-radius:50%;width:6px;height:6px}._29yubW_noteLabel[data-kind=pro]:before{background:#3d8b6e}._29yubW_noteLabel[data-kind=con]:before{background:#c07850}._29yubW_noteLabel[data-kind=pro],._29yubW_noteLabel[data-kind=con]{color:var(--dsw-alias-label-secondary)}._29yubW_chipList{flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;display:flex}._29yubW_chip{max-width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-border-l2) 70%, transparent);-webkit-line-clamp:2;line-clamp:2;white-space:normal;word-break:break-word;border-radius:8px;-webkit-box-orient:vertical;padding:5px 10px;font-size:12px;font-weight:450;line-height:18px;display:-webkit-box;overflow:hidden}._29yubW_chip[data-kind=pro]{background:color-mix(in srgb, #3d8b6e 8%, var(--dsw-alias-bg-layer-2));box-shadow:inset 0 0 0 1px #3d8b6e38}._29yubW_chip[data-kind=con]{background:color-mix(in srgb, #c07850 9%, var(--dsw-alias-bg-layer-2));box-shadow:inset 0 0 0 1px #c078503d}._29yubW_noteEmpty{color:var(--dsw-alias-label-tertiary);margin:0}._29yubW_error{color:var(--dsw-alias-label-error);grid-column:1/-1;margin:0}._29yubW_foot{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent);flex-direction:column;flex:none;gap:6px;padding:8px 12px 10px;display:flex}._29yubW_nav{justify-content:center;align-items:center;gap:12px;display:flex}._29yubW_position{text-align:center;min-width:96px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}._29yubW_emptyQueue{background:var(--dsw-alias-bg-layer-2);border:none;border-radius:4px;flex-direction:column;flex:auto;justify-content:center;align-items:center;gap:10px;min-height:160px;display:flex}._29yubW_queueBlock,._29yubW_trashBlock{background:0 0;border:none;border-radius:0;flex-direction:column;gap:6px;min-width:0;padding:4px 0 0;display:flex}._29yubW_queueHead{justify-content:space-between;align-items:center;gap:8px;display:flex}._29yubW_queueTitle,._29yubW_trashToggle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px}._29yubW_queueHint{color:var(--dsw-alias-brand-primary);font-size:11px;line-height:16px}._29yubW_trashToggle{cursor:pointer;background:0 0;border:none;border-radius:4px;align-items:center;gap:6px;width:fit-content;padding:2px 4px;transition:background .1s,color .1s;display:inline-flex}._29yubW_trashToggle:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}._29yubW_trashChevron{transition:transform .15s;display:inline-block}._29yubW_trashChevron[data-open]{transform:rotate(180deg)}._29yubW_trashEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:16px}._29yubW_thumbs{gap:8px;margin:0;padding:2px 0 4px;list-style:none;display:flex;overflow-x:auto}._29yubW_thumbItem{flex:none;position:relative}._29yubW_thumb{background:var(--dsw-alias-bg-layer-2);cursor:pointer;outline-offset:-2px;border:none;border-radius:4px;outline:2px solid #0000;width:68px;height:68px;padding:0;transition:outline-color .1s;display:block;position:relative;overflow:hidden}._29yubW_thumb:hover{outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);border-color:#0000;transform:none}._29yubW_thumb[data-active]{outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);border-color:#0000}._29yubW_thumb[data-focus]{outline-color:var(--dsw-alias-brand-primary);box-shadow:none;border-color:#0000}._29yubW_thumb[data-trashed]{opacity:.72;filter:grayscale(.25)}._29yubW_thumb img{object-fit:cover;width:100%;height:100%;display:block}._29yubW_thumbBadge{color:#fff;background:#b47012;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;line-height:16px;position:absolute;top:4px;left:4px;box-shadow:0 1px 4px #0000004d}._29yubW_thumbSide{color:#fff;background:#2d394b;border-radius:999px;padding:1px 6px;font-size:10px;font-weight:700;line-height:14px;position:absolute;top:4px;right:4px}._29yubW_thumbScore{color:#fff;font-variant-numeric:tabular-nums;background:#0e6d65;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:800;line-height:18px;position:absolute;bottom:4px;right:4px;box-shadow:0 1px 4px #0000004d}._29yubW_thumbPass,._29yubW_thumbRestore{z-index:1;background:var(--dsw-alias-bg-layer-1);width:20px;height:20px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border:none;border-radius:4px;justify-content:center;align-items:center;font-size:14px;line-height:1;transition:background .1s,color .1s;display:inline-flex;position:absolute;top:-4px;right:-4px;box-shadow:0 1px 3px #0000002e}._29yubW_thumbPass:hover:not(:disabled){color:#fff;background:#c42b1c;border-color:#0000;transform:none}._29yubW_thumbRestore:hover{color:#fff;background:var(--dsw-alias-brand-primary);border-color:#0000;transform:none}._29yubW_thumbPass:disabled{opacity:.35;cursor:default}@media (width<=900px){._29yubW_body[data-split],._29yubW_notes{grid-template-columns:1fr}}";
		const tagId$1 = "dsh-photo-pick-ui/PhotoPickCompareDialog.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-photo-pick-ui";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var PhotoPickCompareDialog_module_css_default = {
			"hint": "_29yubW_hint",
			"chip": "_29yubW_chip",
			"detailField": "_29yubW_detailField",
			"card": "_29yubW_card",
			"path": "_29yubW_path",
			"headEnd": "_29yubW_headEnd",
			"preview": "_29yubW_preview",
			"zoomValue": "_29yubW_zoomValue",
			"modeBtn": "_29yubW_modeBtn",
			"mainRow": "_29yubW_mainRow",
			"paneHead": "_29yubW_paneHead",
			"rankBadgeNum": "_29yubW_rankBadgeNum",
			"noteBlock": "_29yubW_noteBlock",
			"position": "_29yubW_position",
			"noteLabel": "_29yubW_noteLabel",
			"detailBlock": "_29yubW_detailBlock",
			"detailLog": "_29yubW_detailLog",
			"thumbBadge": "_29yubW_thumbBadge",
			"close": "_29yubW_close",
			"trashBlock": "_29yubW_trashBlock",
			"thumbSide": "_29yubW_thumbSide",
			"nav": "_29yubW_nav",
			"error": "_29yubW_error",
			"pane": "_29yubW_pane",
			"trashEmpty": "_29yubW_trashEmpty",
			"notes": "_29yubW_notes",
			"paneAction": "_29yubW_paneAction",
			"thumbPass": "_29yubW_thumbPass",
			"zoomBar": "_29yubW_zoomBar",
			"queueHint": "_29yubW_queueHint",
			"thumb": "_29yubW_thumb",
			"noteEmpty": "_29yubW_noteEmpty",
			"rankBadgeHash": "_29yubW_rankBadgeHash",
			"title": "_29yubW_title",
			"panePass": "_29yubW_panePass",
			"trashChevron": "_29yubW_trashChevron",
			"paneHeadActions": "_29yubW_paneHeadActions",
			"trashToggle": "_29yubW_trashToggle",
			"thumbRestore": "_29yubW_thumbRestore",
			"previewImage": "_29yubW_previewImage",
			"modeToggle": "_29yubW_modeToggle",
			"foot": "_29yubW_foot",
			"detailPane": "_29yubW_detailPane",
			"queueBlock": "_29yubW_queueBlock",
			"body": "_29yubW_body",
			"rankBadge": "_29yubW_rankBadge",
			"thumbScore": "_29yubW_thumbScore",
			"head": "_29yubW_head",
			"queueTitle": "_29yubW_queueTitle",
			"thumbs": "_29yubW_thumbs",
			"emptyQueue": "_29yubW_emptyQueue",
			"scoreBadgeUnit": "_29yubW_scoreBadgeUnit",
			"queueHead": "_29yubW_queueHead",
			"headStart": "_29yubW_headStart",
			"detailLabel": "_29yubW_detailLabel",
			"panePassAction": "_29yubW_panePassAction",
			"mask": "_29yubW_mask",
			"sideTag": "_29yubW_sideTag",
			"root": "_29yubW_root",
			"meta": "_29yubW_meta",
			"scoreBadge": "_29yubW_scoreBadge",
			"thumbItem": "_29yubW_thumbItem",
			"scoreBadgeValue": "_29yubW_scoreBadgeValue",
			"chipList": "_29yubW_chipList"
		};
		//#endregion
		//#region src/client/PhotoPickCompareDialog.tsx
		/**
		* Ranked photo compare dialog: free pair pick, synced zoom/pan, and a trash queue.
		* @module dsh-photo-pick-ui/client/PhotoPickCompareDialog
		*/
		const ZOOM_MIN = .25;
		const ZOOM_MAX = 5;
		const ZOOM_STEP = .25;
		/**
		* Full-screen compare overlay for scored photo_pick_best results.
		* Active thumbs stay in the compare queue; passed photos move to a recycle bin
		* and can be restored. In split mode, thumbs assign left/right freely.
		* @param props - root, ranking, close, locale.
		*/
		function PhotoPickCompareDialog(props) {
			const { root, meta, initialPath, onClose, t } = props;
			const allRows = meta.ranked;
			const rankByPath = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				allRows.forEach((row, i) => {
					map.set(row.relativePath, i + 1);
				});
				return map;
			}, [allRows]);
			const rowByPath = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const row of allRows) map.set(row.relativePath, row);
				return map;
			}, [allRows]);
			const initialLeft = initialPath !== void 0 && allRows.some((row) => row.relativePath === initialPath) ? initialPath : allRows[0]?.relativePath ?? "";
			const initialRight = allRows.find((row) => row.relativePath !== initialLeft)?.relativePath ?? initialLeft;
			const [activePaths, setActivePaths] = (0, react.useState)(() => allRows.map((r) => r.relativePath));
			const [trashPaths, setTrashPaths] = (0, react.useState)([]);
			const [leftPath, setLeftPath] = (0, react.useState)(initialLeft);
			const [rightPath, setRightPath] = (0, react.useState)(initialRight);
			const [focusSide, setFocusSide] = (0, react.useState)("left");
			const [mode, setMode] = (0, react.useState)(() => allRows.length >= 2 ? "split" : "single");
			const [trashOpen, setTrashOpen] = (0, react.useState)(false);
			const [detailOpen, setDetailOpen] = (0, react.useState)(false);
			const [zoom, setZoom] = (0, react.useState)(1);
			const [pan, setPan] = (0, react.useState)({
				x: 0,
				y: 0
			});
			const [focusedNatural, setFocusedNatural] = (0, react.useState)(void 0);
			const resetView = (0, react.useCallback)(() => {
				setZoom(1);
				setPan({
					x: 0,
					y: 0
				});
			}, []);
			(0, react.useEffect)(() => {
				const paths = allRows.map((r) => r.relativePath);
				const nextLeft = initialPath !== void 0 && paths.includes(initialPath) ? initialPath : paths[0] ?? "";
				const nextRight = paths.find((path) => path !== nextLeft) ?? nextLeft;
				setActivePaths(paths);
				setTrashPaths([]);
				setLeftPath(nextLeft);
				setRightPath(nextRight);
				setFocusSide("left");
				setMode(paths.length >= 2 ? "split" : "single");
				setTrashOpen(false);
				resetView();
			}, [
				meta,
				allRows,
				initialPath,
				resetView
			]);
			const activeRows = (0, react.useMemo)(() => activePaths.map((path) => rowByPath.get(path)).filter((row) => row !== void 0), [activePaths, rowByPath]);
			const trashRows = (0, react.useMemo)(() => trashPaths.map((path) => rowByPath.get(path)).filter((row) => row !== void 0), [trashPaths, rowByPath]);
			(0, react.useEffect)(() => {
				if (activePaths.length === 0) return;
				const leftOk = activePaths.includes(leftPath);
				const rightOk = activePaths.includes(rightPath);
				if (!leftOk) {
					const nextLeft = activePaths[0];
					setLeftPath(nextLeft);
					if (!rightOk || rightPath === nextLeft) setRightPath(activePaths[1] ?? nextLeft);
					return;
				}
				if (!rightOk) setRightPath(activePaths.find((path) => path !== leftPath) ?? leftPath);
			}, [
				activePaths,
				leftPath,
				rightPath
			]);
			(0, react.useEffect)(() => {
				if (mode === "split" && activePaths.length < 2) setMode("single");
			}, [mode, activePaths.length]);
			const split = mode === "split" && activePaths.length >= 2 && leftPath.length > 0 && rightPath.length > 0;
			(0, react.useEffect)(() => {
				resetView();
			}, [
				leftPath,
				rightPath,
				mode,
				detailOpen,
				resetView
			]);
			const moveFocusAlongQueue = (0, react.useCallback)((delta) => {
				if (activePaths.length === 0) return;
				const current = focusSide === "left" ? leftPath : rightPath;
				let next = Math.max(0, activePaths.indexOf(current));
				for (let step = 0; step < activePaths.length; step += 1) {
					next = (next + delta + activePaths.length) % activePaths.length;
					const candidate = activePaths[next];
					if (!split || candidate !== (focusSide === "left" ? rightPath : leftPath) || activePaths.length === 1) {
						if (focusSide === "left") setLeftPath(candidate);
						else setRightPath(candidate);
						return;
					}
				}
			}, [
				activePaths,
				focusSide,
				leftPath,
				rightPath,
				split
			]);
			(0, react.useEffect)(() => {
				const onKey = (event) => {
					if (event.key === "Escape") {
						onClose();
						return;
					}
					if (event.key === "ArrowLeft") {
						moveFocusAlongQueue(-1);
						return;
					}
					if (event.key === "ArrowRight") moveFocusAlongQueue(1);
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [onClose, moveFocusAlongQueue]);
			if (allRows.length === 0) return null;
			const left = rowByPath.get(leftPath);
			const right = rowByPath.get(rightPath);
			const setClampedZoom = (0, react.useCallback)((next) => {
				setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100)));
			}, []);
			const onZoomDelta = (0, react.useCallback)((delta) => {
				setZoom((current) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((current + delta) * 100) / 100)));
			}, []);
			const layoutKey = `${mode}:${detailOpen ? "1" : "0"}`;
			const passPhoto = (path) => {
				if (!activePaths.includes(path)) return;
				setActivePaths((current) => current.filter((item) => item !== path));
				setTrashPaths((current) => current.includes(path) ? current : [...current, path]);
				setTrashOpen(true);
			};
			const restorePhoto = (path) => {
				if (!trashPaths.includes(path)) return;
				setTrashPaths((current) => current.filter((item) => item !== path));
				setActivePaths((current) => insertByOriginalOrder(current, path, allRows));
			};
			const onThumbClick = (path) => {
				if (!split) {
					setLeftPath(path);
					setFocusSide("left");
					return;
				}
				if (path === leftPath) {
					setFocusSide("left");
					return;
				}
				if (path === rightPath) {
					setFocusSide("right");
					return;
				}
				if (focusSide === "left") setLeftPath(path);
				else setRightPath(path);
			};
			const enterSplit = () => {
				if (activePaths.length < 2) return;
				setMode("split");
				if (leftPath === rightPath || !activePaths.includes(rightPath)) setRightPath(activePaths.find((path) => path !== leftPath) ?? activePaths[1]);
				setFocusSide("right");
			};
			const showLeft = left ?? activeRows[0];
			const showRight = right ?? activeRows[1] ?? activeRows[0];
			const canNavigate = activePaths.length > 1;
			const focusedRow = split ? focusSide === "left" ? showLeft : showRight : showLeft;
			const focusedRank = focusedRow !== void 0 ? rankByPath.get(focusedRow.relativePath) ?? 1 : 1;
			(0, react.useEffect)(() => {
				setFocusedNatural(void 0);
			}, [focusedRow?.relativePath]);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickCompareDialog_module_css_default.root,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("compare.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: PhotoPickCompareDialog_module_css_default.mask,
					"aria-label": t("compare.close"),
					onClick: onClose
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PhotoPickCompareDialog_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: PhotoPickCompareDialog_module_css_default.head,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.headStart,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: PhotoPickCompareDialog_module_css_default.title,
									children: t("compare.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: PhotoPickCompareDialog_module_css_default.meta,
									children: [meta.visionProvider.length > 0 && meta.visionModel.length > 0 ? `${meta.visionProvider} / ${meta.visionModel}` : null, meta.visionCalls > 0 ? ` · ${t("compare.calls").replace("{n}", String(meta.visionCalls))}` : null]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.headEnd,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickCompareDialog_module_css_default.zoomBar,
										role: "group",
										"aria-label": t("compare.zoom"),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: zoom <= ZOOM_MIN,
												title: t("panel.previewZoomOut"),
												"aria-label": t("panel.previewZoomOut"),
												onClick: () => {
													setClampedZoom(zoom - ZOOM_STEP);
												},
												children: "−"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: PhotoPickCompareDialog_module_css_default.zoomValue,
												children: [Math.round(zoom * 100), "%"]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: zoom >= ZOOM_MAX,
												title: t("panel.previewZoomIn"),
												"aria-label": t("panel.previewZoomIn"),
												onClick: () => {
													setClampedZoom(zoom + ZOOM_STEP);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 12 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												disabled: zoom === 1 && pan.x === 0 && pan.y === 0,
												title: t("panel.previewZoomReset"),
												onClick: resetView,
												children: t("panel.previewZoomReset")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickCompareDialog_module_css_default.modeToggle,
										role: "group",
										"aria-label": t("compare.mode"),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: PhotoPickCompareDialog_module_css_default.modeBtn,
											"data-active": mode === "single" || void 0,
											onClick: () => {
												setMode("single");
												setFocusSide("left");
												resetView();
											},
											children: t("compare.modeSingle")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: PhotoPickCompareDialog_module_css_default.modeBtn,
											"data-active": mode === "split" || void 0,
											disabled: activePaths.length < 2,
											onClick: () => {
												enterSplit();
												resetView();
											},
											children: t("compare.modeSplit")
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.modeBtn,
										"data-active": detailOpen || void 0,
										title: detailOpen ? t("panel.tabDetailHide") : t("panel.tabDetailShow"),
										"aria-pressed": detailOpen,
										onClick: () => {
											setDetailOpen((open) => !open);
										},
										children: t("compare.tabDetail")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.close,
										"aria-label": t("compare.close"),
										onClick: onClose,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PhotoPickCompareDialog_module_css_default.hint,
							children: split ? t("compare.hintSplitPick") : t("compare.hintSingle")
						}),
						showLeft === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PhotoPickCompareDialog_module_css_default.emptyQueue,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickCompareDialog_module_css_default.noteEmpty,
								children: t("compare.queueEmpty")
							}), trashRows.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => {
									setTrashOpen(true);
								},
								children: t("compare.trashOpen")
							}) : null]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PhotoPickCompareDialog_module_css_default.mainRow,
							"data-detail": detailOpen || void 0,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.body,
								"data-split": split || void 0,
								children: [showLeft !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankPane, {
									root,
									row: showLeft,
									rank: rankByPath.get(showLeft.relativePath) ?? 1,
									...split ? { sideLabel: t("compare.sideLeft") } : {},
									focused: split && focusSide === "left",
									onFocus: () => {
										setFocusSide("left");
									},
									onPass: () => {
										passPhoto(showLeft.relativePath);
									},
									t,
									zoom,
									pan,
									onZoomDelta,
									onPanChange: setPan,
									...!split || focusSide === "left" ? { onNaturalSize: setFocusedNatural } : {}
								}, `L:${layoutKey}:${showLeft.relativePath}`) : null, split && showRight !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankPane, {
									root,
									row: showRight,
									rank: rankByPath.get(showRight.relativePath) ?? 1,
									sideLabel: t("compare.sideRight"),
									focused: focusSide === "right",
									onFocus: () => {
										setFocusSide("right");
									},
									onPass: () => {
										passPhoto(showRight.relativePath);
									},
									t,
									zoom,
									pan,
									onZoomDelta,
									onPanChange: setPan,
									...focusSide === "right" ? { onNaturalSize: setFocusedNatural } : {}
								}, `R:${layoutKey}:${showRight.relativePath}`) : null]
							}), detailOpen && focusedRow !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
								className: PhotoPickCompareDialog_module_css_default.detailPane,
								"aria-label": t("compare.tabDetail"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PhotoPickCompareDialog_module_css_default.detailLog,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailField,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.detailPath")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												title: focusedRow.relativePath,
												children: focusedRow.relativePath
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailField,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.detailRank")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["#", focusedRank] })]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailField,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.detailScore")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: focusedRow.score })]
										}),
										meta.visionProvider.length > 0 || meta.visionModel.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailField,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.detailModel")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: [meta.visionProvider, meta.visionModel].filter((s) => s.length > 0).join(" / ") })]
										}) : null,
										focusedNatural !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailField,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.detailSize")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
												focusedNatural.width,
												" × ",
												focusedNatural.height
											] })]
										}) : null,
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailBlock,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.reasons")
											}), focusedRow.reasons.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: focusedRow.reasons.map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, text)) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: PhotoPickCompareDialog_module_css_default.noteEmpty,
												children: t("compare.none")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: PhotoPickCompareDialog_module_css_default.detailBlock,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PhotoPickCompareDialog_module_css_default.detailLabel,
												children: t("compare.flaws")
											}), focusedRow.flaws.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: focusedRow.flaws.map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: text }, text)) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: PhotoPickCompareDialog_module_css_default.noteEmpty,
												children: t("compare.none")
											})]
										}),
										focusedRow.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: PhotoPickCompareDialog_module_css_default.error,
											children: focusedRow.error
										}) : null
									]
								})
							}) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: PhotoPickCompareDialog_module_css_default.foot,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PhotoPickCompareDialog_module_css_default.nav,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											disabled: !canNavigate,
											"aria-label": t("compare.prev"),
											onClick: () => {
												moveFocusAlongQueue(-1);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 14 }), t("compare.prev")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PhotoPickCompareDialog_module_css_default.position,
											children: split ? t("compare.positionPair").replace("{a}", String(rankByPath.get(leftPath) ?? "?")).replace("{b}", String(rankByPath.get(rightPath) ?? "?")).replace("{n}", String(activePaths.length)) : t("compare.position").replace("{i}", String(Math.max(1, activePaths.indexOf(leftPath) + 1))).replace("{n}", String(activePaths.length))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											disabled: !canNavigate,
											"aria-label": t("compare.next"),
											onClick: () => {
												moveFocusAlongQueue(1);
											},
											children: [t("compare.next"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 })]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PhotoPickCompareDialog_module_css_default.queueBlock,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PhotoPickCompareDialog_module_css_default.queueHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PhotoPickCompareDialog_module_css_default.queueTitle,
											children: t("compare.queueActive").replace("{n}", String(activeRows.length))
										}), split ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PhotoPickCompareDialog_module_css_default.queueHint,
											children: focusSide === "left" ? t("compare.focusLeft") : t("compare.focusRight")
										}) : null]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: PhotoPickCompareDialog_module_css_default.thumbs,
										children: activeRows.map((row) => {
											const path = row.relativePath;
											const rank = rankByPath.get(path) ?? 0;
											const isLeft = path === leftPath;
											const isRight = split && path === rightPath;
											const isFocus = split ? focusSide === "left" ? isLeft : isRight : isLeft;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
												className: PhotoPickCompareDialog_module_css_default.thumbItem,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: PhotoPickCompareDialog_module_css_default.thumb,
													"data-active": isLeft || isRight || void 0,
													"data-focus": isFocus || void 0,
													"data-side": isLeft && isRight ? "both" : isLeft ? "left" : isRight ? "right" : void 0,
													title: `#${rank} · ${row.score}`,
													onClick: () => {
														onThumbClick(path);
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
															src: fileUrl(root, path),
															alt: "",
															loading: "lazy"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: PhotoPickCompareDialog_module_css_default.thumbBadge,
															children: ["#", rank]
														}),
														isLeft || isRight ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickCompareDialog_module_css_default.thumbSide,
															children: isLeft && isRight ? "L/R" : isLeft ? "L" : "R"
														}) : null,
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickCompareDialog_module_css_default.thumbScore,
															children: row.score
														})
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: PhotoPickCompareDialog_module_css_default.thumbPass,
													title: t("compare.pass"),
													"aria-label": t("compare.pass"),
													onClick: (event) => {
														event.stopPropagation();
														passPhoto(path);
													},
													children: "−"
												})]
											}, path);
										})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PhotoPickCompareDialog_module_css_default.trashBlock,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.trashToggle,
										"aria-expanded": trashOpen,
										onClick: () => {
											setTrashOpen((current) => !current);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("compare.trash").replace("{n}", String(trashRows.length)) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PhotoPickCompareDialog_module_css_default.trashChevron,
											"data-open": trashOpen || void 0,
											children: "▾"
										})]
									}), trashOpen ? trashRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: PhotoPickCompareDialog_module_css_default.trashEmpty,
										children: t("compare.trashEmpty")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: PhotoPickCompareDialog_module_css_default.thumbs,
										children: trashRows.map((row) => {
											const path = row.relativePath;
											const rank = rankByPath.get(path) ?? 0;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
												className: PhotoPickCompareDialog_module_css_default.thumbItem,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: PhotoPickCompareDialog_module_css_default.thumb,
													"data-trashed": "",
													title: `#${rank} · ${row.score}`,
													onClick: () => {
														restorePhoto(path);
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
															src: fileUrl(root, path),
															alt: "",
															loading: "lazy"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: PhotoPickCompareDialog_module_css_default.thumbBadge,
															children: ["#", rank]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: PhotoPickCompareDialog_module_css_default.thumbScore,
															children: row.score
														})
													]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: PhotoPickCompareDialog_module_css_default.thumbRestore,
													title: t("compare.restore"),
													"aria-label": t("compare.restore"),
													onClick: () => {
														restorePhoto(path);
													},
													children: "+"
												})]
											}, path);
										})
									}) : null]
								})
							]
						})
					]
				})]
			}), document.body);
		}
		/**
		* Insert a path back into the active queue using original ranking order.
		* @param current - active paths.
		* @param path - restored path.
		* @param allRows - original ranked rows.
		*/
		function insertByOriginalOrder(current, path, allRows) {
			if (current.includes(path)) return [...current];
			const order = new Map(allRows.map((row, i) => [row.relativePath, i]));
			const next = [...current, path];
			next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
			return next;
		}
		function RankPane(props) {
			const { root, row, rank, sideLabel, focused, onFocus, onPass, t, zoom, pan, onZoomDelta, onPanChange, onNaturalSize } = props;
			const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath;
			const viewportRef = (0, react.useRef)(null);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [revealBusy, setRevealBusy] = (0, react.useState)(false);
			const [openBusy, setOpenBusy] = (0, react.useState)(false);
			const [natural, setNatural] = (0, react.useState)(void 0);
			const [viewport, setViewport] = (0, react.useState)(void 0);
			const dragRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setNatural(void 0);
			}, [row.relativePath]);
			(0, react.useEffect)(() => {
				onNaturalSize?.(natural);
			}, [natural, onNaturalSize]);
			(0, react.useLayoutEffect)(() => {
				const el = viewportRef.current;
				if (el === null) return;
				const sync = () => {
					const rect = el.getBoundingClientRect();
					const width = Math.floor(rect.width);
					const height = Math.floor(rect.height);
					if (width <= 0 || height <= 0) return;
					setViewport((current) => current !== void 0 && current.width === width && current.height === height ? current : {
						width,
						height
					});
				};
				sync();
				const raf = requestAnimationFrame(sync);
				const observer = new ResizeObserver(sync);
				observer.observe(el);
				const onWheelNative = (event) => {
					event.preventDefault();
					onZoomDelta((event.deltaY < 0 ? 1 : -1) * ZOOM_STEP);
				};
				el.addEventListener("wheel", onWheelNative, { passive: false });
				return () => {
					cancelAnimationFrame(raf);
					observer.disconnect();
					el.removeEventListener("wheel", onWheelNative);
				};
			}, [onZoomDelta]);
			const fitScale = natural !== void 0 && viewport !== void 0 && natural.width > 0 && natural.height > 0 ? Math.min(viewport.width / natural.width, viewport.height / natural.height) : void 0;
			const displayWidth = fitScale !== void 0 && natural !== void 0 ? Math.max(1, natural.width * fitScale) : void 0;
			const displayHeight = fitScale !== void 0 && natural !== void 0 ? Math.max(1, natural.height * fitScale) : void 0;
			const onPointerDown = (event) => {
				if (event.button !== 0) return;
				onFocus?.();
				const el = viewportRef.current;
				if (el === null) return;
				dragRef.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					originX: pan.x,
					originY: pan.y
				};
				setDragging(true);
				el.setPointerCapture(event.pointerId);
			};
			const onPointerMove = (event) => {
				const drag = dragRef.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				onPanChange({
					x: drag.originX + (event.clientX - drag.startX),
					y: drag.originY + (event.clientY - drag.startY)
				});
			};
			const endDrag = (event) => {
				const drag = dragRef.current;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				dragRef.current = null;
				setDragging(false);
				try {
					event.currentTarget.releasePointerCapture(event.pointerId);
				} catch {}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: PhotoPickCompareDialog_module_css_default.pane,
				"data-focused": focused || void 0,
				onClick: () => {
					onFocus?.();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickCompareDialog_module_css_default.paneHead,
						children: [
							sideLabel !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PhotoPickCompareDialog_module_css_default.sideTag,
								children: sideLabel
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: PhotoPickCompareDialog_module_css_default.rankBadge,
								title: `#${rank}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.rankBadgeHash,
									children: "#"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.rankBadgeNum,
									children: rank
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: PhotoPickCompareDialog_module_css_default.scoreBadge,
								title: t("compare.score").replace("{n}", String(row.score)),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.scoreBadgeValue,
									children: row.score
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.scoreBadgeUnit,
									children: t("compare.scoreUnit")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PhotoPickCompareDialog_module_css_default.path,
								title: row.relativePath,
								children: fileName
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.paneHeadActions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.paneAction,
										title: openBusy ? t("compare.openBusy") : t("compare.open"),
										"aria-label": t("compare.open"),
										"aria-busy": openBusy || void 0,
										disabled: openBusy,
										onClick: (event) => {
											event.stopPropagation();
											(async () => {
												setOpenBusy(true);
												try {
													await openInDefaultApp(root, row.relativePath, t);
												} finally {
													setOpenBusy(false);
												}
											})();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.paneAction,
										title: revealBusy ? t("compare.revealBusy") : t("compare.reveal"),
										"aria-label": t("compare.reveal"),
										"aria-busy": revealBusy || void 0,
										disabled: revealBusy,
										onClick: (event) => {
											event.stopPropagation();
											(async () => {
												setRevealBusy(true);
												try {
													await revealInFileManager(root, row.relativePath, t);
												} finally {
													setRevealBusy(false);
												}
											})();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 14 })
									}),
									onPass !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: PhotoPickCompareDialog_module_css_default.panePassAction,
										title: t("compare.pass"),
										"aria-label": t("compare.pass"),
										onClick: (event) => {
											event.stopPropagation();
											onPass();
										},
										children: "−"
									}) : null
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: viewportRef,
						className: PhotoPickCompareDialog_module_css_default.preview,
						"data-dragging": dragging || void 0,
						onPointerDown,
						onPointerMove,
						onPointerUp: endDrag,
						onPointerCancel: endDrag,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: PhotoPickCompareDialog_module_css_default.previewImage,
							src: fileUrl(root, row.relativePath),
							alt: row.relativePath,
							style: {
								...displayWidth !== void 0 && displayHeight !== void 0 ? {
									width: displayWidth,
									height: displayHeight
								} : {
									maxWidth: "100%",
									maxHeight: "100%"
								},
								transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
							},
							onLoad: (event) => {
								setNatural({
									width: event.currentTarget.naturalWidth,
									height: event.currentTarget.naturalHeight
								});
							},
							draggable: false
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickCompareDialog_module_css_default.notes,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.noteBlock,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.noteLabel,
									"data-kind": "pro",
									children: t("compare.reasons")
								}), row.reasons.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: PhotoPickCompareDialog_module_css_default.chipList,
									children: row.reasons.map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
										className: PhotoPickCompareDialog_module_css_default.chip,
										"data-kind": "pro",
										title: text,
										children: text
									}, text))
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: PhotoPickCompareDialog_module_css_default.noteEmpty,
									children: t("compare.none")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickCompareDialog_module_css_default.noteBlock,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickCompareDialog_module_css_default.noteLabel,
									"data-kind": "con",
									children: t("compare.flaws")
								}), row.flaws.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: PhotoPickCompareDialog_module_css_default.chipList,
									children: row.flaws.map((text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
										className: PhotoPickCompareDialog_module_css_default.chip,
										"data-kind": "con",
										title: text,
										children: text
									}, text))
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: PhotoPickCompareDialog_module_css_default.noteEmpty,
									children: t("compare.none")
								})]
							}),
							row.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PhotoPickCompareDialog_module_css_default.error,
								children: row.error
							}) : null
						]
					})
				]
			});
		}
		function fileUrl(root, relativePath) {
			return `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(relativePath)}`;
		}
		/**
		* Ask the Host to open this photo with the OS default application.
		* @param root - workspace root.
		* @param relativePath - path under root.
		* @param t - locale thunk for failure toast text.
		*/
		async function openInDefaultApp(root, relativePath, t) {
			try {
				if (!(await fetch("/api/photo-pick/open", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						root,
						path: relativePath
					})
				})).ok) window.alert(t("compare.openFailed"));
			} catch {
				window.alert(t("compare.openFailed"));
			}
		}
		/**
		* Ask the Host to select this photo in the OS file manager.
		* @param root - workspace root.
		* @param relativePath - path under root.
		* @param t - locale thunk for failure toast text.
		*/
		async function revealInFileManager(root, relativePath, t) {
			try {
				if (!(await fetch("/api/photo-pick/reveal", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						root,
						path: relativePath
					})
				})).ok) window.alert(t("compare.revealFailed"));
			} catch {
				window.alert(t("compare.revealFailed"));
			}
		}
		//#endregion
		//#region \0dsh-css:E:\Develop-MyProject\deepseek-harness-xy\xy-dev\plugins\photo-pick\dsh-photo-pick-ui\src\client\PhotoPickResultRow.module.css.mjs
		const css = ".z7szZa_row{background:var(--dsw-alias-bg-layer-2);box-shadow:none;border:none;border-radius:4px;align-items:flex-start;gap:10px;padding:8px 10px;display:flex}.z7szZa_row:hover{border-color:#0000}.z7szZa_row[data-state=running]{outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);outline-offset:-2px;box-shadow:none;border-color:#0000}.z7szZa_row[data-state=error]{outline:2px solid color-mix(in srgb, var(--dsw-alias-label-error) 45%, transparent);outline-offset:-2px;border-color:#0000}.z7szZa_icon{color:var(--dsw-alias-label-secondary);flex:none;margin-top:2px;display:inline-flex}.z7szZa_main{flex-direction:column;flex:auto;gap:8px;min-width:0;display:flex}.z7szZa_titleLine{align-items:baseline;gap:6px;min-width:0;font-size:13px;line-height:20px;display:flex}.z7szZa_title{color:var(--dsw-alias-label-primary);flex:none;font-weight:600}.z7szZa_dot{color:var(--dsw-alias-label-tertiary);flex:none}.z7szZa_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-secondary);overflow:hidden}.z7szZa_rankStrip{background:0 0;border:none;border-radius:0;flex-direction:column;gap:6px;min-width:0;padding:0;display:flex}.z7szZa_rankHead{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.z7szZa_rankTitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px}.z7szZa_rankMore{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.z7szZa_thumbs{gap:8px;margin:0;padding:0;list-style:none;display:flex;overflow-x:auto}.z7szZa_thumbCard{text-align:left;cursor:pointer;width:96px;font:inherit;color:inherit;background:0 0;border:none;flex-direction:column;gap:4px;padding:0;display:flex}.z7szZa_thumbFrame{background:var(--dsw-alias-bg-layer-3);outline-offset:-2px;border:none;border-radius:4px;outline:2px solid #0000;width:96px;height:96px;transition:outline-color .1s;display:block;position:relative;overflow:hidden}.z7szZa_thumbCard:hover .z7szZa_thumbFrame{outline-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);box-shadow:none;border-color:#0000;transform:none}.z7szZa_thumbCard:hover .z7szZa_thumbImg{transform:none}.z7szZa_thumbImg{object-fit:cover;width:100%;height:100%;display:block}.z7szZa_thumbFallback{box-sizing:border-box;width:100%;height:100%;color:var(--dsw-alias-label-tertiary);text-align:center;place-items:center;padding:6px;font-size:10px;line-height:14px;display:grid}.z7szZa_thumbRank{color:#fff;background:#b47012;border-radius:999px;padding:1px 7px;font-size:12px;font-weight:800;line-height:18px;position:absolute;top:5px;left:5px;box-shadow:0 1px 4px #0000004d}.z7szZa_thumbScore{color:#fff;font-variant-numeric:tabular-nums;background:#0e6d65;border-radius:999px;padding:1px 8px;font-size:13px;font-weight:800;line-height:20px;position:absolute;bottom:5px;right:5px;box-shadow:0 1px 4px #0000004d}.z7szZa_thumbName{text-overflow:ellipsis;white-space:nowrap;width:100%;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;display:block;overflow:hidden}.z7szZa_actions{flex-wrap:wrap;align-items:center;gap:10px;display:flex}.z7szZa_hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}";
		const tagId = "dsh-photo-pick-ui/PhotoPickResultRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-photo-pick-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PhotoPickResultRow_module_css_default = {
			"rankHead": "z7szZa_rankHead",
			"thumbs": "z7szZa_thumbs",
			"thumbRank": "z7szZa_thumbRank",
			"thumbScore": "z7szZa_thumbScore",
			"title": "z7szZa_title",
			"thumbFrame": "z7szZa_thumbFrame",
			"rankStrip": "z7szZa_rankStrip",
			"main": "z7szZa_main",
			"rankMore": "z7szZa_rankMore",
			"thumbName": "z7szZa_thumbName",
			"hint": "z7szZa_hint",
			"row": "z7szZa_row",
			"dot": "z7szZa_dot",
			"icon": "z7szZa_icon",
			"titleLine": "z7szZa_titleLine",
			"summary": "z7szZa_summary",
			"thumbCard": "z7szZa_thumbCard",
			"thumbFallback": "z7szZa_thumbFallback",
			"actions": "z7szZa_actions",
			"thumbImg": "z7szZa_thumbImg",
			"rankTitle": "z7szZa_rankTitle"
		};
		//#endregion
		//#region src/client/PhotoPickResultRow.tsx
		/**
		* Keyed toolview for photo_pick_best: thumbnail ranking + open compare dialog.
		* @module dsh-photo-pick-ui/client/PhotoPickResultRow
		*/
		/** How many ranked thumbs to show inline in the chat card. */
		const INLINE_TOP_N = 6;
		/**
		* Render the photo_pick_best chat tool card with inline ranked thumbnails.
		* @param props - toolview owner currency + photo-pick locale.
		*/
		function PhotoPickResultRow(props) {
			const { block, cwd, t } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [focusPath, setFocusPath] = (0, react.useState)(void 0);
			if (t === void 0) return null;
			const done = "kind" in block;
			const running = !done;
			const isError = done && block.isError;
			const meta = done ? parsePhotoPickRankMeta(block.meta) : void 0;
			const top = meta?.ranked[0];
			const summary = running ? t("result.running") : isError ? t("result.error") : top === void 0 ? t("result.empty") : t("result.summary").replace("{n}", String(meta?.ranked.length ?? 0)).replace("{score}", String(top.score)).replace("{path}", top.relativePath.split(/[/\\]/).pop() || top.relativePath);
			const canCompare = meta !== void 0 && cwd !== void 0 && cwd.length > 0 && !isError;
			const inlineRows = meta?.ranked.slice(0, INLINE_TOP_N) ?? [];
			const moreCount = meta !== void 0 ? Math.max(0, meta.ranked.length - inlineRows.length) : 0;
			const openCompare = (path) => {
				setFocusPath(path);
				setOpen(true);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PhotoPickResultRow_module_css_default.row,
				"data-state": running ? "running" : isError ? "error" : "ok",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PhotoPickResultRow_module_css_default.icon,
						"aria-hidden": true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PhotoPickResultRow_module_css_default.main,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickResultRow_module_css_default.titleLine,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickResultRow_module_css_default.title,
										children: t("result.title")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickResultRow_module_css_default.dot,
										"aria-hidden": true,
										children: "·"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickResultRow_module_css_default.summary,
										children: summary
									})
								]
							}),
							canCompare && inlineRows.length > 0 && cwd !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickResultRow_module_css_default.rankStrip,
								"aria-label": t("result.rankStrip"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PhotoPickResultRow_module_css_default.rankHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickResultRow_module_css_default.rankTitle,
										children: t("result.rankTitle")
									}), moreCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: PhotoPickResultRow_module_css_default.rankMore,
										children: t("result.rankMore").replace("{n}", String(moreCount))
									}) : null]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: PhotoPickResultRow_module_css_default.thumbs,
									children: inlineRows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankThumb, {
										root: cwd,
										row,
										rank: index + 1,
										onOpen: () => {
											openCompare(row.relativePath);
										},
										t
									}) }, row.relativePath))
								})]
							}) : null,
							canCompare ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PhotoPickResultRow_module_css_default.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									onClick: () => {
										openCompare();
									},
									children: t("result.compare")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PhotoPickResultRow_module_css_default.hint,
									children: t("result.compareHint")
								})]
							}) : null
						]
					}),
					open && canCompare && meta !== void 0 && cwd !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PhotoPickCompareDialog, {
						root: cwd,
						meta,
						...focusPath !== void 0 ? { initialPath: focusPath } : {},
						onClose: () => {
							setOpen(false);
							setFocusPath(void 0);
						},
						t
					}) : null
				]
			});
		}
		function RankThumb(props) {
			const { root, row, rank, onOpen, t } = props;
			const [failed, setFailed] = (0, react.useState)(false);
			const fileName = row.relativePath.split(/[/\\]/).pop() || row.relativePath;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: PhotoPickResultRow_module_css_default.thumbCard,
				title: `#${rank} · ${row.score} · ${row.relativePath}`,
				onClick: onOpen,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: PhotoPickResultRow_module_css_default.thumbFrame,
					children: [
						!failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: PhotoPickResultRow_module_css_default.thumbImg,
							src: `/api/photo-pick/file?root=${encodeURIComponent(root)}&path=${encodeURIComponent(row.relativePath)}`,
							alt: "",
							loading: "lazy",
							onError: () => {
								setFailed(true);
							}
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickResultRow_module_css_default.thumbFallback,
							children: t("panel.previewFailed")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: PhotoPickResultRow_module_css_default.thumbRank,
							children: ["#", rank]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PhotoPickResultRow_module_css_default.thumbScore,
							children: row.score
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PhotoPickResultRow_module_css_default.thumbName,
					children: fileName
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Locale keys for the photo-pick settings page and workspace panel.
		* Panel copy mirrors media-ui Image & video scan (config folds + tiled files).
		* @module dsh-photo-pick-ui/client/locales
		*/
		/** English copy. */
		const en = {
			nav: "Photo pick",
			title: "Photo pick",
			intro: "Enable vision scoring and pick a look-at-images model from Settings → Models. Saving only stores configuration — run photo_pick_best from a Photo-pick agent preset session.",
			visionEnabled: "Enable vision scoring",
			visionEnabledHint: "When off, photo_pick_best refuses to run.",
			model: "Scoring vision model",
			modelPlaceholder: "Select a configured model…",
			modelHint: "Prefer a model marked as vision-capable. Text-only models cannot score photos.",
			visionCapable: "vision",
			textOnly: "text only",
			textOnlyWarning: "This model does not accept images. Scoring will fail at runtime.",
			noModels: "No models are configured yet. Add one under Settings → Models, then reopen this page.",
			save: "Save",
			discard: "Discard",
			saved: "Saved. Ask the agent to run photo_pick_best on your selected paths.",
			loadError: "Could not load photo-pick settings. Is the photo-pick Host plugin installed?",
			saveError: "Could not save photo-pick settings.",
			readonly: "Settings are read-only in this deployment.",
			retry: "Retry",
			"panel.title": "Photo pick",
			"panel.trigger": "Photo pick",
			"panel.triggerAria": "Open photo-pick workspace",
			"panel.triggerHint": "Browse and select photos, then continue to this-batch criteria.",
			"panel.close": "Close",
			"panel.noCwd": "Open a workspace session first.",
			"panel.config": "Config",
			"panel.configExpand": "Show config",
			"panel.configCollapse": "Hide config",
			"panel.foldActions": "Actions",
			"panel.foldVision": "Scoring model",
			"panel.foldPrompt": "Scoring standard",
			"panel.foldDirty": "Unsaved",
			"panel.foldJob": "Selection",
			"panel.foldJobEmpty": "No photos selected yet.",
			"panel.selectAll": "Select visible",
			"panel.clearSelection": "Clear",
			"panel.refresh": "Refresh",
			"panel.copyPaths": "Copy paths",
			"panel.copied": "Copied",
			"panel.next": "Next",
			"panel.nextHint": "Continue to this-batch criteria (optional), then fill the composer.",
			"panel.confirm": "Confirm to chat",
			"panel.confirmHint": "Write paths (and criteria if any) into the composer, then press Send.",
			"panel.confirmDraftLead": "Please run photo_pick_best on these similar photos. Workspace-relative paths:",
			"panel.confirmDraftLeadWithCriteria": "Please run photo_pick_best on these similar photos. Pass the next Criteria line unchanged as the tool criteria parameter. Workspace-relative paths follow:",
			"panel.confirmDraftCriteriaLead": "Criteria: ",
			"panel.askAgent": "Paste paths in chat and ask to photo_pick_best.",
			"panel.criteriaStepTitle": "This-batch criteria",
			"panel.criteriaStepBadge": "{n} photos selected",
			"panel.criteriaStepHint": "Optional for this pick only. Skip and confirm if you do not need extra rules; long-term standards stay under Scoring standard.",
			"panel.criteriaStepBack": "Back",
			"panel.criteriaSection": "This-batch criteria",
			"panel.criteriaActive": "Set",
			"panel.criteriaHint": "Applies only to this pick (tool criteria). Long-term scoring rules stay under Scoring standard.",
			"panel.criteriaPlaceholder": "e.g. no bare legs; head near the upper third; prefer half-body",
			"panel.criteriaPresets": "Quick picks",
			"panel.criteriaHistory": "Recent",
			"panel.criteriaHistoryEmpty": "No recent criteria yet.",
			"panel.criteriaHistoryApply": "Use",
			"panel.criteriaClear": "Clear",
			"panel.criteriaChip.noLegs": "No bare legs",
			"panel.criteriaChip.halfBody": "Half-body",
			"panel.criteriaChip.headUpperThird": "Head upper third",
			"panel.criteriaChip.eyesOpen": "Eyes open",
			"panel.criteriaChip.naturalSmile": "Natural smile",
			"panel.criteriaChip.frontFacing": "Front-facing",
			"panel.criteriaChip.cleanBackground": "Clean background",
			"panel.criteriaChip.noHeadCrop": "No head crop",
			"panel.criteriaText.noLegs": "Do not show bare legs — photos with exposed legs should score much lower",
			"panel.criteriaText.halfBody": "Prefer half-body / chest-up framing — full-body shots with legs fully in frame score lower",
			"panel.criteriaText.headUpperThird": "Keep the head near the upper third of the frame (rule of thirds)",
			"panel.criteriaText.eyesOpen": "Both eyes open and clear — closed or half-closed eyes are a severe penalty",
			"panel.criteriaText.naturalSmile": "Prefer a natural smile — exaggerated expressions score lower",
			"panel.criteriaText.frontFacing": "Prefer front or slight three-quarter face — profile / back views score lower",
			"panel.criteriaText.cleanBackground": "Busy or distracting backgrounds that compete with the subject score lower",
			"panel.criteriaText.noHeadCrop": "Severe cropping of the crown or chin is a severe penalty",
			"panel.loading": "Loading…",
			"panel.empty": "No images found under this workspace.",
			"panel.emptyFolder": "This folder has no images.",
			"panel.files": "Photos",
			"panel.filesBack": "Back",
			"panel.filesRoot": "Workspace",
			"panel.filesSort": "Sort",
			"panel.filesSortNameAsc": "Name A→Z",
			"panel.filesSortNameDesc": "Name Z→A",
			"panel.filesSortMtimeDesc": "Newest",
			"panel.filesSortMtimeAsc": "Oldest",
			"panel.filesSortSizeDesc": "Largest",
			"panel.filesSortSizeAsc": "Smallest",
			"panel.filesViewTree": "Folders",
			"panel.filesViewFlat": "All",
			"panel.filesTagFilter": "Tags",
			"panel.filesTagFilterAll": "All",
			"panel.filesTagFilterNone": "No tags",
			"panel.filesTagFilterEmpty": "No photos match the selected tags.",
			"panel.filesTagCollapse": "Collapse tags",
			"panel.filesTagExpand": "Expand tags",
			"panel.filesTagUnavailable": "Install and index media to filter by tags.",
			"panel.folderOpen": "Open folder",
			"panel.selectedCount": "Selected {n}",
			"panel.selectAria": "Select {name}",
			"panel.visionSection": "Scoring model",
			"panel.promptSection": "Scoring standard (long-term)",
			"panel.promptDefault": "Default instruction",
			"panel.promptCustom": "Custom instruction",
			"panel.promptCustomHint": "Leave empty to use the default. Affects every pick. Per-batch needs go under This batch. The JSON suffix is always appended.",
			"panel.promptSuffix": "JSON suffix (fixed)",
			"panel.promptSave": "Save standard",
			"panel.promptReset": "Use default",
			"panel.promptSaved": "Scoring standard saved.",
			"panel.preview": "Preview",
			"panel.previewOpen": "Open full preview",
			"panel.previewClose": "Close preview",
			"panel.previewFailed": "Preview unavailable",
			"panel.previewZoomIn": "Zoom in",
			"panel.previewZoomOut": "Zoom out",
			"panel.previewZoomReset": "Fit",
			"panel.previewZoomHint": "Scroll to zoom · drag to pan",
			"panel.tabDetail": "Details",
			"panel.tabDetailHide": "Hide details",
			"panel.tabDetailShow": "Show details",
			"panel.path": "Path",
			"panel.fileSize": "File size",
			"panel.imageSize": "Dimensions",
			"panel.mtime": "Modified",
			"panel.category": "Category",
			"panel.description": "Description",
			"panel.tags": "Tags",
			"panel.noTags": "No tags",
			"panel.tagStatus": "Tag status",
			"panel.tagOk": "Tagged",
			"panel.tagFailed": "Tag failed",
			"panel.tagSkipped": "Skipped",
			"panel.tagPending": "Pending",
			"result.title": "Photo pick",
			"result.running": "Scoring photos…",
			"result.error": "Scoring failed",
			"result.empty": "No ranked photos",
			"result.summary": "{n} ranked · #1 {score} · {path}",
			"result.rankTitle": "Top picks",
			"result.rankStrip": "Ranked photo thumbnails",
			"result.rankMore": "+{n} more in Compare",
			"result.compare": "Compare",
			"result.compareHint": "Open full compare, or click a thumbnail above.",
			"compare.title": "Photo pick compare",
			"compare.close": "Close",
			"compare.mode": "View mode",
			"compare.modeSingle": "One by one",
			"compare.modeSplit": "Side by side",
			"compare.prev": "Previous",
			"compare.next": "Next",
			"compare.position": "{i} / {n}",
			"compare.positionPair": "#{a} vs #{b} · {n} in queue",
			"compare.score": "Score {n}",
			"compare.scoreUnit": "pts",
			"compare.zoom": "Zoom",
			"compare.zoomHintSplit": "Scroll to zoom · drag to pan (both sides stay in sync)",
			"compare.hintSingle": "Scroll to zoom · drag to pan. Use − to pass a photo into the recycle bin.",
			"compare.hintSplitPick": "Click a thumb to assign it to the focused side (L/R). Click a pane or its L/R badge to switch focus. Use − to pass into the recycle bin.",
			"compare.positionSplit": "{a}–{b} / {n}",
			"compare.sideLeft": "L",
			"compare.sideRight": "R",
			"compare.focusLeft": "Assigning left",
			"compare.focusRight": "Assigning right",
			"compare.queueActive": "Compare queue · {n}",
			"compare.queueEmpty": "No photos left in the compare queue. Restore from the recycle bin.",
			"compare.pass": "Pass to recycle bin",
			"compare.open": "Open with default app",
			"compare.openBusy": "Opening…",
			"compare.openFailed": "Could not open photo",
			"compare.reveal": "Show in file manager",
			"compare.revealBusy": "Opening file manager…",
			"compare.revealFailed": "Could not open file manager",
			"compare.restore": "Restore to queue",
			"compare.trash": "Recycle bin · {n}",
			"compare.trashOpen": "Open recycle bin",
			"compare.trashEmpty": "Recycle bin is empty.",
			"compare.reasons": "Strengths",
			"compare.flaws": "Flaws",
			"compare.none": "None",
			"compare.calls": "{n} vision calls",
			"compare.tabDetail": "Details",
			"compare.detailPath": "Path",
			"compare.detailRank": "Rank",
			"compare.detailScore": "Score",
			"compare.detailModel": "Model",
			"compare.detailSize": "Dimensions"
		};
		/** Chinese copy. */
		const zh = {
			nav: "照片择优",
			title: "照片择优",
			intro: "开启视觉打分，并从「设置 → 模型」里已配置的路由中选择看图模型。保存只写入配置；请在「照片择优」Agent Preset 会话里调用 photo_pick_best。",
			visionEnabled: "启用视觉打分",
			visionEnabledHint: "关闭后 photo_pick_best 会拒绝执行。",
			model: "打分视觉模型",
			modelPlaceholder: "选择已配置的模型…",
			modelHint: "优先选择标为「视觉」的模型。纯文本模型无法给照片打分。",
			visionCapable: "视觉",
			textOnly: "仅文本",
			textOnlyWarning: "该模型不接受图片输入，打分会在运行时失败。",
			noModels: "尚未配置任何模型。请先到「设置 → 模型」添加，再回到本页。",
			save: "保存",
			discard: "放弃更改",
			saved: "已保存。把选中的路径发给 Agent，让它调用 photo_pick_best。",
			loadError: "无法加载照片择优设置。是否已安装 photo-pick Host 插件？",
			saveError: "无法保存照片择优设置。",
			readonly: "当前部署下设置只读。",
			retry: "重试",
			"panel.title": "照片择优",
			"panel.trigger": "照片择优",
			"panel.triggerAria": "打开照片择优工作区",
			"panel.triggerHint": "先选照片，再进入本组要求（可跳过），最后填入对话。",
			"panel.close": "关闭",
			"panel.noCwd": "请先打开带工作区目录的会话。",
			"panel.config": "配置",
			"panel.configExpand": "展开配置",
			"panel.configCollapse": "收起配置",
			"panel.foldActions": "操作",
			"panel.foldVision": "打分模型",
			"panel.foldPrompt": "打分标准",
			"panel.foldDirty": "未保存",
			"panel.foldJob": "已选",
			"panel.foldJobEmpty": "尚未勾选照片。",
			"panel.selectAll": "全选当前",
			"panel.clearSelection": "清空",
			"panel.refresh": "刷新",
			"panel.copyPaths": "复制路径",
			"panel.copied": "已复制",
			"panel.next": "下一步",
			"panel.nextHint": "进入本组要求（可不选），再填入对话。",
			"panel.confirm": "确定并填入对话",
			"panel.confirmHint": "把已选路径（及本组要求，若有）写入输入框，你再点发送即可。",
			"panel.confirmDraftLead": "请对这些近似照片调用 photo_pick_best 做择优。工作区相对路径如下：",
			"panel.confirmDraftLeadWithCriteria": "请对这些近似照片调用 photo_pick_best 做择优，并把下一行「择优要求」原文原样传入 criteria 参数。路径如下：",
			"panel.confirmDraftCriteriaLead": "择优要求：",
			"panel.askAgent": "把路径贴进对话，让 Agent 调用 photo_pick_best。",
			"panel.criteriaStepTitle": "本组要求",
			"panel.criteriaStepBadge": "已选 {n} 张",
			"panel.criteriaStepHint": "只影响这一次择优，可不填直接确定。长期审美请改左侧「打分标准」。",
			"panel.criteriaStepBack": "返回选图",
			"panel.criteriaSection": "本组择优要求",
			"panel.criteriaActive": "已填",
			"panel.criteriaHint": "只影响这一次择优（工具 criteria）。长期审美请改「打分标准」。",
			"panel.criteriaPlaceholder": "例如：不要露出腿；头部尽量在上三分；优先半身",
			"panel.criteriaPresets": "快捷选用",
			"panel.criteriaHistory": "最近使用",
			"panel.criteriaHistoryEmpty": "还没有历史要求。",
			"panel.criteriaHistoryApply": "选用",
			"panel.criteriaClear": "清空",
			"panel.criteriaChip.noLegs": "不要露腿",
			"panel.criteriaChip.halfBody": "半身优先",
			"panel.criteriaChip.headUpperThird": "头在上三分",
			"panel.criteriaChip.eyesOpen": "眼睛睁开",
			"panel.criteriaChip.naturalSmile": "自然微笑",
			"panel.criteriaChip.frontFacing": "正面朝向",
			"panel.criteriaChip.cleanBackground": "背景干净",
			"panel.criteriaChip.noHeadCrop": "不要裁头",
			"panel.criteriaText.noLegs": "不要出现裸露的腿部，露出腿部应明显减分",
			"panel.criteriaText.halfBody": "优先半身或胸像构图，全身且腿部完整入镜减分",
			"panel.criteriaText.headUpperThird": "头部主体尽量落在九宫格上三分之一",
			"panel.criteriaText.eyesOpen": "双眼睁开清晰，闭眼或半闭眼严重减分",
			"panel.criteriaText.naturalSmile": "优先自然微笑，夸张表情减分",
			"panel.criteriaText.frontFacing": "优先正面或微侧脸，侧背或背影减分",
			"panel.criteriaText.cleanBackground": "背景杂乱、抢主体减分",
			"panel.criteriaText.noHeadCrop": "头顶或下巴被裁切严重减分",
			"panel.loading": "加载中…",
			"panel.empty": "当前工作区下没有找到图片。",
			"panel.emptyFolder": "此文件夹没有图片。",
			"panel.files": "照片",
			"panel.filesBack": "返回",
			"panel.filesRoot": "工作区",
			"panel.filesSort": "排序",
			"panel.filesSortNameAsc": "名称 A→Z",
			"panel.filesSortNameDesc": "名称 Z→A",
			"panel.filesSortMtimeDesc": "最新",
			"panel.filesSortMtimeAsc": "最旧",
			"panel.filesSortSizeDesc": "最大",
			"panel.filesSortSizeAsc": "最小",
			"panel.filesViewTree": "目录",
			"panel.filesViewFlat": "全部",
			"panel.filesTagFilter": "标签",
			"panel.filesTagFilterAll": "全部",
			"panel.filesTagFilterNone": "无标签",
			"panel.filesTagFilterEmpty": "没有符合所选标签的照片。",
			"panel.filesTagCollapse": "收起标签",
			"panel.filesTagExpand": "展开标签",
			"panel.filesTagUnavailable": "安装并索引素材库后，可用标签筛选。",
			"panel.folderOpen": "打开文件夹",
			"panel.selectedCount": "已选 {n}",
			"panel.selectAria": "选择 {name}",
			"panel.visionSection": "打分模型",
			"panel.promptSection": "打分标准（长期）",
			"panel.promptDefault": "默认说明",
			"panel.promptCustom": "自定义说明",
			"panel.promptCustomHint": "留空则使用默认说明。影响所有择优；本组临时要求请写在「本组要求」。JSON 后缀始终追加。",
			"panel.promptSuffix": "JSON 后缀（固定）",
			"panel.promptSave": "保存标准",
			"panel.promptReset": "恢复默认",
			"panel.promptSaved": "打分标准已保存。",
			"panel.preview": "预览",
			"panel.previewOpen": "查看大图",
			"panel.previewClose": "关闭预览",
			"panel.previewFailed": "无法预览",
			"panel.previewZoomIn": "放大",
			"panel.previewZoomOut": "缩小",
			"panel.previewZoomReset": "适应",
			"panel.previewZoomHint": "滚轮缩放 · 拖拽平移",
			"panel.tabDetail": "详细信息",
			"panel.tabDetailHide": "收起详细信息",
			"panel.tabDetailShow": "展开详细信息",
			"panel.path": "路径",
			"panel.fileSize": "文件大小",
			"panel.imageSize": "图片尺寸",
			"panel.mtime": "修改时间",
			"panel.category": "分类",
			"panel.description": "描述",
			"panel.tags": "标签",
			"panel.noTags": "暂无标签",
			"panel.tagStatus": "打标状态",
			"panel.tagOk": "已打标",
			"panel.tagFailed": "打标失败",
			"panel.tagSkipped": "已跳过",
			"panel.tagPending": "待打标",
			"result.title": "照片择优",
			"result.running": "正在打分…",
			"result.error": "打分失败",
			"result.empty": "没有可用的排名",
			"result.summary": "共 {n} 张 · 第 1 名 {score} 分 · {path}",
			"result.rankTitle": "推荐排名",
			"result.rankStrip": "排名缩略图",
			"result.rankMore": "另有 {n} 张，点对比查看",
			"result.compare": "对比查看",
			"result.compareHint": "打开完整对比，或直接点上方缩略图。",
			"compare.title": "照片择优对比",
			"compare.close": "关闭",
			"compare.mode": "查看模式",
			"compare.modeSingle": "逐张",
			"compare.modeSplit": "左右对比",
			"compare.prev": "上一张",
			"compare.next": "下一张",
			"compare.position": "{i} / {n}",
			"compare.positionPair": "#{a} vs #{b} · 队列 {n}",
			"compare.score": "{n} 分",
			"compare.scoreUnit": "分",
			"compare.zoom": "缩放",
			"compare.zoomHintSplit": "滚轮缩放 · 拖拽平移（左右同步）",
			"compare.hintSingle": "滚轮缩放 · 拖拽平移。点 − 可把照片临时移入回收站。",
			"compare.hintSplitPick": "点缩略图指定到当前焦点侧（左/右）；点画面或 L/R 切换焦点。点 − 移入回收站，可从回收站加回。",
			"compare.positionSplit": "{a}–{b} / {n}",
			"compare.sideLeft": "左",
			"compare.sideRight": "右",
			"compare.focusLeft": "正在指定左侧",
			"compare.focusRight": "正在指定右侧",
			"compare.queueActive": "对比队列 · {n}",
			"compare.queueEmpty": "对比队列已空。请从回收站加回照片。",
			"compare.pass": "移入回收站",
			"compare.open": "用系统默认程序打开",
			"compare.openBusy": "正在打开…",
			"compare.openFailed": "无法打开照片",
			"compare.reveal": "在资源管理器中显示",
			"compare.revealBusy": "正在打开资源管理器…",
			"compare.revealFailed": "无法打开资源管理器",
			"compare.restore": "加回对比队列",
			"compare.trash": "回收站 · {n}",
			"compare.trashOpen": "打开回收站",
			"compare.trashEmpty": "回收站是空的。",
			"compare.reasons": "加分点",
			"compare.flaws": "减分点",
			"compare.none": "无",
			"compare.calls": "{n} 次视觉调用",
			"compare.tabDetail": "详细信息",
			"compare.detailPath": "路径",
			"compare.detailRank": "排名",
			"compare.detailScore": "分数",
			"compare.detailModel": "模型",
			"compare.detailSize": "尺寸"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.photo-pick";
		/** Required services; settings.section, header/composer seats, toolview are host-declared. */
		const inject = [
			"slots",
			"locale",
			"sessions",
			"conversation"
		];
		/**
		* Register the Photo-pick settings section, workspace chips, and tool card.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "photo-pick-ui: copy dictionaries");
			const settingsController = new PhotoPickSettingsStore();
			const useSettingsSnapshot = (0, _deepseek_ai_dsh_client_web_react.bindSnapshotSelector)(settingsController.store);
			const t = ctx.locale.bind(NS);
			const settingsInjected = () => ({
				controller: settingsController,
				useSnapshot: useSettingsSnapshot,
				t
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "photo-pick",
				order: 46,
				label: () => t("nav"),
				locale: NS,
				inject: settingsInjected
			}, PhotoPickSection));
			const panelInjected = () => ({
				controller: settingsController,
				useSnapshot: useSettingsSnapshot,
				insertDraft: (sessionId, text) => {
					const actx = ctx.sessions.scope(sessionId);
					if (actx === void 0) return false;
					ctx.conversation.input.for(actx).setDraft(text);
					return true;
				}
			});
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "photo-pick-config",
				order: 1,
				locale: NS,
				inject: panelInjected
			}, PhotoPickConfigPanel));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "photo-pick-config",
				order: 20,
				locale: NS,
				inject: panelInjected
			}, PhotoPickComposerAction));
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "photo_pick_best",
				locale: NS
			}, PhotoPickResultRow));
		}
		//#endregion
		exports.PHOTO_PICK_AGENT_PRESET_ID = PHOTO_PICK_AGENT_PRESET_ID;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map