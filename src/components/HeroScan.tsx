import { Badge } from './ui'

export function HeroScan() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-signal/[0.07] blur-3xl" />

      <div className="panel relative overflow-hidden shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-300/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[10.5px] text-mist-400">evidence_0142.jpg</span>
          </div>
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-500">
            analysing
          </span>
        </div>

        <div className="relative aspect-[5/4] overflow-hidden bg-ink-950">
          <svg viewBox="0 0 500 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#132735" />
                <stop offset="52%" stopColor="#3f6b78" />
                <stop offset="78%" stopColor="#c79a72" />
                <stop offset="100%" stopColor="#3b302a" />
              </linearGradient>
              <radialGradient id="sun" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffe6bd" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ffd08a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="heat" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff8f6b" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#ffd166" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <rect width="500" height="400" fill="url(#sky)" />
            <circle cx="352" cy="196" r="128" fill="url(#sun)" />
            <circle cx="352" cy="196" r="30" fill="#ffeacb" opacity="0.9" />
            <path d="M0 400 L0 320 L70 286 L132 312 L198 268 L262 300 L318 276 L372 306 L430 282 L500 316 L500 400 Z" fill="#22313a" />
            <path d="M0 400 L0 352 L92 336 L170 356 L246 330 L330 358 L404 338 L500 362 L500 400 Z" fill="#18242b" />
            <path d="M0 400 L0 378 L500 386 L500 400 Z" fill="#0d151a" />
            <g opacity="0.5">
              {Array.from({ length: 11 }).map((_, index) => (
                <line
                  key={index}
                  x1={0}
                  y1={396 + index * 0}
                  x2={500}
                  y2={396 + index * 0}
                  stroke="rgba(190,220,230,0.1)"
                  strokeWidth="1"
                />
              ))}
            </g>
            {/* cloned rock cluster, pasted */}
            <g opacity="0.95">
              {Array.from({ length: 44 }).map((_, index) => {
                const angle = (index / 44) * Math.PI * 2
                const radius = (index % 7) * 7
                return (
                  <circle
                    key={index}
                    cx={368 + Math.cos(angle) * radius}
                    cy={336 + Math.sin(angle) * radius * 0.5}
                    r={3 + (index % 4)}
                    fill={index % 3 ? '#243038' : '#2c3a44'}
                  />
                )
              })}
            </g>
          </svg>

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120px 90px at 73% 84%, rgba(255,138,94,0.62), transparent 70%), radial-gradient(90px 70px at 30% 88%, rgba(255,209,102,0.42), transparent 72%), radial-gradient(140px 80px at 58% 12%, rgba(110,231,183,0.22), transparent 75%)',
              mixBlendMode: 'screen',
            }}
          />

          <div className="absolute left-[55%] top-[68%] h-[30%] w-[30%] rounded-[3px] border border-dashed border-amber-300/80">
            <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
              clone offset +318 × −12
            </span>
          </div>
          <div className="absolute left-[24%] top-[70%] h-[24%] w-[22%] rounded-[3px] border border-rose-400/60" />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 animate-scan bg-gradient-to-b from-transparent via-signal/20 to-signal/70" />
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/8 bg-ink-900/60 px-4 py-3">
          <div className="flex items-end gap-2">
            <span className="font-display text-2xl font-semibold text-rose-300">78</span>
            <span className="mb-0.5 font-mono text-[9.5px] uppercase tracking-widest text-mist-500">
              tamper score
            </span>
          </div>
          <Badge className="bg-rose-400/10 text-rose-300 ring-rose-400/25">
            manipulation detected
          </Badge>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/8 border-t border-white/8">
          {[
            ['ELA', '82'],
            ['CLONE', '74'],
            ['NOISE', '61'],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-mist-500">{label}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-signal/80"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-mist-300">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden animate-float rounded-xl border border-white/10 bg-ink-850/95 px-3.5 py-2.5 shadow-xl shadow-black/50 backdrop-blur sm:block">
        <p className="font-mono text-[9px] uppercase tracking-widest text-mist-500">confidence</p>
        <p className="font-mono text-sm text-signal">86% · 5 signals agree</p>
      </div>
    </div>
  )
}
