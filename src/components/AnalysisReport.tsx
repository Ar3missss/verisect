import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  Info,
  Printer,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import type { AnalysisResult, Finding, Severity, SignalResult } from '../lib/forensics/types'
import { formatBytes, fullDate, verdictMeta } from '../lib/format'
import { Badge, Button } from './ui'
import { HeatmapViewer } from './HeatmapViewer'
import { ScoreBar, ScoreDial } from './ScoreDial'

const severityTone: Record<Severity, string> = {
  high: 'bg-rose-400/10 text-rose-300 ring-rose-400/25',
  medium: 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
  low: 'bg-sky-400/10 text-sky-300 ring-sky-400/25',
  info: 'bg-white/6 text-mist-300 ring-white/12',
}

export function reportJson(result: AnalysisResult) {
  return {
    report: {
      id: result.id,
      generatedAt: new Date(result.createdAt).toISOString(),
      engine: 'verisect-forensics/1.0',
      file: {
        name: result.fileName,
        bytes: result.fileSize,
        format: result.format,
        dimensions: { width: result.width, height: result.height },
      },
      verdict: {
        label: result.verdict,
        tamperScore: result.score,
        confidence: result.confidence,
      },
      processingMs: result.processingMs,
      signals: result.signals.map((signal) => ({
        id: signal.id,
        label: signal.label,
        score: signal.score,
        weight: signal.weight,
        summary: signal.unavailable ? 'unavailable' : signal.summary,
        unavailable: signal.unavailable ?? null,
        findings: signal.findings,
      })),
      regions: result.boxes.map((box) => ({
        source: box.source,
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.w),
        height: Math.round(box.h),
        score: Math.round(box.score),
      })),
      metadata: result.metadata,
      caveats: result.caveats,
    },
  }
}

function summaryText(result: AnalysisResult) {
  const meta = verdictMeta[result.verdict]
  return [
    `Verisect report · ${result.fileName}`,
    `${meta.label} — tamper score ${result.score}/100 (confidence ${result.confidence}%)`,
    `Signals: ${result.signals.map((s) => `${s.label} ${s.unavailable ? 'n/a' : s.score}`).join(' · ')}`,
    `Generated ${fullDate(result.createdAt)}`,
  ].join('\n')
}

function SignalRow({ signal }: { signal: SignalResult }) {
  const [open, setOpen] = useState(false)
  const unavailable = Boolean(signal.unavailable)

  return (
    <div className="border-b border-white/6 last:border-none">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-mist-100">{signal.label}</span>
            <span
              className={`shrink-0 font-mono text-[12px] ${
                unavailable
                  ? 'text-mist-500'
                  : signal.score >= 60
                    ? 'text-rose-300'
                    : signal.score >= 30
                      ? 'text-amber-300'
                      : 'text-emerald-300'
              }`}
            >
              {unavailable ? 'n/a' : signal.score}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full ${
                  unavailable
                    ? 'bg-white/15'
                    : signal.score >= 60
                      ? 'bg-rose-400'
                      : signal.score >= 30
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                }`}
                style={{ width: `${unavailable ? 4 : Math.max(3, signal.score)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[10px] uppercase tracking-wider text-mist-500">
              w {signal.weight}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mist-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-[12.5px] leading-relaxed text-mist-400">
            {unavailable ? signal.unavailable : signal.detail}
          </p>
          {signal.findings.length > 0 && (
            <ul className="space-y-2">
              {signal.findings.map((finding: Finding, index) => (
                <li key={index} className="rounded-lg border border-white/6 bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={severityTone[finding.severity]}>{finding.severity}</Badge>
                    <span className="text-[12.5px] font-medium text-mist-200">{finding.label}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-mist-400">{finding.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function AnalysisReport({
  result,
  onDelete,
  onNewScan,
}: {
  result: AnalysisResult
  onDelete?: () => void
  onNewScan?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const meta = verdictMeta[result.verdict]

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(result))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(reportJson(result), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `verisect-${result.fileName.replace(/\.[^.]+$/, '')}-${result.id.slice(0, 8)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="panel relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-signal/6 blur-3xl" />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <ScoreDial score={result.score} verdict={result.verdict} />
            <div>
              <Badge className={meta.chip}>{meta.label}</Badge>
              <h2 className="mt-3 max-w-56 font-display text-xl leading-snug text-mist-50">
                {result.score >= 60
                  ? 'Content was likely synthesised or spliced.'
                  : result.score >= 28
                    ? 'Some signals disagree — review the marked regions.'
                    : 'No manipulation evidence found.'}
              </h2>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-white/8 sm:grid-cols-4 lg:border-x lg:px-6">
            {[
              { label: 'Confidence', value: `${result.confidence}%` },
              { label: 'Processing', value: `${result.processingMs} ms` },
              { label: 'Resolution', value: `${result.width}×${result.height}` },
              { label: 'Size', value: formatBytes(result.fileSize) },
            ].map((item) => (
              <div key={item.label}>
                <dt className="mono-label text-[9.5px]">{item.label}</dt>
                <dd className="mt-1 font-mono text-[13px] text-mist-100">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="no-print flex flex-col gap-2">
            <Button size="sm" variant="subtle" onClick={download}>
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
            <Button size="sm" variant="subtle" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={copySummary}>
              {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy summary'}
            </Button>
            {onNewScan && (
              <Button size="sm" variant="ghost" onClick={onNewScan}>
                New scan
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-rose-300/80 hover:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/8 bg-white/[0.015] px-5 py-3 sm:px-6">
          <span className="truncate font-mono text-[11px] text-mist-400">{result.fileName}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-widest text-mist-500">
            {result.format}
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-widest text-mist-500">
            {fullDate(result.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <HeatmapViewer result={result} />

        <div className="panel flex flex-col">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <p className="mono-label text-mist-300">Signal breakdown</p>
            <span className="font-mono text-[10.5px] text-mist-500">
              {result.signals.filter((s) => !s.unavailable).length}/{result.signals.length} active
            </span>
          </div>
          <div className="flex-1">
            {result.signals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </div>
          <div className="border-t border-white/8 p-4">
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.03] p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-400" />
              <p className="text-[11.5px] leading-relaxed text-mist-400">
                Scores are a weighted fusion of independent signals. Confidence reflects how much
                the signals agree, not certainty about intent.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <ShieldAlert className="h-4 w-4 text-mist-400" />
            <p className="mono-label text-mist-300">Container metadata</p>
          </div>
          <div className="max-h-72 overflow-auto">
            {Object.keys(result.metadata).length === 0 ? (
              <p className="px-4 py-6 text-[12.5px] text-mist-500">
                No parseable metadata in this container.
              </p>
            ) : (
              <table className="w-full border-collapse text-left">
                <tbody>
                  {Object.entries(result.metadata).map(([key, value]) => (
                    <tr key={key} className="border-b border-white/5 last:border-none">
                      <th className="w-2/5 px-4 py-2 align-top font-mono text-[10.5px] font-normal uppercase tracking-wider text-mist-500">
                        {key}
                      </th>
                      <td className="break-words px-4 py-2 text-[12px] text-mist-200">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-300/80" />
            <p className="mono-label text-mist-300">Read before you cite this</p>
          </div>
          <ul className="space-y-3 p-4">
            {result.caveats.map((caveat, index) => (
              <li key={index} className="flex gap-2.5 text-[12.5px] leading-relaxed text-mist-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mist-500" />
                {caveat}
              </li>
            ))}
            <li className="flex gap-2.5 text-[12.5px] leading-relaxed text-mist-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mist-500" />
              Interpreting the score: 0–27 low suspicion · 28–59 needs review · 60–100 strong
              evidence of manipulation.
            </li>
          </ul>
          <div className="border-t border-white/8 p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Low', range: '0–27', tone: 'bg-emerald-400' },
                { label: 'Review', range: '28–59', tone: 'bg-amber-400' },
                { label: 'High', range: '60–100', tone: 'bg-rose-400' },
              ].map((band) => (
                <div key={band.label} className="rounded-lg border border-white/6 p-2.5">
                  <div className={`h-1 w-full rounded-full ${band.tone}`} />
                  <p className="mt-2 text-[11px] text-mist-300">{band.label}</p>
                  <p className="font-mono text-[10px] text-mist-500">{band.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-mist-500">
            Engine: verisect-forensics/1.0 · client-side · {result.signals.length} signals fused
          </p>
          <div className="w-32 shrink-0">
            <ScoreBar score={result.score} verdict={result.verdict} />
          </div>
        </div>
      </div>
    </div>
  )
}
