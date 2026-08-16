import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { prepareVisionImage } from '../src/vision-image.ts'

describe('prepareVisionImage', () => {
  it('leaves images within the edge limit unchanged', async () => {
    const data = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toBuffer()
    const prepared = await prepareVisionImage(data, 'image/png', 2048)
    expect(prepared.resized).toBe(false)
    expect(prepared.mediaType).toBe('image/png')
    expect(prepared.width).toBe(800)
    expect(prepared.height).toBe(600)
  })

  it('downscales oversized images to fit the edge limit as JPEG', async () => {
    const data = await sharp({
      create: { width: 2128, height: 1271, channels: 3, background: { r: 40, g: 50, b: 60 } },
    }).png().toBuffer()
    const prepared = await prepareVisionImage(data, 'image/png', 2048)
    expect(prepared.resized).toBe(true)
    expect(prepared.mediaType).toBe('image/jpeg')
    expect(Math.max(prepared.width, prepared.height)).toBe(2048)
  })
})
