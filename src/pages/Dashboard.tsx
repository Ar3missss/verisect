import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Clock,
  Download,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import type { AnalysisResult, Verdict } from '../lib/forensics/types'
import { deleteScan, getHistory } from '../lib/store'
import { useSession } from '../lib/session'
import { formatBytes, relativeTime, verdictMeta } from '../lib/format'
import { AnalysisReport, reportJson } from '../components/AnalysisReport'
import { Badge, Button, ButtonLink } from '../components/ui'

const filters: Array<{ id: Verdict | 'all'; label: string }> = [
  { id: 'all', label: 'All reports' },
  { id: 'tampered', label: 'Manipulated' },
  { id: 'suspect', label: 'Review' },
  { id: 'authentic', label: 'Clean' },
]

export default function DashboardPage() {
  const { user, plan, remaining, refresh } = useSession()
  const navigate = useNavigate()
  const [history, setHistory] = useState<AnalysisResult[]>(() => getHistory(user?.id))
  const [filter, setFilter] = useState<Verdict | 'all'>('all')
  const [open, setOpen] = useState<AnalysisResult | null>(null)

  const filtered = useMemo(
    () => (filter === 'all' ? history : history.filter((scan) => scan.verdict === filter)),
    [history, filter],
  )

  const stats = useMemo(() => {
    const total = history.length
    const flagged = history.filter((scan) => scan.verdict !== 'authentic').length
    const avg = total ? Math.round(history.reduce((sum, scan) => sum + scan.score, 0) / total) : 0
    return { total, flagged, avg }
  }, [history])

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-28 text-center sm:px-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <ShieldCheck className="h-6 w-6 text-signal" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Your evidence desk needs a key.</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
          Sign in to keep scan history, track quota and reopen saved reports. Accounts are local to
          this browser.
        </p>
        <div className="mt-7 flex gap-3">
          <ButtonLink to="/auth?next=/dashboard">Sign in</ButtonLink>
          <ButtonLink to="/analyze" variant="outline">
            Scan as guest
          </ButtonLink>
        </div>
      </div>
    )
  }

  const remove = (id: string) => {
    setHistory(deleteScan(id, user.id))
    setOpen(null)
    refresh()
  }

  const exportHistory = () => {
    const payload = {
      account: user.email,
      exportedAt: new Date().toISOString(),
      reports: history.map((scan) => reportJson(scan).report),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `verisect-history-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const usagePct = Math.min(100, Math.round(((plan.scans - remaining) / plan.scans) * 100))

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-mist-500">Workspace / dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {user.name ? `${user.name.split(' ')[0]}’s evidence log` : 'Evidence log'}
          </h1>
          <p className="mt-2 text-[13.5px] text-mist-400">
            Reports are stored in this browser under{' '}
            <span className="font-mono text-[12px] text-mist-300">{user.email}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportHistory} disabled={!history.length}>
            <Download className="h-3.5 w-3.5" /> Export log
          </Button>
          <ButtonLink to="/analyze" size="sm">
            New scan <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Reports saved', value: String(stats.total), icon: ScanLine, note: 'last 12 kept' },
          {
            label: 'Flagged frames',
            value: String(stats.flagged),
            icon: ShieldAlert,
            note: 'review or manipulated',
          },
          { label: 'Average score', value: String(stats.avg), icon: BarChart3, note: '0–100 tamper scale' },
          {
            label: 'Scans left',
            value: `${remaining}`,
            icon: Clock,
            note: `${plan.name} · resets monthly`,
          },
        ].map((stat) => (
          <div key={stat.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="mono-label text-[9.5px]">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-mist-500" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-mist-50">{stat.value}</p>
            <p className="mt-1 text-[11.5px] text-mist-500">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setFilter(entry.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] transition-colors ${
                    filter === entry.id
                      ? 'bg-white/10 text-mist-50'
                      : 'text-mist-400 hover:bg-white/5 hover:text-mist-100'
                  }`}
                >
                  {entry.label}
                  <span className="ml-1.5 font-mono text-[10px] text-mist-500">
                    {entry.id === 'all'
                      ? history.length
                      : history.filter((scan) => scan.verdict === entry.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel mt-4 flex flex-col items-center px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                <ScanLine className="h-5 w-5 text-mist-400" />
              </span>
              <p className="mt-4 text-[14px] text-mist-100">
                {history.length === 0 ? 'No reports yet.' : 'Nothing in this band.'}
              </p>
              <p className="mt-1.5 max-w-xs text-[12.5px] text-mist-500">
                {history.length === 0
                  ? 'Your first scan will appear here with its verdict, score and heatmaps.'
                  : 'Try a different filter, or run a fresh scan.'}
              </p>
              <ButtonLink to="/analyze" size="sm" className="mt-5">
                Open the analyzer
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filtered.map((scan) => {
                const meta = verdictMeta[scan.verdict]
                return (
                  <button
                    key={scan.id}
                    type="button"
                    onClick={() => setOpen(scan)}
                    className="panel panel-hover flex w-full items-center gap-4 p-3 text-left"
                  >
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-950">
                      <img
                        src={scan.thumb}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                      <span
                        className={`absolute inset-x-0 bottom-0 h-0.5 ${meta.bar}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-mist-100">
                          {scan.fileName}
                        </p>
                        <Badge className={meta.chip}>{meta.short}</Badge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10.5px] text-mist-500">
                        {scan.width}×{scan.height} · {formatBytes(scan.fileSize)} ·{' '}
                        {relativeTime(scan.createdAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/8">
                          <div
                            className={`h-full rounded-full ${meta.bar}`}
                            style={{ width: `${Math.max(3, scan.score)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-mist-400">{scan.score}/100</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-mist-600" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="mono-label text-mist-300">Plan</p>
              <Badge className="bg-signal/10 text-signal ring-signal/25">{plan.name}</Badge>
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-mist-50">
              {plan.scans.toLocaleString()}
              <span className="ml-1.5 text-[12px] font-normal text-mist-500">scans / month</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full ${usagePct > 85 ? 'bg-amber-400' : 'bg-signal'}`}
                style={{ width: `${Math.max(2, usagePct)}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-mist-500">
              {plan.scans - remaining} used this month · {remaining} remaining
            </p>
            <ButtonLink to="/pricing" variant="outline" size="sm" className="mt-4 w-full">
              {plan.id === 'team' ? 'Manage plan' : 'Compare plans'}
            </ButtonLink>
          </div>

          <div className="panel p-5">
            <p className="mono-label text-mist-300">Storage</p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              Reports, thumbnails and heatmaps live in this browser. Clearing site data removes them
              permanently — export anything you need to keep.
            </p>
            <button
              type="button"
              onClick={() => {
                setHistory(getHistory(user.id))
                refresh()
              }}
              className="mt-4 flex items-center gap-1.5 text-[11.5px] text-mist-500 hover:text-mist-200"
            >
              <Clock className="h-3.5 w-3.5" /> Refresh from storage
            </button>
          </div>

          <div className="panel p-5">
            <p className="mono-label text-mist-300">Quick links</p>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'How scoring works', to: '/docs#scoring' },
                { label: 'Signal method notes', to: '/docs#method' },
                { label: 'Limits of the engine', to: '/docs#limits' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex items-center justify-between text-[12.5px] text-mist-400 hover:text-mist-100"
                  >
                    {link.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-ink-950/85 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-widest text-mist-400">
                Saved report · {relativeTime(open.createdAt)}
              </p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-mist-300 hover:bg-white/6 hover:text-white"
                aria-label="Close report"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AnalysisReport
              result={open}
              onDelete={() => remove(open.id)}
              onNewScan={() => {
                setOpen(null)
                navigate('/analyze')
              }}
            />
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(open.id)}
                className="text-rose-300/80 hover:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
