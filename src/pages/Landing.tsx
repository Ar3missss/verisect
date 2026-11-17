import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  FileSearch,
  Fingerprint,
  Layers,
  Lock,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { HeroScan } from '../components/HeroScan'
import { Badge, ButtonLink, Eyebrow, SectionHeading } from '../components/ui'
import { PLANS } from '../lib/store'

const signals = [
  {
    id: 'ela',
    name: 'Error level analysis',
    weight: '26%',
    icon: Layers,
    copy: 'Re-saves the frame at a known JPEG quality and measures the residual. Regions with a different compression history light up.',
  },
  {
    id: 'clone',
    name: 'Copy-move detection',
    weight: '26%',
    icon: FileSearch,
    copy: 'Corner-rich patches are compared with correlation and voted by displacement. Repeats at one fixed offset are clustered as a clone.',
  },
  {
    id: 'noise',
    name: 'Sensor noise profile',
    weight: '22%',
    icon: Fingerprint,
    copy: 'A high-pass residual isolates per-pixel grain. Imported content carries the grain of its own camera, or none at all.',
  },
  {
    id: 'meta',
    name: 'Metadata provenance',
    weight: '20%',
    icon: ShieldCheck,
    copy: 'EXIF, XMP and PNG text chunks are parsed for editors, generative tools, and provenance that has been stripped away.',
  },
  {
    id: 'grid',
    name: 'Compression integrity',
    weight: '8%',
    icon: ScanLine,
    copy: 'Measures energy on the 8×8 JPEG lattice. A grid that is stronger in one corner means part of the frame was re-saved elsewhere.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Drop the frame',
    copy: 'Drag in a JPEG, PNG or WebP — or paste straight from the clipboard. The file is decoded in the tab, not uploaded.',
    icon: Upload,
  },
  {
    n: '02',
    title: 'Five signals run',
    copy: 'Compression, clone, noise, metadata and grid checks execute in parallel stages against a normalised raster.',
    icon: Sparkles,
  },
  {
    n: '03',
    title: 'Read the evidence',
    copy: 'Get a 0–100 tamper score, a confidence value, a heatmap of suspect regions and every finding in plain language.',
    icon: FileSearch,
  },
]

const faqs = [
  {
    q: 'Is my image uploaded anywhere?',
    a: 'No. Decoding, analysis and rendering all happen inside your browser tab. There is no upload endpoint, no image storage and no analytics on file contents. You can verify this in the network panel while a scan runs.',
  },
  {
    q: 'How accurate is the detector?',
    a: 'Each signal is a published forensic technique with tuned thresholds, and the fused score correlates well with obvious splices, clones and recompression. It is not a classifier trained on a labelled corpus, and it cannot detect every edit — especially generative fills or edits made before a final re-encode. Treat it as triage that points a human at the right regions.',
  },
  {
    q: 'Why is the score low on an image I know was edited?',
    a: 'Heavy re-compression, resizing, screenshots and social uploads flatten the very artifacts these checks rely on. A low score means "no evidence found", not "authentic". Crop out the region of interest and scan that for a sharper read.',
  },
  {
    q: 'What does confidence mean?',
    a: 'Confidence reflects how much the independent signals agree with each other and how much raw material was available. Five signals converging on 90 gives high confidence; two signals at 10 and 85 gives low confidence even if the weighted score is mid-range.',
  },
  {
    q: 'Can I use reports in an investigation?',
    a: 'Reports export as structured JSON with per-signal findings, region coordinates and caveats, which makes them easy to attach to a case file. They are probabilistic technical findings, not certified expert testimony — pair them with chain-of-custody handling and human review.',
  },
]

export default function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 grid-bg fade-mask opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-[-14rem] h-[36rem] w-[46rem] -translate-x-1/2 rounded-full bg-signal/[0.07] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div>
            <Eyebrow>Forensic image intelligence</Eyebrow>
            <h1 className="mt-5 font-display text-[2.7rem] font-semibold leading-[1.03] tracking-tight sm:text-[3.6rem] lg:text-[4rem]">
              See what the
              <br />
              pixels are <span className="text-signal">hiding.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-mist-400">
              Verisect audits a photograph for splices, clones and recompression in seconds — five
              forensic signals fused into one tamper score, a region heatmap and a report you can
              hand to an editor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to="/analyze" size="lg">
                Analyze an image free <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/#how" variant="outline" size="lg">
                See how it works
              </ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-mist-500">
              {['Runs 100% in your browser', 'No sign-up to start', '10 free scans / month'].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-signal" />
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-6 text-[12px] text-mist-400">
              Built by Aryan Pathanía, Aryan Sharma, Tanish Gupta & Archit
            </div>
          </div>

          <div className="lg:pl-6">
            <HeroScan />
          </div>
        </div>

        <div className="relative border-y border-white/6 bg-white/[0.015]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-500">
              Built on documented forensic methods
            </p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 font-display text-[13px] text-mist-400">
              <span>Error-level analysis</span>
              <span className="text-mist-700">/</span>
              <span>PRNU-style noise</span>
              <span className="text-mist-700">/</span>
              <span>Correlation copy-move</span>
              <span className="text-mist-700">/</span>
              <span>EXIF &amp; XMP audit</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from suspicion to evidence."
          description="No queue, no upload, no credentials. A scan takes about as long as reading this paragraph."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="panel panel-hover relative overflow-hidden p-6">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] tracking-[0.2em] text-signal/70">{step.n}</span>
                <step.icon className="h-5 w-5 text-mist-500" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-mist-400">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signals */}
      <section id="signals" className="relative border-y border-white/6 bg-ink-900/60">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="The signal stack"
              title="Five independent opinions, one weighted verdict."
              description="Each check is deliberately blind to the others. The engine only trusts a finding when the physics line up."
            />
            <Link
              to="/docs#method"
              className="inline-flex items-center gap-1.5 text-[13px] text-signal hover:underline"
            >
              Read the method notes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {signals.map((signal, index) => (
              <div
                key={signal.id}
                className={`panel panel-hover p-6 ${index === 0 ? 'lg:col-span-2' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
                      <signal.icon className="h-4 w-4 text-signal" />
                    </span>
                    <h3 className="text-[15px] font-medium text-mist-50">{signal.name}</h3>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-mist-500">
                    {signal.weight} weight
                  </span>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-mist-400">{signal.copy}</p>
                <div className="mt-5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-signal/60"
                      style={{ width: signal.weight }}
                    />
                  </div>
                  <span className="font-mono text-[9.5px] text-mist-600">fused</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence / trust */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Eyebrow>Built for verification desks</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]">
              A report you can defend,
              <br />
              not just a red or green badge.
            </h2>
            <p className="mt-5 text-[14.5px] leading-relaxed text-mist-400">
              Every verdict ships with the numbers behind it: the adaptive thresholds, the block
              counts, the offsets, the metadata fields. When a signal cannot be evaluated — a PNG
              with no JPEG history, say — the report says so instead of guessing.
            </p>
            <ul className="mt-7 space-y-4">
              {[
                {
                  icon: Layers,
                  title: 'Heatmaps that localise the edit',
                  copy: 'Overlay compression, noise and duplicate-texture maps at adjustable opacity.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Confidence, caveats and pass/fail bands',
                  copy: 'Signals that disagree lower the confidence, so a weak verdict looks weak.',
                },
                {
                  icon: Lock,
                  title: 'Nothing leaves the device',
                  copy: 'No image bytes are transmitted. Reports live in this browser until you delete them.',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
                    <item.icon className="h-4 w-4 text-signal" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-mist-100">{item.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-mist-500">{item.copy}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <p className="mono-label">Sample finding</p>
                <p className="mt-1 font-mono text-[11px] text-mist-400">press_photo_final.jpg</p>
              </div>
              <Badge className="bg-rose-400/10 text-rose-300 ring-rose-400/25">78 / 100</Badge>
            </div>
            <div className="space-y-4 pt-5">
              {[
                { label: 'Error level analysis', score: 82, note: '6.4% of blocks above baseline' },
                { label: 'Copy-move detection', score: 74, note: '31 pairs · offset +318 × −12 px' },
                { label: 'Sensor noise', score: 61, note: '12 blocks with suppressed grain' },
                { label: 'Metadata provenance', score: 46, note: 'Adobe Photoshop in XMP' },
                { label: 'Compression integrity', score: 22, note: 'grid even across frame' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] text-mist-200">{row.label}</span>
                    <span
                      className={`font-mono text-[11px] ${
                        row.score >= 60 ? 'text-rose-300' : row.score >= 30 ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {row.score}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${
                        row.score >= 60 ? 'bg-rose-400' : row.score >= 30 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${row.score}%` }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-mist-500">{row.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <p className="text-[11.5px] leading-relaxed text-amber-100/80">
                Confidence 86% — four of five signals point the same way. Metadata alone would be
                weak evidence; the clone cluster is what makes this conclusive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-y border-white/6 bg-ink-900/60">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <SectionHeading
            align="center"
            eyebrow="Plans"
            title="Start free. Scale when the workload does."
            description="Every plan unlocks the full five-signal engine. Higher tiers buy volume, seats and audit history."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`panel relative flex flex-col p-6 ${
                  plan.id === 'pro' ? 'border-signal/35 bg-signal/[0.03]' : ''
                }`}
              >
                {plan.id === 'pro' && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-signal px-2.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-widest text-ink-950">
                    most picked
                  </span>
                )}
                <p className="text-[13px] font-medium text-mist-200">{plan.name}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-display text-3xl font-semibold text-mist-50">
                    ${plan.price}
                  </span>
                  <span className="mb-1 text-[12px] text-mist-500">/ month</span>
                </div>
                <p className="mt-1 text-[11.5px] text-mist-500">{plan.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[12.5px] text-mist-300">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  to="/pricing"
                  variant={plan.id === 'pro' ? 'primary' : 'outline'}
                  size="sm"
                  className="mt-6 w-full"
                >
                  {plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`}
                </ButtonLink>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[11.5px] text-mist-600">
            Accounts and billing are simulated in this build — plans switch locally, no card is
            charged.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
        <SectionHeading eyebrow="FAQ" title="Questions worth asking." />
        <div className="mt-10 divide-y divide-white/8 border-y border-white/8">
          {faqs.map((item, index) => (
            <details key={item.q} className="group py-5" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="text-[14.5px] font-medium text-mist-100">{item.q}</span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 text-mist-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-10 text-[13px] leading-relaxed text-mist-400">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-signal/20 bg-gradient-to-br from-signal/[0.09] via-ink-900 to-ink-900 px-6 py-14 text-center sm:px-14">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-signal/15 blur-3xl" />
          <div className="relative">
            <Badge className="bg-white/8 text-mist-200 ring-white/15">no upload · no wait</Badge>
            <h2 className="mx-auto mt-5 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]">
              Put the next suspicious image under the lens.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[14px] leading-relaxed text-mist-400">
              Ten free scans every month. No card, no queue, and the image never leaves your device.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink to="/analyze" size="lg">
                Open the analyzer <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/docs" variant="outline" size="lg">
                Read the docs
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
