import type {
  AnalysisResult,
  Box,
  Heatmap,
  Progress,
  SignalId,
  SignalResult,
  Verdict,
} from './types'
import { decodeImageFile } from './decode'
import { runEla } from './ela'
import { runNoise } from './noise'
import { runCopyMove } from './copyMove'
import { runMetadata } from './metadata'
import { runCompression } from './compression'
import {
  canvasToDataUrl,
  clamp,
  connectedRegions,
  createCanvas,
  get2d,
  heatColor,
  nextFrame,
} from './utils'

const WEIGHTS: Record<SignalId, number> = {
  ela: 26,
  'copy-move': 26,
  noise: 22,
  metadata: 20,
  compression: 8,
}

const LABELS: Record<SignalId, string> = {
  ela: 'Error level analysis',
  'copy-move': 'Copy-move detection',
  noise: 'Sensor noise',
  metadata: 'Metadata provenance',
  compression: 'Compression integrity',
}

/**
 * How far a single decisive signal (≥65) may pull the fused score toward
 * itself. The factors track each signal's precision: a copy-move cluster is
 * raw-pixel verified, metadata is corroboration that can be forged.
 */
const ESCALATION: Record<SignalId, number> = {
  'copy-move': 0.8,
  noise: 0.75,
  ela: 0.6,
  compression: 0.5,
  metadata: 0.35,
}

export const MAX_FILE_BYTES = 22 * 1024 * 1024
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif']

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/') || !SUPPORTED.includes(file.type)) {
    return `${file.name} is not a supported image. Upload a JPEG, PNG, WebP, BMP or GIF.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is larger than 22 MB. Crop or compress it first.`
  }
  return null
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length)
}

function verdictFor(score: number): Verdict {
  if (score < 28) return 'authentic'
  if (score < 60) return 'suspect'
  return 'tampered'
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export async function analyzeFile(
  file: File,
  onProgress: (progress: Progress) => void = () => {},
): Promise<AnalysisResult> {
  const started = performance.now()
  const step = async (progress: Progress) => {
    onProgress(progress)
    await nextFrame()
  }

  const invalid = validateImageFile(file)
  if (invalid) throw new Error(invalid)

  await step({ stage: 'decoding', pct: 6, label: 'Decoding pixels' })
  const decoded = await decodeImageFile(file)

  await step({ stage: 'metadata', pct: 16, label: 'Auditing container metadata' })
  const metadata = runMetadata(decoded)

  await step({ stage: 'ela', pct: 28, label: 'Measuring compression history' })
  let ela: Awaited<ReturnType<typeof runEla>> | null = null
  let elaError: string | undefined
  if (decoded.format === 'jpeg') {
    try {
      ela = await runEla(decoded)
    } catch {
      elaError = 'Recompression comparison failed for this file.'
    }
  }

  await step({ stage: 'noise', pct: 46, label: 'Mapping sensor noise' })
  const noise = runNoise(decoded)

  await step({ stage: 'copy-move', pct: 62, label: 'Matching duplicate texture' })
  const copyMove = runCopyMove(decoded)

  await step({ stage: 'compression', pct: 76, label: 'Checking block-grid consistency' })
  const compression = runCompression(decoded)

  await step({ stage: 'fusion', pct: 88, label: 'Fusing signals' })

  const signals: SignalResult[] = [
    {
      id: 'ela',
      label: LABELS.ela,
      weight: WEIGHTS.ela,
      score: ela ? Math.round(ela.score) : 0,
      summary: ela
        ? ela.summary
        : 'Not available for this container.',
      detail: ela
        ? ela.detail
        : (elaError ??
          'This is a lossless file with no JPEG generation to compare, so error-level analysis was skipped.'),
      findings: ela?.findings ?? [],
      unavailable: ela
        ? undefined
        : (elaError ??
          'Lossless source (PNG/WebP/GIF/BMP): there is no JPEG compression history to compare.'),
    },
    {
      id: 'copy-move',
      label: LABELS['copy-move'],
      weight: WEIGHTS['copy-move'],
      score: Math.round(copyMove.score),
      summary: copyMove.summary,
      detail: copyMove.detail,
      findings: copyMove.findings,
      unavailable: copyMove.available ? undefined : copyMove.unavailableReason,
    },
    {
      id: 'noise',
      label: LABELS.noise,
      weight: WEIGHTS.noise,
      score: Math.round(noise.score),
      summary: noise.summary,
      detail: noise.detail,
      findings: noise.findings,
    },
    {
      id: 'metadata',
      label: LABELS.metadata,
      weight: WEIGHTS.metadata,
      score: Math.round(metadata.score),
      summary: metadata.summary,
      detail: metadata.detail,
      findings: metadata.findings,
    },
    {
      id: 'compression',
      label: LABELS.compression,
      weight: WEIGHTS.compression,
      score: Math.round(compression.score),
      summary: compression.summary,
      detail: compression.detail,
      findings: compression.findings,
    },
  ]

  const available = signals.filter((signal) => !signal.unavailable)
  const totalWeight = available.reduce((sum, signal) => sum + signal.weight, 0) || 1
  const weighted = available.reduce((sum, signal) => sum + signal.score * signal.weight, 0)
  const fused = weighted / totalWeight

  // A decisive individual check must be able to move the verdict without
  // overriding the frame-wide picture. How far depends on the signal: a
  // raw-pixel-verified clone cluster closes most of the gap, a metadata tag
  // only nudges it.
  let strongestId: SignalId = 'ela'
  let strongest = 0
  for (const signal of available) {
    if (signal.score > strongest) {
      strongest = signal.score
      strongestId = signal.id
    }
  }
  const escalated =
    strongest >= 65 ? fused + (strongest - fused) * ESCALATION[strongestId] : fused

  const agreement = stddev(available.map((signal) => signal.score))
  const confidence = Math.round(
    clamp(52 + available.length * 7 - agreement * 0.5 - (decoded.width < 420 ? 6 : 0), 32, 96),
  )

  const score = Math.round(clamp(escalated))
  const verdict = verdictFor(score)

  // Combined suspicion grid, used for the overlay heatmap and region boxes.
  const CELL = 16
  const cols = Math.ceil(decoded.width / CELL)
  const rows = Math.ceil(decoded.height / CELL)
  const grid = new Float32Array(cols * rows)
  const addCell = (x: number, y: number, v: number) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / CELL)))
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / CELL)))
    grid[cy * cols + cx] += v
  }

  if (ela) for (const cell of ela.cells) addCell(cell.x, cell.y, cell.v * 0.85)
  for (const cell of noise.cells) addCell(cell.x, cell.y, cell.v * 0.6)

  const cmScaleX = decoded.width / copyMove.workWidth
  const cmScaleY = decoded.height / copyMove.workHeight
  for (const cell of copyMove.cells) addCell(cell.x * cmScaleX, cell.y * cmScaleY, cell.v)

  const peak = Math.max(...grid, 0.001)
  const heatCanvas = createCanvas(cols * CELL, rows * CELL)
  const heatCtx = get2d(heatCanvas)
  const heatImage = heatCtx.createImageData(heatCanvas.width, heatCanvas.height)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const t = clamp(grid[cy * cols + cx] / peak, 0, 1)
      const [r, g, b] = heatColor(t)
      const alpha = t < 0.04 ? 0 : Math.round(90 + t * 150)
      const x1 = Math.min((cx + 1) * CELL, heatCanvas.width)
      const y1 = Math.min((cy + 1) * CELL, heatCanvas.height)
      for (let y = cy * CELL; y < y1; y++) {
        for (let x = cx * CELL; x < x1; x++) {
          const p = (y * heatCanvas.width + x) * 4
          heatImage.data[p] = r
          heatImage.data[p + 1] = g
          heatImage.data[p + 2] = b
          heatImage.data[p + 3] = alpha
        }
      }
    }
  }
  heatCtx.putImageData(heatImage, 0, 0)

  const regionBoxes: Box[] = connectedRegions(grid, cols, rows, peak * 0.42, 2)
    .slice(0, 4)
    .map((region) => ({
      x: region.x * CELL,
      y: region.y * CELL,
      w: region.w * CELL,
      h: region.h * CELL,
      score: clamp((region.score / peak) * 100),
      source: 'ela' as const,
    }))

  const copyBoxes: Box[] = copyMove.boxes.map((box) => ({
    ...box,
    x: box.x * cmScaleX,
    y: box.y * cmScaleY,
    w: box.w * cmScaleX,
    h: box.h * cmScaleY,
  }))

  const boxes = [...copyBoxes, ...regionBoxes].slice(0, 7)

  const heatmaps: Heatmap[] = [
    {
      id: 'suspicion',
      label: 'Combined suspicion',
      caption: 'Weighted blend of compression, noise and duplicate-texture evidence.',
      dataUrl: canvasToDataUrl(heatCanvas, 560, 'image/jpeg', 0.82),
    },
  ]
  if (ela) {
    heatmaps.push({
      id: 'ela',
      label: 'Error level',
      caption: 'Recompression residual, amplified 14×. Bright areas sit furthest from the global baseline.',
      dataUrl: ela.heatmap,
    })
  }
  heatmaps.push({
    id: 'noise',
    label: 'Noise variance',
    caption: 'High-pass noise energy per block. A splice brings its own grain profile.',
    dataUrl: noise.heatmap,
  })

  const caveats: string[] = []
  if (!ela) caveats.push(metadata.caveats[1] ?? 'Lossless uploads skip error-level analysis.')
  caveats.push(...metadata.caveats.filter((c) => !caveats.includes(c)))
  if (decoded.width < 480) {
    caveats.push('The analysed raster is small; every forensic signal becomes noisier under 480 px.')
  }
  if (decoded.format === 'jpeg' && file.size < 60 * 1024) {
    caveats.push('Heavy recompression (small file size) can flatten the artifacts this scan looks for.')
  }
  caveats.push(
    'Verisect measures statistical anomalies. A low score is not a guarantee of authenticity and a high score is not legal proof.',
  )

  const previewUrl = canvasToDataUrl(decoded.canvas, 900, 'image/jpeg', 0.87)
  const thumb = canvasToDataUrl(decoded.canvas, 460, 'image/jpeg', 0.72)

  await nextFrame()
  onProgress({ stage: 'fusion', pct: 100, label: 'Report ready' })

  return {
    id: newId(),
    fileName: file.name,
    fileSize: file.size,
    format: decoded.format,
    width: decoded.originalWidth,
    height: decoded.originalHeight,
    analysisWidth: decoded.width,
    analysisHeight: decoded.height,
    score,
    verdict,
    confidence,
    signals,
    heatmaps,
    boxes,
    metadata: metadata.entries,
    caveats,
    createdAt: Date.now(),
    processingMs: Math.round(performance.now() - started),
    thumb,
    previewUrl,
  }
}
