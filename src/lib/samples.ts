import { createCanvas, get2d } from './forensics/utils'

export type SampleKind = 'photo-clean' | 'photo-clone' | 'doc-splice'

export const SAMPLES: Array<{
  kind: SampleKind
  name: string
  label: string
  description: string
  expectation: string
}> = [
  {
    kind: 'photo-clean',
    name: 'clean-capture.jpg',
    label: 'Untouched capture',
    description: 'Synthetic macro scene, one camera and one grain profile.',
    expectation: 'Low score expected',
  },
  {
    kind: 'photo-clone',
    name: 'cloned-detail.jpg',
    label: 'Cloned region',
    description: 'The same scene with a 170×130 crop duplicated elsewhere in the frame.',
    expectation: 'Copy-move should flag it',
  },
  {
    kind: 'doc-splice',
    name: 'edited-receipt.jpg',
    label: 'Edited document',
    description: 'A receipt whose paid stamp appears twice.',
    expectation: 'Clone evidence expected',
  },
]

function mulberry(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function addGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
  seed: number,
) {
  const image = ctx.getImageData(0, 0, width, height)
  const random = mulberry(seed)
  for (let i = 0; i < image.data.length; i += 4) {
    const delta = (random() - 0.5) * amount
    image.data[i] = Math.max(0, Math.min(255, image.data[i] + delta))
    image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + delta))
    image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + delta))
  }
  ctx.putImageData(image, 0, 0)
}

function drawConcrete(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#746c60'
  ctx.fillRect(0, 0, width, height)

  const random = mulberry(53)
  // Mottled aggregate: many soft blobs at different scales and shades.
  for (let i = 0; i < 900; i++) {
    const x = random() * width
    const y = random() * height
    const radius = 3 + random() * 34
    const shade = Math.floor((random() - 0.5) * 54)
    const alpha = 0.08 + random() * 0.3
    ctx.fillStyle = `rgba(${130 + shade}, ${122 + shade}, ${108 + shade}, ${alpha})`
    ctx.beginPath()
    ctx.ellipse(x, y, radius, radius * (0.6 + random() * 0.7), random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // Aggregate stones with a little specular edge.
  for (let i = 0; i < 260; i++) {
    const x = random() * width
    const y = random() * height
    const radius = 1.4 + random() * 4.6
    const shade = 60 + Math.floor(random() * 90)
    ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 14})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.arc(x - 0.6, y - 0.6, radius, Math.PI * 1.1, Math.PI * 1.7)
    ctx.stroke()
  }

  // Hairline cracks.
  ctx.strokeStyle = 'rgba(38, 34, 30, 0.55)'
  for (let i = 0; i < 22; i++) {
    let x = random() * width
    let y = random() * height
    ctx.lineWidth = 0.6 + random() * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let step = 0; step < 9; step++) {
      x += (random() - 0.5) * 42
      y += (random() - 0.35) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Paint splash and a chalk mark: high-contrast, corner-rich detail.
  ctx.fillStyle = 'rgba(178, 58, 58, 0.85)'
  ctx.beginPath()
  ctx.ellipse(660, 300, 46, 30, 0.4, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 26; i++) {
    const angle = random() * Math.PI * 2
    const dist = 30 + random() * 46
    ctx.beginPath()
    ctx.arc(660 + Math.cos(angle) * dist, 300 + Math.sin(angle) * dist * 0.7, 1 + random() * 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(232, 226, 210, 0.8)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(180, 470)
  ctx.lineTo(240, 420)
  ctx.lineTo(300, 452)
  ctx.lineTo(360, 392)
  ctx.stroke()

  // Fixings: bolts with strong cross-shaped corners.
  for (const [cx, cy, radius] of [
    [420, 520, 15],
    [780, 130, 12],
    [300, 180, 10],
  ]) {
    ctx.fillStyle = '#8d8779'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4e4a42'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - radius * 0.62, cy)
    ctx.lineTo(cx + radius * 0.62, cy)
    ctx.moveTo(cx, cy - radius * 0.62)
    ctx.lineTo(cx, cy + radius * 0.62)
    ctx.stroke()
  }

  const vignette = ctx.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 620)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  addGrain(ctx, width, height, 30, 5)
}

function drawReceipt(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#f4f1e9'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(90, 40, 720, 520)
  ctx.strokeStyle = '#d9d4c7'
  ctx.lineWidth = 2
  ctx.strokeRect(90, 40, 720, 520)

  ctx.fillStyle = '#22252b'
  ctx.font = 'bold 30px "Helvetica Neue", Arial, sans-serif'
  ctx.fillText('NORTHGATE HARDWARE', 130, 110)
  ctx.font = '15px "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#6a6f78'
  ctx.fillText('128 Harbour Road · Invoice 0042', 130, 140)

  ctx.strokeStyle = '#c8c2b3'
  ctx.beginPath()
  ctx.moveTo(130, 165)
  ctx.lineTo(770, 165)
  ctx.stroke()

  ctx.fillStyle = '#3a3f47'
  ctx.font = '16px "Courier New", monospace'
  const rows = [
    'Paint, 5L            $ 48.00',
    'Brushes, set         $ 22.50',
    'Sanding discs        $ 9.00',
    'Delivery             $ 12.00',
  ]
  rows.forEach((row, index) => ctx.fillText(row, 140, 215 + index * 34))

  ctx.fillStyle = '#1b1e23'
  ctx.font = 'bold 22px "Courier New", monospace'
  ctx.fillText('TOTAL                $ 91.50', 140, 380)

  const stamp = createCanvas(250, 130)
  const stampCtx = get2d(stamp)
  stampCtx.strokeStyle = '#b23a3a'
  stampCtx.lineWidth = 6
  stampCtx.beginPath()
  stampCtx.ellipse(125, 65, 110, 52, -0.14, 0, Math.PI * 2)
  stampCtx.stroke()
  stampCtx.fillStyle = '#b23a3a'
  stampCtx.font = 'bold 30px "Courier New", monospace'
  stampCtx.fillText('PAID', 88, 76)
  addGrain(stampCtx, stamp.width, stamp.height, 46, 11)

  ctx.drawImage(stamp, 470, 380)
  addGrain(ctx, width, height, 16, 3)
}

export async function buildSample(kind: SampleKind): Promise<File> {
  const width = 900
  const height = 600
  const canvas = createCanvas(width, height)
  const ctx = get2d(canvas)

  if (kind === 'doc-splice') drawReceipt(ctx, width, height)
  else drawConcrete(ctx, width, height)

  if (kind === 'photo-clone') {
    // Duplicate a textured crop, grain included, to another part of the scene.
    const source = ctx.getImageData(588, 224, 190, 152)
    ctx.putImageData(source, 182, 330)
  }
  if (kind === 'doc-splice') {
    const source = ctx.getImageData(470, 380, 250, 130)
    ctx.putImageData(source, 150, 380)
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.93),
  )
  if (!blob) throw new Error('Could not build the sample image')
  const sample = SAMPLES.find((entry) => entry.kind === kind)
  return new File([blob], sample?.name ?? 'sample.jpg', { type: 'image/jpeg' })
}
