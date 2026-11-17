import type { Finding } from './types'
import type { DecodedImage } from './decode'
import { clamp, mean } from './utils'

export interface CompressionOutput {
  score: number
  findings: Finding[]
  detail: string
  summary: string
  gridStrength: number
  regionSpread: number
  phase: number
}

function boundaryRatio(gray: Float32Array, width: number, height: number, phase: number) {
  let boundary = 0
  let boundaryCount = 0
  let interior = 0
  let interiorCount = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const g = Math.abs(gray[y * width + x] - gray[y * width + x - 1]) +
        Math.abs(gray[y * width + x] - gray[(y - 1) * width + x])
      if ((x - phase) % 8 === 0) {
        boundary += g
        boundaryCount++
      } else {
        interior += g
        interiorCount++
      }
    }
  }
  const b = boundary / Math.max(boundaryCount, 1)
  const i = interior / Math.max(interiorCount, 1)
  return { ratio: b / Math.max(i, 0.05), boundary: b, interior: i }
}

/**
 * JPEG leaves an 8×8 quantisation grid. A strong, perfectly aligned grid points
 * to repeated recompression; a grid whose strength varies by region means parts
 * of the frame have different compression histories.
 */
export function runCompression(decoded: DecodedImage): CompressionOutput {
  const { gray, width, height } = decoded

  let bestPhase = 0
  let bestRatio = 0
  for (let phase = 0; phase < 8; phase++) {
    const { ratio } = boundaryRatio(gray, width, height, phase)
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestPhase = phase
    }
  }

  const regions: number[] = []
  const cols = 3
  const rows = 3
  const regionW = Math.floor(width / cols)
  const regionH = Math.floor(height / rows)
  if (regionW > 24 && regionH > 24) {
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const sub = new Float32Array(regionW * regionH)
        for (let y = 0; y < regionH; y++) {
          const src = (ry * regionH + y) * width + rx * regionW
          sub.set(gray.subarray(src, src + regionW), y * regionW)
        }
        regions.push(boundaryRatio(sub, regionW, regionH, bestPhase).ratio)
      }
    }
  }

  const avg = mean(regions)
  const regionSpread = regions.length
    ? Math.sqrt(mean(regions.map((r) => (r - avg) ** 2)))
    : 0

  const sat = (n: number) => clamp(n, 0, 1)
  const score = clamp(
    100 * (0.4 * sat((bestRatio - 1.2) / 0.5) + 0.6 * sat((regionSpread - 0.05) / 0.22)),
  )

  const findings: Finding[] = [
    {
      label: `8×8 grid strength ${bestRatio.toFixed(2)}×`,
      detail: `Block boundaries carry ${(bestRatio * 100 - 100).toFixed(0)}% more energy than block interiors at phase ${bestPhase}. Strong grids indicate repeated JPEG generations.`,
      severity: bestRatio > 1.5 ? 'medium' : 'info',
    },
    {
      label: `Regional spread ${regionSpread.toFixed(3)}`,
      detail:
        regionSpread > 0.12
          ? 'The grid is noticeably stronger in some regions than others — consistent with content spliced in from a differently compressed source.'
          : 'Grid strength is even across the frame, so no region stands out as pasted from another file.',
      severity: regionSpread > 0.12 ? 'medium' : 'low',
    },
  ]

  return {
    score,
    findings,
    detail: 'Gradient energy across the 8×8 JPEG lattice, compared between regions.',
    summary:
      score >= 55
        ? 'Compression artifacts are uneven across the frame.'
        : 'Compression artifacts are broadly uniform.',
    gridStrength: bestRatio,
    regionSpread,
    phase: bestPhase,
  }
}
