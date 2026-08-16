/**
 * Loopback HTTP face for photo-pick vision settings (tree-out; no apiproxy allowlist).
 * Adapted from `dsh-media-local/settings-http`.
 * @module dsh-photo-pick-local/settings-http
 */
import { PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT, PHOTO_PICK_SCORE_JSON_SUFFIX, } from "./vision-score.js";
/** Stable path for describe + update. */
export const PHOTO_PICK_SETTINGS_HTTP_PATH = '/api/photo-pick/settings';
/**
 * Register GET/PUT for the photo-pick settings namespace when webServer + settings are present.
 * @param ctx - fiber with webServer and settings.
 * @param ns - photo-pick-local settings namespace.
 * @returns disposer removing the route.
 */
export function registerPhotoPickSettingsHttp(ctx, ns) {
    return ctx.webServer.register({
        kind: 'exact',
        path: PHOTO_PICK_SETTINGS_HTTP_PATH,
        handler: (req, res) => {
            void handle(ctx, ns, req, res);
        },
    });
}
async function handle(ctx, ns, req, res) {
    try {
        const method = req.method ?? 'GET';
        if (method === 'GET') {
            writeJson(res, 200, await describeView(ctx, ns));
            return;
        }
        if (method === 'PUT' || method === 'POST') {
            if (!ctx.settings.writable) {
                writeJson(res, 403, { error: 'settings-readonly' });
                return;
            }
            const body = await readJson(req);
            const patch = parsePatch(body);
            if (patch === undefined) {
                writeJson(res, 400, { error: 'invalid-body' });
                return;
            }
            await ctx.settings.update(ns, patch);
            writeJson(res, 200, await describeView(ctx, ns));
            return;
        }
        writeJson(res, 405, { error: 'method-not-allowed' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeJson(res, 500, { error: message.slice(0, 300) });
    }
}
async function describeView(ctx, ns) {
    const rows = ctx.settings.describe({ redactSecrets: true }).filter(row => row.ns === ns);
    const row = rows[0];
    const value = (row?.value ?? {});
    return {
        visionEnabled: value.visionEnabled !== false,
        visionLlmProvider: typeof value.visionLlmProvider === 'string' ? value.visionLlmProvider : '',
        visionModel: typeof value.visionModel === 'string' ? value.visionModel : '',
        defaultVisionScorePrompt: PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT,
        visionScoreJsonSuffix: PHOTO_PICK_SCORE_JSON_SUFFIX,
        visionScorePrompt: typeof value.visionScorePrompt === 'string' ? value.visionScorePrompt : '',
        models: await listVisionModels(ctx),
        revision: row?.revision ?? 0,
        writable: ctx.settings.writable,
    };
}
/**
 * List Host LLM catalog entries for the photo-pick settings picker.
 * Vision-capable models are sorted first within each provider group.
 * @param ctx - Host context (llm optional).
 */
export async function listVisionModels(ctx) {
    const llm = ctx.get('llm');
    if (llm === undefined)
        return [];
    const out = [];
    for (const provider of llm.listProviders()) {
        let models;
        try {
            models = await llm.listModels(provider.id);
        }
        catch {
            continue;
        }
        const rows = [];
        for (const model of models) {
            let supportsVision;
            try {
                const resolved = await llm.resolveModelInfo(provider.id, model.id);
                if (resolved.inputModalities !== undefined) {
                    supportsVision = resolved.inputModalities.includes('image');
                }
            }
            catch {
                supportsVision = undefined;
            }
            rows.push({
                provider: provider.id,
                providerName: provider.name,
                id: model.id,
                name: model.name,
                ...supportsVision === undefined ? {} : { supportsVision },
            });
        }
        rows.sort((a, b) => Number(b.supportsVision === true) - Number(a.supportsVision === true));
        out.push(...rows);
    }
    return out;
}
/** Parse a settings PUT body into a config patch (exported for unit tests). */
export function parsePhotoPickSettingsPatch(body) {
    return parsePatch(body);
}
function parsePatch(body) {
    if (body === null || typeof body !== 'object' || Array.isArray(body))
        return undefined;
    const raw = body;
    const patch = {};
    if ('visionEnabled' in raw) {
        if (typeof raw.visionEnabled !== 'boolean')
            return undefined;
        patch.visionEnabled = raw.visionEnabled;
    }
    if ('visionLlmProvider' in raw) {
        if (typeof raw.visionLlmProvider !== 'string')
            return undefined;
        patch.visionLlmProvider = raw.visionLlmProvider.trim();
    }
    if ('visionModel' in raw) {
        if (typeof raw.visionModel !== 'string')
            return undefined;
        patch.visionModel = raw.visionModel.trim();
    }
    if ('visionScorePrompt' in raw) {
        if (typeof raw.visionScorePrompt !== 'string')
            return undefined;
        patch.visionScorePrompt = raw.visionScorePrompt;
    }
    return patch;
}
async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (text.length === 0)
        return {};
    return JSON.parse(text);
}
function writeJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
}
//# sourceMappingURL=settings-http.js.map