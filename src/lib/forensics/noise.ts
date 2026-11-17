import type { Box, Finding } from './types'
import type { DecodedImage } from './decode'
import { canvasToDataUrl, clamp, createCanvas, get2d, heatColor, mad, mean, median, percentile } from './utils'

export interface NoiseOutput {
  score: number
  heatmap: string
  boxes: Box[]
  findings: Finding[]
  cells: Array<{ x: number; y: number; v: number }>
  detail: string
  summary: string
  anomalyRatio: number
  /** Number of coherent anomalous blobs and the largest one's cell count. */
  blobs: number
  largestBlob: number
  /** Largest blob's share of all anomalous cells: one edit is one region. */
  dominance: number
}

const BLOCK = 20
/** Scattered single-block outliers are normal scene texture; only coherent
 * blobs of at least this many cells count as evidence. */
const MIN_BLOB = 5
/** Robust z-score needed before a cell is even considered an outlier. */
const Z_FLAG = 5

/**
 * Sensor-noise consistency. A 3×3 high-pass residual isolates per-pixel noise.
 *
 * The residual is first normalised against local texture (the block's mean
 * gradient), because in an untouched photograph residual energy simply tracks
 * how much detail a block contains — foliage and hair always carry more raw
 * energy than sky. Fitting log(residual) against log(texture) removes that
 * dependence, so only regions whose grain is inconsistent with their own
 * detail stand out. Anomalies must also form a coherent blob and be extreme
 * in absolute terms before they influence the score.
 */
export function runNoise(decoded: DecodedImage): NoiseOutput {
  const { width, height, gray } = decoded
  const residual = new Float32Array(width * height)

  // Separable 3×3 box blur, then residual = pixel − local mean.
  const blurred = new Float32Array(width * height)
  const temp = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - 1)
      const right = Math.min(width - 1, x + 1)
      temp[row + x] = (gray[row + left] + gray[row + x] + gray[row + right]) / 3
    }
  }
  for (let y = 0; y < height; y++) {
    const up = Math.max(0, y - 1) * width
    const down = Math.min(height - 1, y + 1) * width
    const row = y * width
    for (let x = 0; x < width; x++) {
      blurred[row + x] = (temp[up + x] + temp[row + x] + temp[down + x]) / 3
    }
  }
  for (let i = 0; i < residual.length; i++) residual[i] = Math.abs(gray[i] - blurred[i])

  // Local texture proxy: mean gradient magnitude per block. Both the residual
  // and the gradient measure "detail", so their ratio is scale-free.
  const grad = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const gx = gray[i + 1] - gray[i - 1]
      const gy = gray[i + width] - gray[i - width]
      grad[i] = Math.sqrt(gx * gx + gy * gy) * 0.5
    }
  }

  const cols = Math.ceil(width / BLOCK)
  const rows = Math.ceil(height / BLOCK)
  const values: number[] = []
  const textures: number[] = []
  const grid = new Float32Array(cols * rows)

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * BLOCK
      const y0 = by * BLOCK
      const x1 = Math.min(x0 + BLOCK, width)
      const y1 = Math.min(y0 + BLOCK, height)
      let sum = 0
      let sumSq = 0
      let gsum = 0
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const r = residual[y * width + x]
          sum += r
          sumSq += r * r
          gsum += grad[y * width + x]
          count++
        }
      }
      const variance = count ? Math.max(0, sumSq / count - (sum / count) ** 2) : 0
      const value = Math.sqrt(variance)
      values.push(value)
      textures.push(count ? gsum / count : 0)
      grid[by * cols + bx] = value
    }
  }

  // --- Texture-normalised model ------------------------------------------
  // Fit log(residual) = a + b·log(texture + 1). The residual of an untouched
  // frame is predicted by its own detail; anything far off the line is
  // suspicious regardless of whether the region is busy or flat.
  const lv = values.map((v) => Math.log(v + 0.25))
  const lg = textures.map((g) => Math.log(g + 1))
  const meanG = mean(lg)
  const meanV = mean(lv)
  let cov = 0
  let varG = 0
  for (let i = 0; i < lv.length; i++) {
    cov += (lg[i] - meanG) * (lv[i] - meanV)
    varG += (lg[i] - meanG) ** 2
  }
  const slope = clamp(cov / Math.max(varG, 1e-6), 0.15, 2.5)
  const norm = lv.map((e, i) => e - slope * lg[i])

  const centre = median(norm)
  const spread = Math.max(mad(norm, centre), 0.08)
  const rawMedian = median(values)

  // Absolute-evidence guards: a cell must also be extreme in raw terms, so a
  // uniformly flat region (sky) or a uniformly busy one (foliage) cannot read
  // as an anomaly just because it sits off the fitted line.
  const flags = new Uint8Array(grid.length)
  const zs = new Float32Array(grid.length)
  for (let i = 0; i < grid.length; i++) {
    const z = (norm[i] - centre) / spread
    zs[i] = z
    if (Math.abs(z) < Z_FLAG) continue
    if (z > 0 && values[i] < rawMedian * 1.8) continue
    if (z < 0 && textures[i] < 1.5) continue
    flags[i] = 1
  }

  // Spatial coherence: keep only 4-connected blobs of at least MIN_BLOB cells.
  const seen = new Uint8Array(grid.length)
  const coherent = new Uint8Array(grid.length)
  let coherentCount = 0
  let flaggedCount = 0
  let largestBlob = 0
  let blobCount = 0
  const flagged: Array<{ index: number; v: number }> = []

  for (let i = 0; i < grid.length; i++) {
    if (flags[i]) flaggedCount++
    if (!flags[i] || seen[i]) continue
    const stack = [i]
    const component: number[] = []
    seen[i] = 1
    while (stack.length) {
      const index = stack.pop() as number
      component.push(index)
      const x = index % cols
      const y = Math.floor(index / cols)
      if (x > 0 && flags[index - 1] && !seen[index - 1]) {
        seen[index - 1] = 1
        stack.push(index - 1)
      }
      if (x < cols - 1 && flags[index + 1] && !seen[index + 1]) {
        seen[index + 1] = 1
        stack.push(index + 1)
      }
      if (y > 0 && flags[index - cols] && !seen[index - cols]) {
        seen[index - cols] = 1
        stack.push(index - cols)
      }
      if (y < rows - 1 && flags[index + cols] && !seen[index + cols]) {
        seen[index + cols] = 1
        stack.push(index + cols)
      }
    }
    if (component.length >= MIN_BLOB) {
      blobCount++
      largestBlob = Math.max(largestBlob, component.length)
      for (const index of component) {
        coherent[index] = 1
        coherentCount++
      }
    }
  }

  for (let i = 0; i < grid.length; i++) {
    if (!coherent[i]) continue
    const z = zs[i]
    const v = clamp(Math.abs(z) / 9, 0, 1)
    flagged.push({ index: i, v })
  }

  const anomalyRatio = coherentCount / Math.max(grid.length, 1)
  const rawAnomalyRatio = flaggedCount / Math.max(grid.length, 1)
  const absZ = Array.from(zs, (z) => Math.abs(z))
  const tailZ = percentile(absZ, 95)
  const sat = (n: number) => clamp(n, 0, 1)
  const dominance = coherentCount > 0 ? largestBlob / coherentCount : 0
  // A pasted region covers a small part of the frame. When a large share is
  // "inconsistent" the model simply does not fit this content (feather detail
  // over sky, heavy film grain), which is not evidence of an edit.
  const locality = clamp(1 - Math.max(0, anomalyRatio - 0.06) / 0.1, 0.2, 1)
  const score = clamp(
    100 * (0.62 * sat(anomalyRatio / 0.05) + 0.38 * sat((tailZ - 5) / 9)) * locality,
  )

  const heatCanvas = createCanvas(width, height)
  const heatCtx = get2d(heatCanvas)
  const image = heatCtx.createImageData(width, height)
  for (let i = 0; i < absZ.length; i++) absZ[i] = clamp((absZ[i] - 1.5) / 7, 0, 1)
  const lowP = 0
  const highP = 1
  const span = highP - lowP || 1

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const t = clamp((absZ[by * cols + bx] - lowP) / span, 0, 1)
      const [r, g, b] = heatColor(t)
      const x1 = Math.min((bx + 1) * BLOCK, width)
      const y1 = Math.min((by + 1) * BLOCK, height)
      for (let y = by * BLOCK; y < y1; y++) {
        for (let x = bx * BLOCK; x < x1; x++) {
          const p = (y * width + x) * 4
          image.data[p] = r
          image.data[p + 1] = g
          image.data[p + 2] = b
          image.data[p + 3] = 235
        }
      }
    }
  }
  heatCtx.putImageData(image, 0, 0)

  const boxes: Box[] = []
  for (const cell of flagged) {
    const bx = cell.index % cols
    const by = Math.floor(cell.index / cols)
    boxes.push({
      x: bx * BLOCK,
      y: by * BLOCK,
      w: BLOCK,
      h: BLOCK,
      score: 40 + cell.v * 55,
      source: 'noise',
    })
  }

  const centreRaw = median(values)
  const findings: Finding[] = [
    {
      label: 'Noise floor',
      detail: `Median high-pass deviation is ${centreRaw.toFixed(2)} per 20×20 block (MAD ${mad(values, centreRaw).toFixed(2)}); texture slope b=${slope.toFixed(2)} after normalisation.`,
      severity: 'info',
    },
  ]

  if (anomalyRatio > 0) {
    findings.push({
      label: `${coherentCount} blocks in coherent anomalous regions`,
      detail: `${(anomalyRatio * 100).toFixed(1)}% of the frame sits in blobs of ≥${MIN_BLOB} blocks whose grain is inconsistent with local detail — sharper (imported sensor) or smoother (retouched) than neighbours. Scattered single-block texture is ignored.`,
      severity: anomalyRatio > 0.05 ? 'high' : 'medium',
    })
  } else {
    findings.push({
      label: 'Consistent sensor grain',
      detail: `Grain tracks local detail everywhere (${(rawAnomalyRatio * 100).toFixed(1)}% scattered single-block outliers, no coherent region), so no patch looks imported or retouched.`,
      severity: 'low',
    })
  }

  return {
    score,
    heatmap: canvasToDataUrl(heatCanvas, 480, 'image/jpeg', 0.76),
    boxes,
    findings,
    cells: flagged.map((cell) => ({
      x: (cell.index % cols) * BLOCK,
      y: Math.floor(cell.index / cols) * BLOCK,
      v: cell.v,
    })),
    detail:
      'Texture-normalised high-pass noise deviation per 20×20 block (robust z-score after fitting residual against local gradient), scored only where anomalies form coherent regions.',
    summary:
      anomalyRatio > 0
        ? `${(anomalyRatio * 100).toFixed(1)}% of the frame sits in coherent regions with inconsistent grain.`
        : 'Noise is consistent with an untouched capture.',
    anomalyRatio,
    blobs: blobCount,
    largestBlob,
    dominance,
  }
}