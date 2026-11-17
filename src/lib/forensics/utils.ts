export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function median(values: number[] | Float32Array): number {
  if (values.length === 0) return 0
  const sorted = Array.from(values).sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Median absolute deviation — a robust spread estimate that ignores outliers. */
export function mad(values: number[] | Float32Array, centre?: number): number {
  if (values.length === 0) return 0
  const m = centre ?? median(values)
  const deviations = new Array<number>(values.length)
  for (let i = 0; i < values.length; i++) deviations[i] = Math.abs(values[i] - m)
  return median(deviations)
}

export function mean(values: ArrayLike<number>): number {
  if (values.length === 0) return 0
  let total = 0
  for (let i = 0; i < values.length; i++) total += values[i]
  return total / values.length
}

export function percentile(values: ArrayLike<number>, p: number): number {
  if (values.length === 0) return 0
  const sorted = Array.from(values).sort((a, b) => a - b)
  const index = clamp((p / 100) * (sorted.length - 1), 0, sorted.length - 1)
  const low = Math.floor(index)
  const high = Math.ceil(index)
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context is unavailable in this browser')
  return ctx
}

/** Downscale a canvas into a data URL, capping the longest edge. */
export function canvasToDataUrl(
  source: HTMLCanvasElement,
  maxDim: number,
  type = 'image/jpeg',
  quality = 0.8,
): string {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height))
  if (scale >= 1) return source.toDataURL(type, quality)
  const target = createCanvas(source.width * scale, source.height * scale)
  const ctx = get2d(target)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, target.width, target.height)
  return target.toDataURL(type, quality)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode the re-encoded image'))
    img.src = src
  })
}

const yieldChannel =
  typeof MessageChannel !== 'undefined' ? new MessageChannel() : null

/**
 * Yields to the event loop without waiting for an animation frame. Requesting a
 * frame stalls for about a second per stage in a background tab.
 */
export const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (yieldChannel) {
      yieldChannel.port1.onmessage = () => resolve()
      yieldChannel.port2.postMessage(0)
      return
    }
    setTimeout(resolve, 0)
  })

const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [0, [10, 12, 26]],
  [0.22, [62, 12, 108]],
  [0.45, [166, 30, 122]],
  [0.68, [240, 98, 62]],
  [0.86, [250, 190, 70]],
  [1, [255, 246, 178]],
]

/** Inferno-style heat colour for a normalised 0..1 value. */
export function heatColor(t: number): [number, number, number] {
  const v = clamp(t, 0, 1)
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [p1, c1] = HEAT_STOPS[i]
    const [p0, c0] = HEAT_STOPS[i - 1]
    if (v <= p1) {
      const k = (v - p0) / (p1 - p0 || 1)
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ]
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1]
}

/** Merge a set of grid cells into rectangular regions. */
export function connectedRegions(
  values: Float32Array,
  cols: number,
  rows: number,
  threshold: number,
  minCells = 2,
): Array<{ x: number; y: number; w: number; h: number; score: number }> {
  const seen = new Uint8Array(values.length)
  const regions: Array<{ x: number; y: number; w: number; h: number; score: number }> = []

  for (let start = 0; start < values.length; start++) {
    if (seen[start] || values[start] < threshold) continue
    const stack = [start]
    seen[start] = 1
    let minX = start % cols
    let maxX = minX
    let minY = Math.floor(start / cols)
    let maxY = minY
    let count = 0
    let peak = 0

    while (stack.length) {
      const index = stack.pop() as number
      const x = index % cols
      const y = Math.floor(index / cols)
      count++
      peak = Math.max(peak, values[index])
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const next = ny * cols + nx
          if (seen[next] || values[next] < threshold) continue
          seen[next] = 1
          stack.push(next)
        }
      }
    }

    if (count >= minCells) {
      regions.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, score: peak })
    }
  }

  return regions.sort((a, b) => b.w * b.h * b.score - a.w * a.h * a.score)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
