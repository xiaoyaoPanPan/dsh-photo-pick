/**
 * Model-facing photo-pick tools over `ctx.photoPick`.
 * @module dsh-tool-photo-pick
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
/** Stable system-prompt section text (pinned by loader-composition tests). */
export const PHOTO_PICK_PROMPT = [
    'Photo-pick tools rank similar photos under the current workspace and recommend the best ones.',
    'Use photo_pick_best with an explicit paths list when the user names files or a folder burst;',
    'or pass query when the media library plugin is installed and the user describes the set in words.',
    'Do not call read_image to compare candidates: scoring runs on a separate vision model configured for photo-pick.',
    'After picks, the Web tool card shows ranked thumbnails — summarize briefly and point the user',
    'to those thumbs or Compare. Do not launch OS photo viewers via shell (Start-Process / open / xdg-open);',
    'use media_open only if that tool is available and the user explicitly asks to open a file outside the browser.',
].join(' ');
/** Cordis plugin name. */
export const name = 'tool-photo-pick';
/** Required services. */
export const inject = ['tools', 'photoPick', 'systemPrompt'];
/**
 * Session workspace cwd for photo-pick tools, or throw when absent.
 * @param exec - tool execution carrying the optional agent.
 */
function requireCwd(exec) {
    const cwd = exec.agent?.session.header.cwd;
    if (cwd === undefined || cwd === '') {
        throw new Error('photo-pick tools require an agent session with a workspace cwd');
    }
    return cwd;
}
function formatScore(row, index) {
    const reasons = row.reasons.length > 0 ? row.reasons.join('; ') : '(none)';
    const flaws = row.flaws.length > 0 ? row.flaws.join('; ') : '(none)';
    const err = row.error === undefined ? '' : `\nerror: ${row.error}`;
    return [
        `#${index + 1} score=${row.score}`,
        `path: ${row.path}`,
        `relative: ${row.relativePath}`,
        `reasons: ${reasons}`,
        `flaws: ${flaws}${err}`,
    ].join('\n');
}
function formatResult(result) {
    const picks = result.picks.length === 0
        ? '(no successful scores)'
        : result.picks.map((row, index) => formatScore(row, index)).join('\n\n');
    return [
        `vision=${result.visionProvider}/${result.visionModel} calls=${result.visionCalls}`,
        '',
        '## Picks',
        picks,
        '',
        `## Ranked (${result.ranked.length})`,
        result.ranked.map((row, index) => formatScore(row, index)).join('\n\n'),
    ].join('\n');
}
function toRankMeta(row) {
    return {
        relativePath: row.relativePath,
        score: row.score,
        reasons: [...row.reasons],
        flaws: [...row.flaws],
        ...row.error === undefined ? {} : { error: row.error },
    };
}
function toToolValue(result) {
    return {
        summary: formatResult(result),
        ranked: result.ranked.map(toRankMeta),
        visionProvider: result.visionProvider,
        visionModel: result.visionModel,
        visionCalls: result.visionCalls,
    };
}
function formatError(error) {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const pick = error;
        return `${pick.code}: ${pick.message}`;
    }
    return error instanceof Error ? error.message : String(error);
}
function pathsCall(title, paths) {
    return {
        card: 'generic',
        title,
        kind: 'other',
        locations: paths.slice(0, 8).map(path => ({ path })),
    };
}
function presentPhotoPickResult(_args, result) {
    if (result.isError)
        return undefined;
    return { card: 'generic', title: '照片择优完成' };
}
/**
 * Register photo_pick_best and a short guidance section.
 * @param ctx - Cordis context with tools, photoPick, and systemPrompt.
 */
export function apply(ctx) {
    ctx.systemPrompt.section({
        name: 'photo-pick',
        order: 165,
        text: PHOTO_PICK_PROMPT,
    });
    ctx.tools.register(defineTool({
        name: 'photo_pick_best',
        description: 'Rank similar photos under the current workspace and recommend the best ones. '
            + 'Pass paths (absolute or workspace-relative image files) for an explicit burst, '
            + 'and/or query to search the media library when that plugin is installed. '
            + 'Uses a separate vision model (photo-pick settings: visionLlmProvider + visionModel). '
            + 'Returns top-K picks with scores, reasons, and flaws — do not call read_image.',
        parameters: {
            paths: {
                type: 'array',
                description: 'Image paths to score (absolute or workspace-relative)',
                items: { type: 'string' },
            },
            query: {
                type: 'string',
                description: 'Optional media-library search query to gather image candidates',
            },
            topK: {
                type: 'number',
                description: 'How many top picks to highlight (default 3)',
            },
            maxCandidates: {
                type: 'number',
                description: 'Soft cap on images scored (default 24, max 24)',
            },
            criteria: {
                type: 'string',
                description: 'Per-batch preference from the user (Criteria / 择优要求). '
                    + 'Pass the user text unchanged, e.g. no bare legs / head in upper third.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    summary: { type: 'string', required: true },
                    ranked: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                relativePath: { type: 'string', required: true },
                                score: { type: 'number', required: true },
                                reasons: { type: 'array', required: true, items: { type: 'string' } },
                                flaws: { type: 'array', required: true, items: { type: 'string' } },
                                error: { type: 'string' },
                            },
                        },
                    },
                    visionProvider: { type: 'string', required: true },
                    visionModel: { type: 'string', required: true },
                    visionCalls: { type: 'number', required: true },
                },
            },
            render: (_args, value) => [{ type: 'text', text: value.summary }],
            presentationMeta: (_args, value) => ({
                ranked: value.ranked,
                visionProvider: value.visionProvider,
                visionModel: value.visionModel,
                visionCalls: value.visionCalls,
            }),
        },
        presentCall: (args) => {
            const paths = Array.isArray(args.paths)
                ? args.paths.filter((p) => typeof p === 'string')
                : [];
            const title = paths.length > 0
                ? `Pick best of ${paths.length} photos`
                : typeof args.query === 'string' && args.query.length > 0
                    ? `Pick best: ${args.query}`
                    : 'Pick best photos';
            return pathsCall(title, paths);
        },
        presentResult: presentPhotoPickResult,
        async execute(args, exec) {
            try {
                const paths = Array.isArray(args.paths)
                    ? args.paths.filter((p) => typeof p === 'string' && p.length > 0)
                    : undefined;
                const query = typeof args.query === 'string' ? args.query : undefined;
                if ((paths === undefined || paths.length === 0) && (query === undefined || query.trim() === '')) {
                    throw new Error('photo_pick_best requires paths[] and/or query');
                }
                const result = await ctx.photoPick.pickBest(requireCwd(exec), {
                    ...(paths !== undefined && paths.length > 0 ? { paths } : {}),
                    ...(query !== undefined && query.trim() !== '' ? { query } : {}),
                    ...(typeof args.topK === 'number' ? { topK: args.topK } : {}),
                    ...(typeof args.maxCandidates === 'number' ? { maxCandidates: args.maxCandidates } : {}),
                    ...(typeof args.criteria === 'string' && args.criteria.trim() !== ''
                        ? { criteria: args.criteria }
                        : {}),
                    signal: exec.signal,
                });
                return toToolValue(result);
            }
            catch (error) {
                throw new Error(formatError(error));
            }
        },
    }));
}
//# sourceMappingURL=index.js.map