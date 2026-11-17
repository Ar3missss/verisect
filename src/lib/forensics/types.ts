export type SignalId = 'ela' | 'noise' | 'copy-move' | 'metadata' | 'compression'

export type Verdict = 'authentic' | 'suspect' | 'tampered'

export type Severity = 'info' | 'low' | 'medium' | 'high'

export interface Finding {
  label: string
  detail: string
  severity: Severity
}

export interface SignalResult {
  id: SignalId
  label: string
  /** 0 = nothing suspicious, 100 = strongly suspicious */
  score: number
  /** Relative contribution to the fused verdict */
  weight: number
  summary: string
  detail: string
  findings: Finding[]
  /** Set when the signal could not be evaluated for this file */
  unavailable?: string
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
  score: number
  source: 'ela' | 'noise' | 'copy-move'
}

export interface Heatmap {
  id: 'ela' | 'noise' | 'suspicion'
  label: string
  caption: string
  dataUrl: string
}

export interface AnalysisResult {
  id: string
  fileName: string
  fileSize: number
  format: string
  width: number
  height: number
  /** Dimensions of the raster actually analysed (longest edge ≤ 1100). */
  analysisWidth: number
  analysisHeight: number
  score: number
  verdict: Verdict
  confidence: number
  signals: SignalResult[]
  heatmaps: Heatmap[]
  boxes: Box[]
  metadata: Record<string, string>
  caveats: string[]
  createdAt: number
  processingMs: number
  thumb: string
  /** Normalised coordinates for boxes are relative to the analysed raster. */
  previewUrl: string
}

export type Stage =
  | 'decoding'
  | 'metadata'
  | 'ela'
  | 'noise'
  | 'copy-move'
  | 'compression'
  | 'fusion'

export interface Progress {
  stage: Stage
  pct: number
  label: string
}
