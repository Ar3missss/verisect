import { createCanvas, get2d } from './utils'

export const MAX_ANALYSIS_DIM = 1100

export interface DecodedImage {
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  scale: number
  canvas: HTMLCanvasElement
  gray: Float32Array
  bytes: Uint8Array
  format: string
  mime: string
}

function sniffFormat(bytes: Uint8Array, fallback: string): string {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0xff, 0xd8, 0xff)) return 'jpeg'
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'png'
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'gif'
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57) return 'webp'
  if (startsWith(0x42, 0x4d)) return 'bmp'
  return fallback || 'unknown'
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const format = sniffFormat(bytes, (file.type.split('/')[1] || '').toLowerCase())

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('That file could not be decoded as an image. Try a JPEG, PNG or WebP.')
  }

  const originalWidth = bitmap.width
  const originalHeight = bitmap.height
  const scale = Math.min(1, MAX_ANALYSIS_DIM / Math.max(originalWidth, originalHeight))
  const width = Math.max(1, Math.round(originalWidth * scale))
  const height = Math.max(1, Math.round(originalHeight * scale))

  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, width, height)
  const gray = new Float32Array(width * height)
  const pixels = imageData.data
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2]
  }

  return {
    width,
    height,
    originalWidth,
    originalHeight,
    scale,
    canvas,
    gray,
    bytes,
    format,
    mime: file.type || `image/${format}`,
  }
}
