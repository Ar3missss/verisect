import { useState } from 'react'
import { Eye, EyeOff, Layers } from 'lucide-react'
import type { AnalysisResult } from '../lib/forensics/types'

const boxTone = {
  ela: 'border-rose-400/80',
  noise: 'border-sky-400/80',
  'copy-move': 'border-amber-300/90',
} as const

export function HeatmapViewer({ result, height = 420 }: { result: AnalysisResult; height?: number }) {
  const [active, setActive] = useState<string>(result.heatmaps[0]?.id ?? 'suspicion')
  const [overlay, setOverlay] = useState(true)
  const [markers, setMarkers] = useState(true)
  const [opacity, setOpacity] = useState(0.72)

  const heat = result.heatmaps.find((entry) => entry.id === active) ?? result.heatmaps[0]
  const scaleX = 100 / Math.max(result.analysisWidth, 1)
  const scaleY = 100 / Math.max(result.analysisHeight, 1)

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {result.heatmaps.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActive(entry.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                active === entry.id
                  ? 'bg-signal/15 text-signal ring-1 ring-signal/30'
                  : 'text-mist-400 hover:bg-white/5 hover:text-mist-100'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMarkers((value) => !value)}
            className={`inline-flex items-center gap-1.5 text-[11.5px] ${markers ? 'text-mist-200' : 'text-mist-500'}`}
            aria-pressed={markers}
          >
            {markers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Regions
          </button>
          <button
            type="button"
            onClick={() => setOverlay((value) => !value)}
            className={`inline-flex items-center gap-1.5 text-[11.5px] ${overlay ? 'text-mist-200' : 'text-mist-500'}`}
            aria-pressed={overlay}
          >
            <Layers className="h-3.5 w-3.5" />
            {overlay ? 'Blend' : 'Heat only'}
          </button>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden bg-ink-950"
        style={{ height, aspectRatio: undefined }}
      >
        {overlay ? (
          <img
            src={result.previewUrl}
            alt={`Analysed frame from ${result.fileName}`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null}
        {heat && (
          <img
            src={heat.dataUrl}
            alt={`${heat.label} heatmap`}
            className="absolute inset-0 h-full w-full object-contain mix-blend-screen"
            style={{ opacity: overlay ? opacity : 1 }}
          />
        )}
        {markers &&
          result.boxes.map((box, index) => (
            <div
              key={`${box.source}-${index}`}
              className={`absolute rounded-[3px] border ${boxTone[box.source]} ${
                box.source === 'copy-move' ? 'border-dashed' : ''
              }`}
              style={{
                left: `${box.x * scaleX}%`,
                top: `${box.y * scaleY}%`,
                width: `${Math.max(box.w * scaleX, 0.8)}%`,
                height: `${Math.max(box.h * scaleY, 0.8)}%`,
                boxShadow: '0 0 18px -4px rgba(255,255,255,0.25) inset',
              }}
              title={`${box.source} · ${Math.round(box.score)}/100`}
            />
          ))}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-950/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-950/85 to-transparent p-3">
          <p className="max-w-md text-[11.5px] leading-snug text-mist-300">
            {heat?.caption ?? 'Combined suspicion map'}
          </p>
          <span className="rounded-full border border-white/12 bg-ink-950/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-mist-400">
            {result.width}×{result.height}
          </span>
        </div>
      </div>

      {overlay && (
        <div className="flex items-center gap-3 border-t border-white/8 px-4 py-2.5">
          <span className="mono-label shrink-0 text-[9.5px]">Heat opacity</span>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(event) => setOpacity(Number(event.target.value) / 100)}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#b8f26b]"
            aria-label="Heatmap opacity"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[10.5px] text-mist-400">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}
