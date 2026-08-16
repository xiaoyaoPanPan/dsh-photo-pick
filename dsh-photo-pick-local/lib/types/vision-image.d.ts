/**
 * Downscale vision payloads so provider edge limits (e.g. ModelScope 2048) pass.
 * Copied from `dsh-media-local/vision-image` (same raster prep contract).
 * @module dsh-photo-pick-local/vision-image
 */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
/** Default longest edge for vision uploads (ModelScope Qwen-VL free tier). */
export declare const DEFAULT_VISION_MAX_EDGE_PX = 2048;
/** Result of preparing bytes for a vision request. */
export interface PreparedVisionImage {
    readonly data: Buffer;
    readonly mediaType: ImageMediaType;
    /** On-disk byte length before downscale. */
    readonly sourceBytes: number;
    /** Intrinsic width of the source when known (`0` if undecodable). */
    readonly sourceWidth: number;
    /** Intrinsic height of the source when known (`0` if undecodable). */
    readonly sourceHeight: number;
    /** Width of the bytes that will be sent. */
    readonly width: number;
    /** Height of the bytes that will be sent. */
    readonly height: number;
    /** True when the output was re-encoded (resized and/or converted to JPEG). */
    readonly resized: boolean;
}
/**
 * Keep images within `maxEdgePx` on the longest side; re-encode oversized
 * rasters as JPEG so dimension-limited providers accept them.
 * Undecodable bytes are returned unchanged so callers can still attempt upload.
 * @param data - original image bytes.
 * @param mediaType - caller-declared media type (re-verified by sharp when possible).
 * @param maxEdgePx - longest allowed edge; values `<= 0` disable resizing.
 */
export declare function prepareVisionImage(data: Uint8Array, mediaType: ImageMediaType, maxEdgePx?: number): Promise<PreparedVisionImage>;
//# sourceMappingURL=vision-image.d.ts.map