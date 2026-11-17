import type { Verdict } from '../lib/forensics/types'

const palette: Record<Verdict, { stroke: string; text: string }> = {
  authentic: { stroke: '#34d399', text: 'text-emerald-300' },
  suspect: { stroke: '#fbbf24', text: 'text-amber-300' },
  tampered: { stroke: '#fb7185', text: 'text-rose-300' },
}

export function ScoreDial({
  score,
  verdict,
  size = 176,
  label = 'Tamper score',
}: {
  score: number
  verdict: Verdict
  size?: number
  label?: string
}) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100)
  const tone = palette[verdict]
  const gradientId = `dial-${verdict}`

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tone.stroke} stopOpacity="0.55" />
            <stop offset="100%" stopColor={tone.stroke} />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
        />
        <circle cx="64" cy="64" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-[2.6rem] font-semibold leading-none ${tone.text}`}>
          {score}
        </span>
        <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-500">
          {label}
        </span>
      </div>
    </div>
  )
}

export function ScoreBar({ score, verdict }: { score: number; verdict: Verdict }) {
  const tone = palette[verdict]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(100, Math.max(2, score))}%`, backgroundColor: tone.stroke }}
      />
    </div>
  )
}
