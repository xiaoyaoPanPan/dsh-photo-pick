/**
 * Vision quality scoring via the Host LLM catalog.
 * Adapted from `dsh-media-local/vision-llm` (single-image stream + attachment).
 * @module dsh-photo-pick-local/vision-score
 */
import { basename, extname } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { parseVisionScoreJson, truncateVisionResponse } from "./parse-score.js";
import { DEFAULT_VISION_MAX_EDGE_PX, prepareVisionImage } from "./vision-image.js";
import { isRateLimitReason } from "./vision-throttle.js";
/** Attachment-supported raster types (same vocabulary as `dsh-attachment`). */
const MEDIA_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
/** Default quality-scoring instruction (JSON suffix appended at request time). */
export const PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT = [
    '你正在从一组近似照片（例如连拍人像）中评估「这一张」是否值得保留。',
    '请给出 0–100 的综合保留分，用于选出最好的照片。',
    '加分项：对焦清晰、曝光正确、构图舒服、表情自然、眼睛睁开、运动模糊少、无明显瑕疵。',
    '减分项：模糊、闭眼/眨眼、表情尴尬、严重过曝/欠曝、主体被裁切、噪点重、杂乱背景干扰主体。',
].join('');
/** Fixed JSON response-format suffix always appended to the scoring prompt. */
export const PHOTO_PICK_SCORE_JSON_SUFFIX = [
    '',
    '只回复一个 JSON 对象（不要 markdown 代码块），字段名保持英文：',
    '{"score":0-100,"reasons":["简短优点",...],"flaws":["简短缺点",...]}',
    'reasons 与 flaws 各最多 4 条；允许空数组。数组内的文字请用中文。',
].join('\n');
/**
 * Build the effective scoring prompt.
 * Custom text replaces only the free-form instruction; the JSON suffix is always appended.
 * Optional `criteria` from the tool call is appended as a user preference line.
 * @param custom - settings override; empty keeps the built-in instruction.
 * @param criteria - optional per-call preference text.
 */
export function resolveScorePrompt(custom, criteria) {
    const trimmed = custom?.trim() ?? '';
    let instruction = trimmed.length > 0 ? trimmed : PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT;
    const extra = criteria?.trim();
    if (extra !== undefined && extra.length > 0) {
        instruction = `${instruction}\n用户偏好：${extra}`;
    }
    if (instruction.includes(PHOTO_PICK_SCORE_JSON_SUFFIX))
        return instruction;
    return `${instruction}${PHOTO_PICK_SCORE_JSON_SUFFIX}`;
}
/**
 * Score one image via the configured LLM route.
 * @param filePath - absolute image path.
 * @param relativePath - root-relative path for the result row.
 * @param config - LLM vision config.
 * @param signal - cancellation.
 */
export async function scoreImageWithLlm(filePath, relativePath, config, signal) {
    const base = {
        path: filePath,
        relativePath,
        score: 0,
        reasons: [],
        flaws: [],
    };
    try {
        const info = await stat(filePath);
        if (info.size > config.maxBytes) {
            return {
                ok: false,
                rateLimited: false,
                score: { ...base, error: `vision-oversize:${info.size}>${config.maxBytes}` },
            };
        }
        const mediaType = mediaTypeOf(filePath);
        if (mediaType === undefined) {
            return {
                ok: false,
                rateLimited: false,
                score: { ...base, error: 'vision-unsupported-media-type' },
            };
        }
        const bytes = await readFile(filePath);
        const prepared = await prepareVisionImage(bytes, mediaType, config.maxEdgePx ?? DEFAULT_VISION_MAX_EDGE_PX);
        if (prepared.data.length > config.maxBytes) {
            return {
                ok: false,
                rateLimited: false,
                score: {
                    ...base,
                    error: `vision-oversize:${prepared.data.length}>${config.maxBytes}`,
                },
            };
        }
        const attachment = await config.attachments.saveImage({
            data: prepared.data,
            mediaType: prepared.mediaType,
            name: prepared.resized
                ? `${basename(filePath, extname(filePath))}.jpg`
                : basename(filePath),
        });
        const prompt = config.prompt;
        let text;
        try {
            text = await collectAssistantText(config.llm.stream({
                provider: config.provider,
                model: config.model,
                maxTokens: 300,
                messages: [createUserMessage({
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image', attachment },
                        ],
                        source: { kind: 'plugin', plugin: 'dsh-photo-pick-local' },
                    })],
                ...(signal === undefined ? {} : { signal }),
            }));
        }
        catch (error) {
            if (signal?.aborted)
                throw error;
            const detail = error instanceof Error ? error.message : String(error);
            return {
                ok: false,
                rateLimited: isRateLimitReason(detail),
                score: { ...base, error: detail.slice(0, 200) },
            };
        }
        const parsed = parseVisionScoreJson(text);
        if (parsed === undefined) {
            return {
                ok: false,
                rateLimited: false,
                score: {
                    ...base,
                    error: `vision-parse:${truncateVisionResponse(text).slice(0, 120)}`,
                },
            };
        }
        return {
            ok: true,
            rateLimited: false,
            score: {
                path: filePath,
                relativePath,
                score: parsed.score,
                reasons: parsed.reasons,
                flaws: parsed.flaws,
            },
        };
    }
    catch (error) {
        if (signal?.aborted)
            throw error;
        const detail = error instanceof Error ? error.message : String(error);
        return {
            ok: false,
            rateLimited: isRateLimitReason(detail),
            score: { ...base, error: detail.slice(0, 200) },
        };
    }
}
function mediaTypeOf(filePath) {
    return MEDIA_TYPES[extname(filePath).toLowerCase()];
}
async function collectAssistantText(stream) {
    let text = '';
    for await (const chunk of stream) {
        if (chunk.type === 'text-delta')
            text += chunk.text;
        if (chunk.type === 'finish' && chunk.reason.kind === 'aborted') {
            throw new Error(chunk.reason.failure.message);
        }
        if (chunk.type === 'finish' && chunk.reason.kind === 'error') {
            throw new Error(chunk.reason.failure.message);
        }
    }
    return text;
}
//# sourceMappingURL=vision-score.js.map