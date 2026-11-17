import type { Box, Finding } from './types'
import type { DecodedImage } from './decode'
import { clamp, createCanvas, get2d } from './utils'

export interface CopyMoveOutput {
  score: number
  boxes: Box[]
  findings: Finding[]
  cells: Array<{ x: number; y: number; v: number }>
  detail: string
  summary: string
  pairs: number
  offsets: Array<{ dx: number; dy: number; count: number }>
  /** Correlation-weighted strength of each accepted cluster (aligned with offsets). */
  strengths: number[]
  /** Per-cluster diagnostics used for threshold calibration. */
  clusters: Array<{
    dx: number
    dy: number
    count: number
    strength: number
    meanNcc: number
    overlap?: number
    density?: number
    spread?: number
    peak?: number
    quality?: number
    medianMad: number
    medianRatio?: number
    accepted: boolean
    area: number
    minNcc?: number
    sourceArea?: number
    copyArea?: number
  }>
  available: boolean
  unavailableReason?: string
  /** Working raster dimensions; boxes and cells are expressed in this space. */
  workWidth: number
  workHeight: number
}

const WORK_MAX = 340
const PATCH = 32
const STRIDE = 4
const DESC = 8 // descriptor cells per side; each cell is 4×4 working pixels
const MIN_SEPARATION = 34
const MIN_DETAIL = 3.2
const CORNER_FLOOR = 120
const MIN_NCC = 0.9
const CLUSTER_TOL = 9
/** A genuine copy duplicates the same pixels: after one re-encode its raw
 * difference stays at quantisation level. Similar-looking natural texture
 * (clouds, fences, foliage) correlates in descriptors but differs in pixels. */
const MAX_MAD = 13

/**
 * A duplicate copies its pixels, so the pair's raw difference stays near the
 * re-encode floor. Similar-looking natural texture correlates in the smoothed
 * descriptors but differs in pixels. Chance matches that survive this gate are
 * still only credited when the cluster is concentrated at one offset and fills
 * the duplicated box (see `quality` below).
 */
const MIN_TEXTURE = 6

const isCopyPair = (match: Match) => match.mad <= MAX_MAD && match.texture >= MIN_TEXTURE

interface Patch {
  x: number
  y: number
  desc: Float32Array
  energy: number
  /** RMS energy left after removing a best-fit ramp — i.e. real detail. */
  detail: number
  /** Mean absolute deviation of the raw pixels — the natural scale of MAD. */
  texture: number
  /** Smaller eigenvalue of the gradient structure tensor — corner strength. */
  cornerness: number
}

interface Match {
  a: number
  b: number
  /** Normalised cross-correlation of the two descriptors (0–1). */
  ncc: number
  /** Mean absolute raw-pixel difference between the two patch windows. */
  mad: number
  /** mad divided by the pair's local texture, so busy photos are judged fairly. */
  ratio: number
  /** Weaker of the two patches' textures; flat paper matches any other flat paper. */
  texture: number
  dx: number
  dy: number
}

interface Cluster {
  matches: Match[]
  dx: number
  dy: number
  /** Correlation-weighted pair count: a 0.99 match counts far more than a 0.91 one. */
  strength: number
  /** Median raw-pixel difference across the cluster's pairs. */
  medianMad: number
  /** Median mad/texture ratio across the cluster's pairs. */
  medianRatio: number
}

function smooth(gray: Float32Array, width: number, height: number): Float32Array {
  const temp = new Float32Array(gray.length)
  const out = new Float32Array(gray.length)
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
      out[row + x] = (temp[up + x] + temp[row + x] + temp[down + x]) / 3
    }
  }
  return out
}

const HI_MAX = 1600

/**
 * Raw-pixel verification buffer. Patch matching runs on a small working raster
 * for speed, but a pixel comparison there would compare *resampled* pixels: the
 * same content lands on a different sub-pixel phase at a different position, so
 * even an exact copy differs. Verification therefore samples close to native
 * resolution.
 */
function toHiGray(decoded: DecodedImage): {
  raw: Float32Array
  width: number
  height: number
} {
  const scale = Math.min(1, HI_MAX / Math.max(decoded.width, decoded.height))
  const width = Math.max(1, Math.round(decoded.width * scale))
  const height = Math.max(1, Math.round(decoded.height * scale))
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(decoded.canvas, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const raw = new Float32Array(width * height)
  for (let i = 0, p = 0; i < raw.length; i++, p += 4) {
    raw[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
  }
  return { raw, width, height }
}

function toWorkingGray(decoded: DecodedImage): {
  gray: Float32Array
  raw: Float32Array
  width: number
  height: number
} {
  const scale = Math.min(1, WORK_MAX / Math.max(decoded.width, decoded.height))
  const width = Math.max(1, Math.round(decoded.width * scale))
  const height = Math.max(1, Math.round(decoded.height * scale))
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(decoded.canvas, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const raw = new Float32Array(width * height)
  for (let i = 0, p = 0; i < raw.length; i++, p += 4) {
    raw[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
  }
  // A light blur makes descriptors tolerant of the one-pixel phase shift that a
  // re-encode or a slightly different paste position introduces.
  return { gray: smooth(raw, width, height), raw, width, height }
}

/** Sample stride that keeps verification under ~3 600 pixels per window. */
const stepFor = (win: number) => Math.max(1, Math.floor(win / 60))

/** Mean absolute deviation of a window's raw pixels from the window mean. */
function patchTexture(
  raw: Float32Array,
  width: number,
  x: number,
  y: number,
  win: number,
): number {
  const step = stepFor(win)
  let sum = 0
  let count = 0
  for (let yy = 0; yy < win; yy += step) {
    const row = (y + yy) * width + x
    for (let xx = 0; xx < win; xx += step) {
      sum += raw[row + xx]
      count++
    }
  }
  const mean = sum / Math.max(1, count)
  let dev = 0
  for (let yy = 0; yy < win; yy += step) {
    const row = (y + yy) * width + x
    for (let xx = 0; xx < win; xx += step) dev += Math.abs(raw[row + xx] - mean)
  }
  return dev / Math.max(1, count)
}

/** Mean absolute raw-pixel difference between two patch windows. */
function patchMad(
  raw: Float32Array,
  width: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  win: number,
): number {
  const step = stepFor(win)
  let total = 0
  let count = 0
  for (let y = 0; y < win; y += step) {
    const rowA = (ay + y) * width + ax
    const rowB = (by + y) * width + bx
    for (let x = 0; x < win; x += step) {
      total += Math.abs(raw[rowA + x] - raw[rowB + x])
      count++
    }
  }
  return total / Math.max(1, count)
}

function describe(gray: Float32Array, width: number, x: number, y: number): Patch {
  const cell = PATCH / DESC
  const raw = new Float32Array(DESC * DESC)
  let sum = 0
  for (let dy = 0; dy < DESC; dy++) {
    for (let dx = 0; dx < DESC; dx++) {
      let acc = 0
      for (let sy = 0; sy < cell; sy++) {
        const row = (y + dy * cell + sy) * width + x + dx * cell
        for (let sx = 0; sx < cell; sx++) acc += gray[row + sx]
      }
      const value = acc / (cell * cell)
      raw[dy * DESC + dx] = value
      sum += value
    }
  }
  const avg = sum / raw.length
  let energy = 0
  for (let i = 0; i < raw.length; i++) {
    raw[i] -= avg
    energy += raw[i] * raw[i]
  }

  // Remove the best-fit plane so smooth gradients (sky, walls, glow) do not
  // masquerade as detail and match each other across the frame.
  const mid = (DESC - 1) / 2
  let suu = 0
  let svv = 0
  let suv = 0
  let sdu = 0
  let sdv = 0
  for (let i = 0; i < raw.length; i++) {
    const u = (i % DESC) - mid
    const v = Math.floor(i / DESC) - mid
    suu += u * u
    svv += v * v
    suv += u * v
    sdu += raw[i] * u
    sdv += raw[i] * v
  }
  const det = suu * svv - suv * suv
  let residual = energy
  if (Math.abs(det) > 1e-6) {
    const bu = (sdu * svv - sdv * suv) / det
    const bv = (sdv * suu - sdu * suv) / det
    let fitted = 0
    for (let i = 0; i < raw.length; i++) {
      const u = (i % DESC) - mid
      const v = Math.floor(i / DESC) - mid
      fitted += (raw[i] - (bu * u + bv * v)) ** 2
    }
    residual = fitted
  }

  // Structure tensor over the descriptor grid: a patch that only varies in one
  // direction (sky gradient, railing, text rule) has a near-zero smaller
  // eigenvalue and cannot be used as a distinctive clone anchor.
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let cy = 0; cy < DESC - 1; cy++) {
    for (let cx = 0; cx < DESC - 1; cx++) {
      const index = cy * DESC + cx
      const gx = raw[index + 1] - raw[index]
      const gy = raw[index + DESC] - raw[index]
      sxx += gx * gx
      syy += gy * gy
      sxy += gx * gy
    }
  }
  const trace = sxx + syy
  const determinant = sxx * syy - sxy * sxy
  const discriminant = Math.max(0, trace * trace - 4 * determinant)
  const cornerness = Math.max(0, (trace - Math.sqrt(discriminant)) / 2)

  return {
    x,
    y,
    desc: raw,
    energy,
    detail: Math.sqrt(Math.max(residual, 0) / raw.length),
    texture: 0,
    cornerness,
  }
}

export function runCopyMove(decoded: DecodedImage): CopyMoveOutput {
  const work = toWorkingGray(decoded)

  if (Math.min(work.width, work.height) < 100) {
    return {
      score: 0,
      boxes: [],
      findings: [],
      cells: [],
      detail: 'Copy-move matching needs a little more resolution to compare texture patches.',
      summary: 'Not enough resolution for block matching.',
      pairs: 0,
      offsets: [],
      strengths: [],
      clusters: [],
      available: false,
      unavailableReason:
        'The image is too small for reliable patch matching (minimum 100 px on the short edge).',
      workWidth: work.width,
      workHeight: work.height,
    }
  }

  const hi = toHiGray(decoded)
  // Patch coordinates map back into the near-native buffer for verification.
  const hiScale = hi.width / work.width
  const win = Math.max(8, Math.min(120, Math.round(PATCH * hiScale)))
  const toHi = (value: number, limit: number) =>
    Math.max(0, Math.min(limit - win, Math.round(value * hiScale)))

  const candidates: Patch[] = []
  for (let y = 0; y + PATCH <= work.height; y += STRIDE) {
    for (let x = 0; x + PATCH <= work.width; x += STRIDE) {
      const patch = describe(work.gray, work.width, x, y)
      if (patch.detail < MIN_DETAIL) continue
      patch.texture = patchTexture(hi.raw, hi.width, toHi(x, hi.width), toHi(y, hi.height), win)
      candidates.push(patch)
    }
  }

  // Anchors are chosen adaptively: keep the corner-rich patches relative to
  // this frame, with an absolute floor so smooth imagery stays out.
  const patches = candidates.filter((patch) => patch.cornerness >= CORNER_FLOOR)

  if (patches.length < 40) {
    return {
      score: 0,
      boxes: [],
      findings: [
        {
          label: 'Not enough distinctive texture',
          detail:
            'Only a handful of corners survived filtering, so block matching would produce noise rather than evidence. This is common in skies, gradients, illustrations and heavy blur.',
          severity: 'info',
        },
      ],
      cells: [],
      detail: 'Copy-move needs distinctive corners; this frame has too few.',
      summary: 'Too few textured anchors to match.',
      pairs: 0,
      offsets: [],
      strengths: [],
      clusters: [],
      available: false,
      unavailableReason:
        'The frame does not contain enough corner-like detail for reliable clone matching.',
      workWidth: work.width,
      workHeight: work.height,
    }
  }

  const matches: Match[] = []
  const dims = DESC * DESC

  for (let i = 0; i < patches.length; i++) {
    const a = patches[i]
    if (a.energy <= 0) continue
    let first: Match | null = null
    let second: Match | null = null

    for (let j = i + 1; j < patches.length; j++) {
      const b = patches[j]
      if (b.energy <= 0) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (Math.abs(dx) < MIN_SEPARATION && Math.abs(dy) < MIN_SEPARATION) continue

      let dot = 0
      for (let k = 0; k < dims; k++) dot += a.desc[k] * b.desc[k]
      const ncc = dot / Math.sqrt(a.energy * b.energy || 1)
      if (ncc < MIN_NCC) continue

      const mad = patchMad(
        hi.raw,
        hi.width,
        toHi(a.x, hi.width),
        toHi(a.y, hi.height),
        toHi(b.x, hi.width),
        toHi(b.y, hi.height),
        win,
      )
      const texture = Math.min(a.texture, b.texture)
      const candidate: Match = {
        a: i,
        b: j,
        ncc,
        mad,
        ratio: mad / Math.max((a.texture + b.texture) / 2, 2),
        texture,
        dx,
        dy,
      }
      if (!first || ncc > first.ncc) {
        second = first
        first = candidate
      } else if (!second || ncc > second.ncc) {
        second = candidate
      }
    }

    if (first) matches.push(first)
    if (second) matches.push(second)
  }

  // Group matches by displacement. Neighbouring buckets merge so that a clone
  // offset split across the rounding boundary still counts as one region.
  const buckets = new Map<string, Match[]>()
  for (const match of matches) {
    const key = `${Math.round(match.dx / CLUSTER_TOL)}:${Math.round(match.dy / CLUSTER_TOL)}`
    const list = buckets.get(key)
    if (list) list.push(match)
    else buckets.set(key, [match])
  }

  const clusters: Cluster[] = []
  const consumed = new Set<string>()
  const ordered = Array.from(buckets.entries()).sort((a, b) => b[1].length - a[1].length)

  for (const [key, list] of ordered) {
    if (consumed.has(key)) continue
    const [kx, ky] = key.split(':').map(Number)
    const group: Match[] = [...list]
    consumed.add(key)
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue
        const neighbour = `${kx + ox}:${ky + oy}`
        if (consumed.has(neighbour)) continue
        const extra = buckets.get(neighbour)
        if (!extra) continue
        group.push(...extra)
        consumed.add(neighbour)
      }
    }
    const avgX = group.reduce((sum, match) => sum + match.dx, 0) / group.length
    const avgY = group.reduce((sum, match) => sum + match.dy, 0) / group.length
    // Strength only credits pairs whose raw pixels actually match — a clone
    // duplicates pixels, similar texture merely correlates in descriptor space.
    const strength = group.reduce(
      (sum, match) =>
        isCopyPair(match) ? sum + clamp((match.ncc - 0.88) / 0.12, 0, 1) : sum,
      0,
    )
    const madSorted = group
      .map((match) => match.mad)
      .sort((a, b) => a - b)
    const medianMad = madSorted[Math.floor(madSorted.length / 2)]
    const ratioSorted = group.map((match) => match.ratio).sort((a, b) => a - b)
    clusters.push({
      matches: group,
      dx: Math.round(avgX),
      dy: Math.round(avgY),
      strength,
      medianMad,
      medianRatio: ratioSorted[Math.floor(ratioSorted.length / 2)],
    })
  }

  clusters.sort((a, b) => b.strength - a.strength)

  const bounds = (matches: Match[], pick: 'a' | 'b') => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const match of matches) {
      const patch = patches[match[pick]]
      minX = Math.min(minX, patch.x)
      minY = Math.min(minY, patch.y)
      maxX = Math.max(maxX, patch.x + PATCH)
      maxY = Math.max(maxY, patch.y + PATCH)
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  // Keep only clusters that describe a localised duplicate. Repeating texture
  // spread across the whole frame (railings, text rules, water lines) is normal
  // scene content, not a clone.
  const frameArea = work.width * work.height
  const accepted = clusters
    .map((cluster) => {
      const source = bounds(cluster.matches, 'a')
      const copy = bounds(cluster.matches, 'b')
      const area = (source.w * source.h) / frameArea
      const rows = new Set(cluster.matches.map((match) => patches[match.a].y)).size
      const cols = new Set(cluster.matches.map((match) => patches[match.a].x)).size

      // How convincing this cluster is as a copied region, on top of the MAD
      // gate. A paste puts nearly every pixel-identical pair on one exact
      // displacement (peak) and fills the duplicated box with anchors
      // (density). Natural repeats — feathers, tentacles, clouds — smear across
      // offsets and scatter across the frame. Only pixel-verified pairs count:
      // unverified pairs are the look-alikes the MAD gate already rejected.
      const verified = cluster.matches.filter(isCopyPair)
      const pool = verified.length >= 6 ? verified : cluster.matches
      const modes = new Map<string, number>()
      for (const match of pool) {
        const key = `${match.dx}:${match.dy}`
        modes.set(key, (modes.get(key) ?? 0) + 1)
      }
      let peakCount = 0
      let peakKey = '0:0'
      for (const [key, value] of modes) {
        if (value > peakCount) {
          peakCount = value
          peakKey = key
        }
      }
      const [peakDx, peakDy] = peakKey.split(':').map(Number)
      let near = 0
      for (const match of pool) {
        if (Math.abs(match.dx - peakDx) <= 2 && Math.abs(match.dy - peakDy) <= 2) near++
      }
      const peak = near / pool.length
      const slots = Math.max(1, (source.w * source.h) / (STRIDE * STRIDE))
      const density = pool.length / slots
      const quality = peak * clamp(density / 0.12, 0, 1)

      return { cluster, source, copy, area, rows, cols, peak, density, quality }
    })
    .filter(
      (entry) =>
        entry.cluster.matches.length >= 8 &&
        entry.cluster.strength >= 5 &&
        entry.cluster.medianMad <= MAX_MAD &&
        entry.area > 0.0015 &&
        entry.area < 0.3 &&
        // A genuine clone covers a 2D block. A long horizon, railing or text
        // rule produces a one-patch-wide band, which is scene structure.
        entry.rows >= 2 &&
        entry.cols >= 2 &&
        entry.source.w >= PATCH * 1.3 &&
        entry.source.h >= PATCH * 1.3,
    )

  const sat = (n: number) => clamp(n, 0, 1)
  const rated = accepted
    .map((entry) => ({
      entry,
      value: sat((entry.cluster.strength - 5) / 10) * clamp(entry.quality * 1.2, 0, 1),
    }))
    .sort((a, b) => b.value - a.value)
  const strongest = rated[0]?.entry
  const clusterScore = 100 * (rated[0]?.value ?? 0)

  // A real clone owns one displacement. Periodic scene content (bricks,
  // windows, tiles, foliage) produces several clusters of comparable strength
  // at *different* offsets; when that happens the match is scene structure.
  const rivals = strongest
    ? accepted.filter((entry) => {
        if (entry === strongest) return false
        if (entry.cluster.strength < strongest.cluster.strength * 0.4) return false
        const ddx = entry.cluster.dx - strongest.cluster.dx
        const ddy = entry.cluster.dy - strongest.cluster.dy
        return Math.abs(ddx) > CLUSTER_TOL * 2 || Math.abs(ddy) > CLUSTER_TOL * 2
      }).length
    : 0
  const periodic = rivals >= 2

  // The raw-pixel (MAD) gate above is what separates a true duplicate from
  // look-alike natural texture, so the strength ramp can respond steeply once
  // a cluster clears it: ~10 verified patches is already a decisive duplicate.
  const score = periodic ? clamp(clusterScore * 0.2) : clamp(clusterScore)

  const boxes: Box[] = []
  const offsets: CopyMoveOutput['offsets'] = []
  const strengths: number[] = []
  const clusterDiags: CopyMoveOutput['clusters'] = []
  const findings: Finding[] = []

  if (periodic && strongest) {
    findings.push({
      label: 'Repeating scene texture, not a clone',
      detail: `${rivals + 1} displacement clusters of comparable strength (${strongest.cluster.strength.toFixed(1)} max) point at a periodic pattern — bricks, windows, tiles or foliage. Copy-move needs one dominant offset.`,
      severity: 'low',
    })
  }

  for (const rawCluster of clusters.slice(0, 5)) {
    const entry = accepted.find((e) => e.cluster === rawCluster)
    const count = rawCluster.matches.length
    const nccs = rawCluster.matches.map((m) => m.ncc)
    const meanNcc = nccs.reduce((a, b) => a + b, 0) / nccs.length
    const mads = rawCluster.matches.map((m) => m.mad).sort((a, b) => a - b)
    const medianMad = mads[Math.floor(mads.length / 2)]
    let variance = 0
    for (const match of rawCluster.matches) {
      variance +=
        (match.dx - rawCluster.dx) ** 2 + (match.dy - rawCluster.dy) ** 2
    }
    const spread = Math.sqrt(variance / rawCluster.matches.length)
    // A pixel-exact duplicate puts almost every pair on one displacement;
    // natural self-similarity smears matches across the ±CLUSTER_TOL bucket.
    const modes = new Map<string, number>()
    for (const match of rawCluster.matches) {
      const key = `${match.dx}:${match.dy}`
      modes.set(key, (modes.get(key) ?? 0) + 1)
    }
    let peakCount = 0
    let peakKey = '0:0'
    for (const [key, value] of modes) {
      if (value > peakCount) {
        peakCount = value
        peakKey = key
      }
    }
    const [peakDx, peakDy] = peakKey.split(':').map(Number)
    let near = 0
    for (const match of rawCluster.matches) {
      if (Math.abs(match.dx - peakDx) <= 2 && Math.abs(match.dy - peakDy) <= 2) near++
    }
    const peak = near / rawCluster.matches.length
    clusterDiags.push({
      dx: rawCluster.dx,
      dy: rawCluster.dy,
      count,
      strength: Number(rawCluster.strength.toFixed(1)),
      meanNcc: Number(meanNcc.toFixed(4)),
      medianMad: Number(medianMad.toFixed(2)),
      medianRatio: Number(rawCluster.medianRatio.toFixed(3)),
      accepted: !!entry,
      area: entry ? Number(entry.area.toFixed(3)) : 0,        })
    if (!entry) continue
    offsets.push({ dx: rawCluster.dx, dy: rawCluster.dy, count })
    strengths.push(Number(rawCluster.strength.toFixed(1)))

    const minNcc = Math.min(...nccs)
    const sourceArea = entry.source.w * entry.source.h
    const copyArea = entry.copy.w * entry.copy.h
    const ix = Math.max(
      0,
      Math.min(entry.source.x + entry.source.w, entry.copy.x + entry.copy.w) -
        Math.max(entry.source.x, entry.copy.x),
    )
    const iy = Math.max(
      0,
      Math.min(entry.source.y + entry.source.h, entry.copy.y + entry.copy.h) -
        Math.max(entry.source.y, entry.copy.y),
    )
    const overlap = ix * iy / Math.max(Math.min(sourceArea, copyArea), 1)
    const last = clusterDiags[clusterDiags.length - 1]
    last.minNcc = Number(minNcc.toFixed(4))
    last.sourceArea = sourceArea
    last.copyArea = copyArea
    last.overlap = Number(overlap.toFixed(3))
    last.density = Number(entry.density.toFixed(3))
    last.peak = Number(peak.toFixed(2))
    last.spread = Number(spread.toFixed(2))
    last.quality = Number(entry.quality.toFixed(3))
    for (const box of [entry.source, entry.copy]) {
      boxes.push({ ...box, score: clamp(45 + count * 1.5, 0, 100), source: 'copy-move' })
      if (boxes.length >= 6) break
    }

    findings.push({
      label: `Clone cluster of ${count} patch pairs`,
      detail: `The same texture repeats at a fixed offset of ${entry.cluster.dx >= 0 ? '+' : ''}${entry.cluster.dx} × ${entry.cluster.dy >= 0 ? '+' : ''}${entry.cluster.dy} px. Real scenes rarely duplicate detail at exactly one displacement.`,
      severity: count > 18 ? 'high' : 'medium',
    })
  }

  const cells: CopyMoveOutput['cells'] = []
  for (const entry of accepted.slice(0, 2)) {
    for (const match of entry.cluster.matches) {
      const patch = patches[match.a]
      cells.push({ x: patch.x, y: patch.y, v: 0.9 })
    }
  }

  if (findings.length === 0) {
    findings.push({
      label: 'No repeated texture at a fixed offset',
      detail: `Compared ${patches.length.toLocaleString()} textured patches across ${matches.length.toLocaleString()} candidate pairs; nothing formed a coherent displacement cluster.`,
      severity: 'low',
    })
  }

  return {
    score,
    boxes,
    findings,
    cells,
    detail: `${patches.length.toLocaleString()} textured ${PATCH}×${PATCH} patch descriptors compared with normalised cross-correlation and clustered by displacement.`,
    summary:
      offsets.length > 0
        ? `${offsets.length} duplicated region${offsets.length === 1 ? '' : 's'} share a repeatable offset.`
        : 'No coherent duplicated region found.',
    pairs: matches.length,
    offsets,
    strengths,
    clusters: clusterDiags,
    available: true,
    workWidth: work.width,
    workHeight: work.height,
  }
}
