/**
 * Downscale vision payloads so provider edge limits (e.g. ModelScope 2048) pass.
 * Copied from `dsh-media-local/vision-image` (same raster prep contract).
 * @module dsh-photo-pick-local/vision-image
 */
import sharp from 'sharp';
/** Default longest edge for vision uploads (ModelScope Qwen-VL free tier). */
export const DEFAULT_VISION_MAX_EDGE_PX = 2048;
/**
 * Keep images within `maxEdgePx` on the longest side; re-encode oversized
 * rasters as JPEG so dimension-limited providers accept them.
 * Undecodable bytes are returned unchanged so callers can still attempt upload.
 * @param data - original image bytes.
 * @param mediaType - caller-declared media type (re-verified by sharp when possible).
 * @param maxEdgePx - longest allowed edge; values `<= 0` disable resizing.
 */
export async function prepareVisionImage(data, mediaType, maxEdgePx = DEFAULT_VISION_MAX_EDGE_PX) {
    const original = Buffer.from(data);
    const sourceBytes = original.length;
    try {
        const image = sharp(original, { failOn: 'error', limitInputPixels: false });
        const meta = await image.metadata();
        const width = meta.width ?? 0;
        const height = meta.height ?? 0;
        if (width <= 0 || height <= 0) {
            return {
                data: original,
                mediaType,
                sourceBytes,
                sourceWidth: width,
                sourceHeight: height,
                width,
                height,
                resized: false,
            };
        }
        if (maxEdgePx <= 0 || (width <= maxEdgePx && height <= maxEdgePx)) {
            return {
                data: original,
                mediaType,
                sourceBytes,
                sourceWidth: width,
                sourceHeight: height,
                width,
                height,
                resized: false,
            };
        }
        const scale = Math.min(maxEdgePx / width, maxEdgePx / height);
        const nextWidth = Math.max(1, Math.floor(width * scale));
        const nextHeight = Math.max(1, Math.floor(height * scale));
        const out = await image
            .resize(nextWidth, nextHeight, { fit: 'fill', withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
        return {
            data: out,
            mediaType: 'image/jpeg',
            sourceBytes,
            sourceWidth: width,
            sourceHeight: height,
            width: nextWidth,
            height: nextHeight,
            resized: true,
        };
    }
    catch {
        // Malformed or unsupported rasters: leave bytes alone for the upload path.
        return {
            data: original,
            mediaType,
            sourceBytes,
            sourceWidth: 0,
            sourceHeight: 0,
            width: 0,
            height: 0,
            resized: false,
        };
    }
}
//# sourceMappingURL=vision-image.js.map