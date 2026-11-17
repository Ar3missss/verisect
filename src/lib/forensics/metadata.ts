import type { Finding } from './types'
import type { DecodedImage } from './decode'
import { clamp } from './utils'

export interface MetadataOutput {
  entries: Record<string, string>
  findings: Finding[]
  score: number
  detail: string
  summary: string
  caveats: string[]
}

const EDITOR_HINTS: Array<{ name: string; test: RegExp }> = [
  { name: 'Adobe Photoshop', test: /adobe photoshop|photoshop/i },
  { name: 'Adobe Lightroom', test: /lightroom/i },
  { name: 'GIMP', test: /gimp/i },
  { name: 'Affinity Photo', test: /affinity photo/i },
  { name: 'Pixelmator', test: /pixelmator/i },
  { name: 'Snapseed', test: /snapseed/i },
  { name: 'Picsart', test: /picsart/i },
  { name: 'Canva', test: /canva/i },
  { name: 'Facetune', test: /facetune/i },
  { name: 'Paint.NET', test: /paint\.net/i },
  { name: 'Capture One', test: /capture one/i },
  { name: 'darktable', test: /darktable/i },
]

const AI_HINTS: Array<{ name: string; test: RegExp }> = [
  { name: 'Midjourney', test: /midjourney/i },
  { name: 'Stable Diffusion', test: /stable diffusion|comfyui|automatic1111/i },
  { name: 'Adobe Firefly', test: /adobe firefly|generative fill/i },
  { name: 'DALL·E', test: /dall[-· ]?e/i },
  { name: 'FLUX', test: /flux\.1/i },
  { name: 'Leonardo AI', test: /leonardo\.ai/i },
]

const TAG_NAMES: Record<number, string> = {
  0x010e: 'ImageDescription',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011a: 'XResolution',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x8298: 'Copyright',
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8827: 'ISO',
  0x9003: 'DateTimeOriginal',
  0x920a: 'FocalLength',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = ''
  for (let i = 0; i < length && start + i < bytes.length; i++) {
    const code = bytes[start + i]
    if (code === 0) break
    out += String.fromCharCode(code)
  }
  return out.replace(/[^\x20-\x7e]/g, '').trim()
}

function parseIfd(
  bytes: Uint8Array,
  view: DataView,
  tiffStart: number,
  dirOffset: number,
  out: Record<string, string>,
  depth = 0,
): void {
  if (depth > 2) return
  const dir = tiffStart + dirOffset
  if (dir + 2 > bytes.length) return
  const count = view.getUint16(dir, true)
  if (count > 512) return

  for (let i = 0; i < count; i++) {
    const entry = dir + 2 + i * 12
    if (entry + 12 > bytes.length) return
    const tag = view.getUint16(entry, true)
    const type = view.getUint16(entry + 2, true)
    const length = view.getUint32(entry + 4, true)
    const valueField = entry + 8

    if (tag === 0x8769 || tag === 0x8825) {
      const pointer = view.getUint32(valueField, true)
      if (pointer > 0) parseIfd(bytes, view, tiffStart, pointer, out, depth + 1)
      continue
    }

    const name = TAG_NAMES[tag]
    if (!name) continue
    const typeSize = type === 1 ? 1 : type === 2 ? 1 : type === 3 ? 2 : 4
    const byteLength = typeSize * length
    const valueOffset = byteLength <= 4 ? valueField : tiffStart + view.getUint32(valueField, true)
    if (valueOffset < 0 || valueOffset >= bytes.length) continue

    if (type === 2) {
      const text = ascii(bytes, valueOffset, length)
      if (text) out[name] = text
    } else if (type === 3) {
      out[name] = String(view.getUint16(valueOffset, true))
    } else if (type === 4) {
      out[name] = String(view.getUint32(valueOffset, true))
    }
  }
}

function parseJpeg(bytes: Uint8Array, view: DataView, entries: Record<string, string>) {
  let offset = 2
  let hasExif = false
  let hasXmp = false
  let hasPhotoshop = false
  let exifDims: string | undefined

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = bytes[offset + 1]
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) break

    const length = view.getUint16(offset + 2, false)
    if (length < 2) break
    const start = offset + 4
    const end = Math.min(offset + 2 + length, bytes.length)

    if (marker === 0xe1 && start + 6 <= bytes.length) {
      const sig = ascii(bytes, start, Math.min(32, end - start))
      if (sig.startsWith('Exif')) {
        hasExif = true
        const tiffStart = start + 6
        if (tiffStart + 8 < bytes.length) {
          const byteOrder = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49
          const little = byteOrder
          const read16 = (o: number) => (little ? view.getUint16(o, true) : view.getUint16(o, false))
          const read32 = (o: number) => (little ? view.getUint32(o, true) : view.getUint32(o, false))
          if (read16(tiffStart + 2) === 42) {
            const first = read32(tiffStart + 4)
            if (little) parseIfd(bytes, view, tiffStart, first, entries)
            else {
              // Big-endian TIFF: parse with a byte-swapped DataView view.
              const swapped = new DataView(view.buffer, view.byteOffset, view.byteLength)
              parseIfdBE(bytes, swapped, tiffStart, first, entries)
            }
          }
        }
      } else if (sig.includes('ns.adobe.com/xap')) {
        hasXmp = true
      }
    }

    if (marker === 0xed) {
      const sig = ascii(bytes, start, Math.min(16, end - start))
      if (sig.includes('Photoshop')) hasPhotoshop = true
    }

    if (marker === 0xfe) {
      const comment = ascii(bytes, start, Math.min(end - start, 160))
      if (comment) entries.Comment = comment
    }

    offset = offset + 2 + length
  }

  if (hasExif) entries.Exif = 'Present'
  if (hasXmp) entries.XMP = 'Present'
  if (hasPhotoshop) entries.PhotoshopResources = 'Present'
  const px = entries.PixelXDimension
  const py = entries.PixelYDimension
  if (px && py) exifDims = `${px}×${py}`
  if (exifDims) entries.ExifDimensions = exifDims
  return { hasExif, hasXmp, hasPhotoshop }
}

function parseIfdBE(
  bytes: Uint8Array,
  view: DataView,
  tiffStart: number,
  dirOffset: number,
  out: Record<string, string>,
  depth = 0,
): void {
  if (depth > 2) return
  const dir = tiffStart + dirOffset
  if (dir + 2 > bytes.length) return
  const count = view.getUint16(dir, false)
  if (count > 512) return
  for (let i = 0; i < count; i++) {
    const entry = dir + 2 + i * 12
    if (entry + 12 > bytes.length) return
    const tag = view.getUint16(entry, false)
    const type = view.getUint16(entry + 2, false)
    const length = view.getUint32(entry + 4, false)
    const valueField = entry + 8
    if (tag === 0x8769 || tag === 0x8825) {
      const pointer = view.getUint32(valueField, false)
      if (pointer > 0) parseIfdBE(bytes, view, tiffStart, pointer, out, depth + 1)
      continue
    }
    const name = TAG_NAMES[tag]
    if (!name) continue
    const typeSize = type === 1 || type === 2 ? 1 : type === 3 ? 2 : 4
    const byteLength = typeSize * length
    const valueOffset =
      byteLength <= 4 ? valueField : tiffStart + view.getUint32(valueField, false)
    if (valueOffset < 0 || valueOffset >= bytes.length) continue
    if (type === 2) {
      const text = ascii(bytes, valueOffset, length)
      if (text) out[name] = text
    } else if (type === 3) out[name] = String(view.getUint16(valueOffset, false))
    else if (type === 4) out[name] = String(view.getUint32(valueOffset, false))
  }
}

function parsePng(bytes: Uint8Array, view: DataView, entries: Record<string, string>) {
  let offset = 8
  let hasText = false
  let textSoftware: string | undefined

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false)
    if (length > bytes.length) break
    const type = ascii(bytes, offset + 4, 4)
    const dataStart = offset + 8
    if (dataStart + length > bytes.length) break

    if (type === 'tEXt') {
      const raw = ascii(bytes, dataStart, length)
      const [key, ...rest] = raw.split('\u0000')
      const value = rest.join(' ').trim()
      if (key && value) {
        entries[`PNG ${key}`] = value.slice(0, 120)
        hasText = true
        if (/software|creator/i.test(key) || /adobe|gimp|photoshop/i.test(value)) {
          textSoftware = value
        }
      }
    } else if (type === 'iTXt') {
      const raw = ascii(bytes, dataStart, length)
      if (/adobe|photoshop|gimp|generated|midjourney|stable diffusion/i.test(raw)) {
        entries.PNGText = raw.replace(/\u0000/g, ' ').slice(0, 160)
        hasText = true
        textSoftware = raw
      }
    } else if (type === 'eXIf') {
      const tiffStart = dataStart
      if (tiffStart + 8 < bytes.length) {
        const little = bytes[tiffStart] === 0x49
        const read16 = (o: number) => (little ? view.getUint16(o, true) : view.getUint16(o, false))
        const read32 = (o: number) => (little ? view.getUint32(o, true) : view.getUint32(o, false))
        if (read16(tiffStart + 2) === 42) {
          const first = read32(tiffStart + 4)
          if (little) parseIfd(bytes, view, tiffStart, first, entries)
          else parseIfdBE(bytes, view, tiffStart, first, entries)
        }
      }
    } else if (type === 'tIME') {
      entries['PNG Modified'] = `${view.getUint16(dataStart, false)}-${view.getUint8(dataStart + 2)}-${view.getUint8(dataStart + 3)} ${view.getUint8(dataStart + 4)}:${view.getUint8(dataStart + 5)}`
    }

    if (type === 'IEND') break
    offset = dataStart + length + 4
  }

  if (hasText) entries.PNGTextPresent = 'Present'
  return { hasText, textSoftware }
}

export function runMetadata(decoded: DecodedImage): MetadataOutput {
  const entries: Record<string, string> = {}
  const findings: Finding[] = []
  const caveats: string[] = []
  let score = 0

  entries.Format = decoded.format.toUpperCase()
  entries.Dimensions = `${decoded.originalWidth}×${decoded.originalHeight}`

  try {
    const view = new DataView(decoded.bytes.buffer, decoded.bytes.byteOffset, decoded.bytes.byteLength)
    if (decoded.format === 'jpeg') {
      const result = parseJpeg(decoded.bytes, view, entries)
      if (!result.hasExif && !result.hasXmp) {
        score += 14
        findings.push({
          label: 'No EXIF or XMP block',
          detail: 'The file carries no camera provenance. Common after messaging apps and social platforms strip metadata — or after an export from an editor.',
          severity: 'low',
        })
        caveats.push('Missing metadata is normal for images that travelled through social platforms.')
      }
      if (result.hasXmp) {
        score += 10
        findings.push({
          label: 'XMP packet present',
          detail: 'An XMP sidecar-style packet can carry editor history and generative-fill markers.',
          severity: 'info',
        })
      }
      if (result.hasPhotoshop) {
        score += 32
        findings.push({
          label: 'Photoshop image resources found',
          detail: 'The APP13 segment was written by Adobe Photoshop, so the file passed through an image editor after capture.',
          severity: 'high',
        })
      }
    } else if (decoded.format === 'png') {
      parsePng(decoded.bytes, view, entries)
      findings.push({
        label: 'Lossless container',
        detail: 'PNG carries no JPEG compression history, so error-level analysis is skipped and the verdict leans on noise and copy-move signals.',
        severity: 'info',
      })
      caveats.push('Lossless (PNG/WebP) uploads cannot be scored with error-level analysis.')
    }
  } catch {
    findings.push({
      label: 'Metadata could not be parsed',
      detail: 'The container was malformed beyond the point where provenance tags could be read.',
      severity: 'info',
    })
  }

  const haystack = Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join(' | ')

  const editors = EDITOR_HINTS.filter((hint) => hint.test.test(haystack))
  if (editors.length) {
    score += 46
    findings.push({
      label: 'Editing software signature',
      detail: `Metadata names an editor (${editors.map((e) => e.name).join(', ')}). An editor alone is not forgery — crops and colour grades are normal — but it confirms a post-capture pipeline.`,
      severity: 'high',
    })
  }

  const aiTools = AI_HINTS.filter((hint) => hint.test.test(haystack))
  if (aiTools.length) {
    score += 58
    findings.push({
      label: 'Generative model signature',
      detail: `A generative tool appears in the metadata (${aiTools.map((e) => e.name).join(', ')}). Treat the frame as synthesised or heavily regenerated content.`,
      severity: 'high',
    })
  }

  if (entries.Make || entries.Model) {
    score = Math.max(0, score - 12)
    findings.push({
      label: 'Camera provenance present',
      detail: `${[entries.Make, entries.Model].filter(Boolean).join(' ')} — capture device recorded in EXIF. Tags are forgeable, so this only lowers suspicion.`,
      severity: 'info',
    })
  }

  if (entries.Software) {
    findings.push({
      label: 'Software tag',
      detail: `"${entries.Software}" is recorded as the writing application.`,
      severity: 'medium',
    })
  }

  const captured = entries.DateTimeOriginal || entries.DateTime
  if (captured) {
    findings.push({
      label: 'Timestamp',
      detail: `${entries.DateTimeOriginal ? 'Captured' : 'Written'} ${captured}.`,
      severity: 'info',
    })
  }

  caveats.push('Metadata is trivially stripped or forged and is treated as corroboration, never proof.')

  const finalScore = clamp(score)
  return {
    entries,
    findings,
    score: finalScore,
    detail: `Container tags read directly from the upload (${Object.keys(entries).length} fields). Nothing is sent to a server.`,
    summary:
      finalScore >= 55
        ? 'Provenance tags point to post-processing or synthesis.'
        : finalScore >= 20
          ? 'Some provenance gaps, but nothing conclusive.'
          : 'Metadata is consistent with an untouched original.',
    caveats,
  }
}
