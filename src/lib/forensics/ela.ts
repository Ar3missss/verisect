import type { Box, Finding } from './types'
import type { DecodedImage } from './decode'
import {
  canvasToDataUrl,
  clamp,
  createCanvas,
  get2d,
  heatColor,
  loadImage,
  mad,
  mean,
  median,
  percentile,
} from './utils'

export interface ElaOutput {
  score: number
  heatmap: string
  boxes: Box[]
  findings: Finding[]
  cells: Array<{ x: number; y: number; v: number }>
  detail: string
  summary: string
  meanDiff: number
  anomalyRatio: number
}

const BLOCK = 16
const REENCQuality = 0.9
/** Only coherent blobs of at least this many blocks count as evidence —
 * scattered outliers are just edges and texture. */
const MIN_BLOB = 5
const Z_FLAG = 5

/**
 * Error Level Analysis. Saving a JPEG again at a known quality produces a
 * uniform error field for an untouched frame. Regions with a different
 * compression history — pasted, cloned or spliced content — stand out.
 *
 * Raw residual scales with local detail (edges always burn), so each block's
 * residual is fitted against its own gradient in log space and only the
 * deviation from that fit is scored. On an untouched photograph the fit
 * explains the residual almost everywhere; a recompressed region is wrong for
 * its texture level and forms a coherent blob that survives the filters.
 */
export async function runEla(decoded: DecodedImage): Promise<ElaOutput> {
  const { width, height, gray } = decoded
  const original = decoded.canvas.toDataURL('image/jpeg', REENCQuality)
  const image = await loadImage(original)

  const reCanvas = createCanvas(width, height)
  const reCtx = get2d(reCanvas)
  reCtx.drawImage(image, 0, 0, width, height)
  const reData = reCtx.getImageData(0, 0, width, height).data

  const diff = new Float32Array(width * height)
  let total = 0
  for (let i = 0, p = 0; i < diff.length; i++, p += 4) {
    const luma = 0.299 * reData[p] + 0.587 * reData[p + 1] + 0.114 * reData[p + 2]
    const d = Math.abs(luma - gray[i])
    diff[i] = d
    total += d
  }

  // Local texture: mean gradient magnitude per block.
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
  const blockMeans: number[] = []
  const blockTextures: number[] = []
  const rawGrid = new Float32Array(cols * rows)

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * BLOCK
      const y0 = by * BLOCK
      const x1 = Math.min(x0 + BLOCK, width)
      const y1 = Math.min(y0 + BLOCK, height)
      let sum = 0
      let gsum = 0
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += diff[y * width + x]
          gsum += grad[y * width + x]
          count++
        }
      }
      const value = count ? sum / count : 0
      blockMeans.push(value)
      blockTextures.push(count ? gsum / count : 0)
      rawGrid[by * cols + bx] = value
    }
  }

  // --- Texture-normalised model ------------------------------------------
  // log(residual) = a + b·log(texture + 1). Edges predict their own error;
  // only regions whose error is wrong for their detail level survive.
  const lv = blockMeans.map((v) => Math.log(v + 0.3))
  const lg = blockTextures.map((g) => Math.log(g + 1))
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
  const rawMedian = median(blockMeans)

  // Flag cells off the fit, but only when they are also absolute outliers —
  // flat sky or a busy hedge cannot read as an anomaly on relative error alone.
  const zs = new Float32Array(norm.length)
  const flags = new Uint8Array(norm.length)
  for (let i = 0; i < norm.length; i++) {
    const z = (norm[i] - centre) / spread
    zs[i] = z
    if (Math.abs(z) < Z_FLAG) continue
    if (z > 0 && blockMeans[i] < rawMedian * 1.8) continue
    if (z < 0 && blockTextures[i] < 1.5) continue
    flags[i] = 1
  }

  // Spatial coherence: only 4-connected blobs of ≥ MIN_BLOB blocks count.
  const seen = new Uint8Array(flags.length)
  const coherent = new Uint8Array(flags.length)
  let coherentCount = 0
  let flaggedCount = 0
  const flagged: Array<{ index: number; v: number }> = []

  for (let i = 0; i < flags.length; i++) {
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
      for (const index of component) {
        coherent[index] = 1
        coherentCount++
      }
    }
  }

  for (let i = 0; i < flags.length; i++) {
    if (!coherent[i]) continue
    flagged.push({ index: i, v: clamp(Math.abs(zs[i]) / 9, 0, 1) })
  }

  const anomalyRatio = coherentCount / Math.max(gridLength(rawGrid), 1)
  const absZ = Array.from(zs, (z) => Math.abs(z))
  const tailZ = percentile(absZ, 95)
  const sat = (n: number) => clamp(n, 0, 1)
  const score = clamp(
    100 * (0.66 * sat(anomalyRatio / 0.05) + 0.34 * sat((tailZ - 5) / 9)),
  )

  // Heatmap: texture-normalised residual (z), so edges no longer dominate and
  // genuinely inconsistent regions glow.
  const heatCanvas = createCanvas(width, height)
  const heatCtx = get2d(heatCanvas)
  const imageData = heatCtx.createImageData(width, height)
  const heatZ = new Float32Array(zs.length)
  for (let i = 0; i < zs.length; i++) heatZ[i] = clamp((Math.abs(zs[i]) - 1.5) / 7, 0, 1)
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const t = clamp(heatZ[by * cols + bx], 0, 1)
      const [r, g, b] = heatColor(t)
      const x1 = Math.min((bx + 1) * BLOCK, width)
      const y1 = Math.min((by + 1) * BLOCK, height)
      for (let y = by * BLOCK; y < y1; y++) {
        for (let x = bx * BLOCK; x < x1; x++) {
          const p = (y * width + x) * 4
          imageData.data[p] = r
          imageData.data[p + 1] = g
          imageData.data[p + 2] = b
          imageData.data[p + 3] = 240
        }
      }
    }
  }
  heatCtx.putImageData(imageData, 0, 0)

  const boxes: Box[] = []
  for (const block of flagged) {
    const bx = block.index % cols
    const by = Math.floor(block.index / cols)
    boxes.push({
      x: bx * BLOCK,
      y: by * BLOCK,
      w: BLOCK,
      h: BLOCK,
      score: 45 + block.v * 50,
      source: 'ela',
    })
  }

  const findings: Finding[] = [
    {
      label: 'Global error baseline',
      detail: `Mean residual ${(total / diff.length).toFixed(2)} over the frame; median block error ${rawMedian.toFixed(2)}; texture slope b=${slope.toFixed(2)} after normalisation.`,
      severity: 'info',
    },
  ]

  if (coherentCount > 0) {
    findings.push({
      label: `${coherentCount} blocks in coherent anomalous regions`,
      detail: `${(anomalyRatio * 100).toFixed(1)}% of the frame sits in blobs of ≥${MIN_BLOB} blocks whose recompression error is wrong for their texture level (z > ${Z_FLAG}). Scattered edge blocks are excluded.`,
      severity: anomalyRatio > 0.05 ? 'high' : 'medium',
    })
  } else if (flaggedCount > 0) {
    findings.push({
      label: `${flaggedCount} scattered outlier block${flaggedCount === 1 ? '' : 's'}`,
      detail: 'Individual blocks sit off the fit but never form a region — normal for edges and fine detail, not evidence of recompression.',
      severity: 'low',
    })
  } else {
    findings.push({
      label: 'Uniform compression history',
      detail: 'No block deviates from its texture-predicted error, so the whole frame shares one compression history.',
      severity: 'low',
    })
  }

  return {
    score,
    heatmap: canvasToDataUrl(heatCanvas, 480, 'image/jpeg', 0.76),
    boxes,
    findings,
    cells: flagged.map((block) => ({
      x: (block.index % cols) * BLOCK,
      y: Math.floor(block.index / cols) * BLOCK,
      v: block.v,
    })),
    detail: `Re-encoded at JPEG quality ${Math.round(REENCQuality * 100)}, compared per pixel against the upload, then fitted against local texture so only relative anomalies are scored.`,
    summary:
      anomalyRatio > 0
        ? `${(anomalyRatio * 100).toFixed(1)}% of the frame sits in coherent regions with abnormal recompression error.`
        : 'Compression error matches the texture everywhere.',
    meanDiff: total / diff.length,
    anomalyRatio,
  }
}

function gridLength(grid: Float32Array): number {
  return grid.length
}