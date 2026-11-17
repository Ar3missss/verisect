import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Cpu, Lock, ShieldQuestion, TriangleAlert } from 'lucide-react'
import { analyzeFile } from '../lib/forensics/analyze'
import type { AnalysisResult, Progress, Stage } from '../lib/forensics/types'
import { deleteScan, saveScan } from '../lib/store'
import { useSession } from '../lib/session'
import { formatBytes } from '../lib/format'
import { AnalysisReport } from '../components/AnalysisReport'
import { Dropzone } from '../components/Dropzone'
import { Badge, ButtonLink, Spinner } from '../components/ui'

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'decoding', label: 'Decode raster' },
  { id: 'metadata', label: 'Audit metadata' },
  { id: 'ela', label: 'Error-level analysis' },
  { id: 'noise', label: 'Sensor noise map' },
  { id: 'copy-move', label: 'Copy-move matching' },
  { id: 'compression', label: 'Compression grid' },
  { id: 'fusion', label: 'Fuse and score' },
]

export default function AnalyzePage() {
  const { user, plan, remaining, refresh } = useSession()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const scansLeft = remaining
  const exhausted = scansLeft <= 0

  const run = async (file: File) => {
    if (busy) return
    if (exhausted) {
      setError(
        `You have used all ${plan.scans} scans on the ${plan.name} plan this month. Upgrade to keep analysing.`,
      )
      return
    }
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const analysis = await analyzeFile(file, setProgress)
      saveScan(analysis, user?.id)
      setResult(analysis)
      refresh()
      requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The analysis failed unexpectedly.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono-label text-mist-500">Workspace / analyzer</span>
            <Badge className="bg-signal/10 text-signal ring-signal/25">local engine</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            What did this image really go through?
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-mist-400">
            Five forensic checks run on your device. Nothing is uploaded, stored or logged — the
            report exists only in this browser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="panel px-4 py-3">
            <p className="mono-label text-[9.5px]">Scans left</p>
            <p className="mt-1 font-mono text-lg text-mist-100">
              {scansLeft}
              <span className="ml-1 text-[11px] text-mist-500">/ {plan.scans}</span>
            </p>
          </div>
          <div className="panel px-4 py-3">
            <p className="mono-label text-[9.5px]">Plan</p>
            <p className="mt-1 font-mono text-lg capitalize text-mist-100">{user?.plan ?? 'guest'}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-5">
          {busy || progress ? (
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Spinner />
                  <p className="text-[13px] text-mist-100">
                    {progress?.label ?? 'Preparing analysis'}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-signal">{progress?.pct ?? 0}%</span>
              </div>
              <div className="h-1 w-full bg-white/6">
                <div
                  className="h-full bg-signal transition-[width] duration-300"
                  style={{ width: `${progress?.pct ?? 0}%` }}
                />
              </div>
              <div className="grid gap-2 p-5 sm:grid-cols-2">
                {STAGES.map((stage) => {
                  const reached = (progress?.pct ?? 0) >= stagePercent(stage.id)
                  const active = progress?.stage === stage.id
                  return (
                    <div
                      key={stage.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                        active
                          ? 'border-signal/30 bg-signal/[0.06] text-mist-100'
                          : reached
                            ? 'border-white/6 text-mist-300'
                            : 'border-transparent text-mist-500'
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full border ${
                          reached ? 'border-signal/40 bg-signal/15' : 'border-white/12'
                        }`}
                      >
                        {reached ? <Check className="h-2.5 w-2.5 text-signal" /> : null}
                      </span>
                      {stage.label}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : result ? (
            <div ref={reportRef} className="space-y-5">
              {!user && (
                <div className="panel flex flex-wrap items-center justify-between gap-3 border-signal/20 bg-signal/[0.04] px-4 py-3">
                  <p className="text-[12.5px] text-mist-200">
                    This report is saved to this browser only. Create an account to keep a
                    dashboard history.
                  </p>
                  <Link to="/auth" className="text-[12.5px] font-medium text-signal hover:underline">
                    Create account <ArrowRight className="inline h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              <AnalysisReport
                result={result}
                onDelete={() => {
                  deleteScan(result.id, user?.id)
                  setResult(null)
                  refresh()
                }}
                onNewScan={() => {
                  setResult(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </div>
          ) : (
            <>
              <Dropzone onFile={run} busy={busy} onError={setError} />
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.07] p-4">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                  <div className="flex-1">
                    <p className="text-[13px] text-rose-200">{error}</p>
                    {exhausted && (
                      <ButtonLink to="/pricing" size="sm" variant="outline" className="mt-3">
                        See plans
                      </ButtonLink>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-[11px] text-rose-300/70 hover:text-rose-200"
                  >
                    dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-signal" />
              <p className="mono-label text-mist-300">What gets checked</p>
            </div>
            <ul className="mt-4 space-y-3.5">
              {[
                ['Error level analysis', 'Recompression residuals reveal a second JPEG history.', 'w 26'],
                ['Copy-move detection', 'Duplicate texture clusters at a fixed offset.', 'w 26'],
                ['Sensor noise', 'Grain that does not match its neighbours.', 'w 22'],
                ['Metadata provenance', 'Editors, AI tools and stripped EXIF.', 'w 20'],
                ['Compression grid', 'Uneven 8×8 block artefacts across the frame.', 'w 8'],
              ].map(([title, copy, weight]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mist-500" />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[12.5px] font-medium text-mist-100">{title}</p>
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                        {weight}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist-500">{copy}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-mist-400" />
              <p className="mono-label text-mist-300">Privacy model</p>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              Decoding, analysis and report rendering happen inside this tab. No image bytes leave
              the page — open DevTools → Network and you will see no upload request.
            </p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-mist-400" />
              <p className="mono-label text-mist-300">Limits worth knowing</p>
            </div>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-mist-500">
              <li>· Lossless PNGs skip error-level analysis.</li>
              <li>· Signal chains re-compress wildly; expect flatter evidence.</li>
              <li>· Heavier manipulation (generative fills) may leave almost no pixel trace.</li>
              <li>· No tool can prove authenticity from a single frame.</li>
            </ul>
          </div>
        </aside>
      </div>

      {result && (
        <p className="mt-6 text-center text-[11.5px] text-mist-600">
          Report generated locally · {formatBytes(result.fileSize)} · {result.processingMs} ms
        </p>
      )}
    </div>
  )
}

function stagePercent(stage: Stage): number {
  switch (stage) {
    case 'decoding':
      return 6
    case 'metadata':
      return 16
    case 'ela':
      return 28
    case 'noise':
      return 46
    case 'copy-move':
      return 62
    case 'compression':
      return 76
    case 'fusion':
      return 88
    default:
      return 0
  }
}
