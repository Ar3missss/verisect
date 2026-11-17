import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Badge, ButtonLink, Eyebrow } from '../components/ui'

const sections = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'schema', label: 'Report schema' },
  { id: 'method', label: 'Method notes' },
  { id: 'scoring', label: 'Scoring & confidence' },
  { id: 'limits', label: 'Limits' },
  { id: 'privacy', label: 'Privacy model' },
  { id: 'accounts', label: 'Accounts & plans' },
  { id: 'about', label: 'About' },
  { id: 'founders', label: 'Founders' },
]

const signalDocs = [
  {
    name: 'Error level analysis',
    weight: '26%',
    body: [
      'The frame is re-encoded at JPEG quality 90 and compared pixel-by-pixel in luminance against the decoded upload. The absolute residual is averaged over 16×16 blocks.',
      'The frame-wide median is the baseline; blocks above median + 3.2 × MAD are outliers. The score mixes the affected area and the p99 baseline contrast, so one hot block alone does not carry the verdict.',
    ],
    fails: 'Lossless uploads have no JPEG history, so the signal is marked unavailable. Heavy social recompression can flatten the residual.',
  },
  {
    name: 'Copy-move detection',
    weight: '26%',
    body: [
      'The frame is scaled to a 340 px working raster and described as 32×32 patches on a 4 px stride. Each patch becomes an 8×8 mean-removed luminance descriptor.',
      'Corner strength — the smaller eigenvalue of the gradient structure tensor — selects anchors, so skies and gradients are skipped. Anchor pairs are compared with normalised cross-correlation; matches are clustered by displacement, and a cluster only scores when it covers a 2D block with a repeatable offset.',
      'Matches are weighted by correlation strength, so a 0.99 match counts far more than a 0.91 one, and wide one-patch bands (horizons, railings, text rules) are rejected as scene structure.',
    ],
    fails: 'Exact reuse of a region will be found; a mirrored clone usually will not. Resized content, flat regions and heavy re-compression reduce the correlation margin.',
  },
  {
    name: 'Sensor noise profile',
    weight: '22%',
    body: [
      'A 3×3 box blur is subtracted from luminance to isolate high-pass noise. Local deviation is computed per 20×20 block.',
      'Blocks beyond median ± 3.6 × MAD are flagged, distinguishing grain that is sharper than its neighbourhood (a splice from a different sensor or ISO) from grain that has been smoothed away (retouching, synthetic fill).',
    ],
    fails: 'Denoised exports, strong film grain or heavy compression destroy the local noise structure, pushing the score toward zero.',
  },
  {
    name: 'Metadata provenance',
    weight: '20%',
    body: [
      'JPEG marker segments and PNG chunks are parsed directly from the bytes. EXIF IFD0, the Exif sub-IFD, XMP packets, Photoshop APP13 resources and PNG text chunks are read for software, capture device, timestamps and generative-tool signatures.',
      'Editors add evidence of a post-capture pipeline; generative tools add strong evidence of synthesis; camera provenance lowers suspicion slightly. Missing EXIF on a JPEG adds a small amount.',
    ],
    fails: 'Every field here is strippable and forgeable. Metadata is corroboration, never the deciding factor, and it is weighted accordingly.',
  },
  {
    name: 'Compression integrity',
    weight: '8%',
    body: [
      'Gradient energy across the 8×8 JPEG lattice is compared with block interiors at all eight phases, then measured per region.',
      'A grid that is strong but uneven between regions means parts of the frame were recompressed in a different pipeline — common when content is imported from another file.',
    ],
    fails: 'Screen captures, resizes and WebP transcodes break the lattice entirely, leaving this signal silent by design.',
  },
]

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-12 sm:px-8">
      <div className="max-w-2xl">
        <Eyebrow>Documentation</Eyebrow>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">
          How Verisect reaches a verdict.
        </h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-mist-400">
          Everything the engine does, the thresholds it uses, and the cases it cannot handle. No
          black box: the analyser is plain TypeScript running in the tab.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className="bg-white/6 text-mist-300 ring-white/12">engine 1.0</Badge>
          <Badge className="bg-white/6 text-mist-300 ring-white/12">client-side</Badge>
          <Badge className="bg-white/6 text-mist-300 ring-white/12">5 signals · 4 fusion weights</Badge>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mono-label mb-3">On this page</p>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-md px-2.5 py-1.5 text-[12.5px] text-mist-500 transition-colors hover:bg-white/5 hover:text-mist-100"
              >
                {section.label}
              </a>
            ))}
            <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[11.5px] leading-relaxed text-mist-500">
                Looking for a hosted API? This build is intentionally client-side only.
              </p>
              <Link to="/analyze" className="mt-2 flex items-center gap-1 text-[11.5px] text-signal">
                Run the analyzer <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>

        <div className="prose-doc min-w-0 space-y-14">
          <section id="quickstart" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Quickstart</h2>
            <ol className="mt-4 space-y-3">
              {[
                'Open the analyzer and drop a JPEG, PNG, WebP, BMP or GIF up to 22 MB — or paste from the clipboard.',
                'Watch the five stages run: decode, metadata, error level, noise, copy-move, compression, fusion.',
                'Read the tamper score, then open any signal to see the thresholds and counts behind it.',
                'Toggle the heatmaps, inspect the marked regions, and export the report as JSON if you need to file it.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed text-mist-400">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-signal/30 bg-signal/10 font-mono text-[10px] text-signal">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="panel mt-5 p-4">
              <p className="mono-label text-[9.5px]">Tip</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">
                Cropping to the suspicious region and scanning the crop almost always sharpens the
                result: the median baseline becomes local, and the copy-move working raster gains
                effective resolution.
              </p>
            </div>
          </section>

          <section id="schema" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Report schema</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Exports are a single JSON document. Image data is never included — only measurements,
              region coordinates in analysed-raster pixels, metadata fields and caveats.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/8 bg-ink-900 p-4 font-mono text-[11.5px] leading-relaxed text-mist-300">
{`{
  "report": {
    "id": "9f2c…",
    "generatedAt": "2026-10-25T18:52:11.402Z",
    "engine": "verisect-forensics/1.0",
    "file": { "name": "press.jpg", "bytes": 1842211,
      "format": "jpeg", "dimensions": { "width": 4032, "height": 3024 } },
    "verdict": { "label": "tampered", "tamperScore": 78, "confidence": 86 },
    "processingMs": 1240,
    "signals": [
      { "id": "ela", "label": "Error level analysis", "score": 82,
        "weight": 26, "summary": "6.4% of the frame sits above the compression baseline.",
        "unavailable": null, "findings": [ … ] }
    ],
    "regions": [ { "source": "copy-move", "x": 412, "y": 688,
                   "width": 148, "height": 96, "score": 88 } ],
    "metadata": { "Format": "JPEG", "Software": "Adobe Photoshop 25.4" },
    "caveats": [ … ]
  }
}`}
            </pre>
          </section>

          <section id="method" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Method notes</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Each signal is scored 0–100 independently. Weights are fixed rather than learned, and
              unavailable signals are removed from the denominator instead of contributing a zero.
            </p>
            <div className="mt-6 space-y-4">
              {signalDocs.map((signal) => (
                <div key={signal.name} className="panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[15px] font-medium text-mist-50">{signal.name}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mist-500">
                      weight {signal.weight}
                    </span>
                  </div>
                  {signal.body.map((paragraph) => (
                    <p key={paragraph} className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
                      {paragraph}
                    </p>
                  ))}
                  <p className="mt-3 rounded-lg border border-white/6 bg-white/[0.02] p-3 text-[12px] leading-relaxed text-mist-500">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mist-400">
                      blind spot ·{' '}
                    </span>
                    {signal.fails}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="scoring" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Scoring & confidence</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['0–27', 'Low suspicion', 'bg-emerald-400', 'text-emerald-300'],
                ['28–59', 'Needs review', 'bg-amber-400', 'text-amber-300'],
                ['60–100', 'Strong evidence', 'bg-rose-400', 'text-rose-300'],
              ].map(([range, label, bar, tone]) => (
                <div key={range} className="panel p-4">
                  <div className={`h-1 w-full rounded-full ${bar}`} />
                  <p className={`mt-3 font-mono text-lg ${tone}`}>{range}</p>
                  <p className="text-[11.5px] text-mist-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-mist-400">
              The tamper score starts as the weighted mean of the available signals. When one
              signal reaches 65 or above it pulls the fused score toward itself by a factor that
              reflects how precise that signal is: a raw-pixel-verified copy-move cluster closes up
              to 80% of the gap, a coherent noise region 75%, error level 60%, block-grid 50% and a
              metadata tag only 35% — a tag can be edited as easily as the pixels. Metadata is
              therefore corroboration, never the deciding vote.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Copy-move is deliberately precision-first. A cluster must contain patches whose raw
              pixels actually match at one exact displacement and cover a compact, detail-bearing
              region; texture that merely resembles other texture (clouds, feathers, railings,
              repeated lettering) is rejected even when it correlates strongly. A false accusation
              is worse than a missed clone, so ambiguous evidence lands near the middle of the score
              range and is labelled for review instead of being called forged.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Confidence is computed from the number of active signals, how much they agree
              (standard deviation of their scores) and available resolution. Five signals
              converging on a high score yields confidence in the high 80s; two signals far apart
              cannot, even if the fused score lands in the middle.
            </p>
          </section>

          <section id="limits" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Limits</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                'This is not a trained classifier and has not been benchmarked against a labelled corpus. It is a deterministic, explainable heuristic stack.',
                'Generative fills, object removal and edits made before a final resize or re-encode often leave no detectable trace in the delivered pixels.',
                'Lossless PNGs lose the compression signal entirely; screenshots of images are effectively new captures.',
                'Clone matching looks for a duplicated region at one translation. A clone that was rotated, scaled, warped or pasted with heavy re-encoding may not form that single displacement and can be missed.',
                'Server-side decoding differences (colour management, EXIF rotation) can shift residuals slightly between browsers.',
                'A low score means no evidence was found, not that the image is authentic. A high score is not proof of intent.',
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-mist-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mist-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="privacy" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Privacy model</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Image bytes are read with the File API, decoded with
              <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[12px]">
                createImageBitmap
              </code>
              and analysed in memory. There is no upload endpoint, no storage bucket and no
              third-party script on the analyzer route. Reports are written to local storage so the
              dashboard can list them; delete a report to remove it from disk.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              The only network requests on this site are page assets and the web fonts. You can
              confirm this in DevTools while a scan runs.
            </p>
          </section>

          <section id="accounts" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Accounts & plans</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Accounts and quotas in this build are local: sign-up hashes the password with
              PBKDF2-SHA256 (120k iterations, random salt) and keeps only the hash in local storage.
              Plans switch instantly with a simulated checkout — no card, no charge, no sync between
              devices.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              The storage module is isolated in
              <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[12px]">
                src/lib/store.ts
              </code>,
              so a production deployment can swap in a real auth provider and database without
              touching the analyzer.
            </p>
          </section>

          <section id="about" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">About</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Verisect is a demonstration image-forensics product: a complete SaaS surface — landing
              page, analyzer, report viewer, dashboard, pricing and docs — built around a real,
              inspectable analysis engine. The forensic techniques are published and widely used;
              the implementation and thresholds are ours.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink to="/analyze" size="sm">
                Start a scan <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
              <a
                href="https://en.wikipedia.org/wiki/Error_level_analysis"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 px-4 text-[12.5px] text-mist-300 hover:border-white/25 hover:text-white"
              >
                Error level analysis <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div id="contact" className="panel mt-8 scroll-mt-24 p-5">
              <p className="mono-label">Contact</p>
              <p className="mt-2 text-[13px] text-mist-400">
                This is a local demo build — the address below is illustrative.
              </p>
              <p className="mt-1 font-mono text-[13px] text-mist-200">
                desk@verisect.app
              </p>
            </div>
          </section>

          <section id="founders" className="scroll-mt-24">
            <h2 className="font-display text-2xl font-semibold">Founders</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
              Verisect was founded by a team of researchers passionate about
              digital forensics and open-image analysis.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ul className="mt-4 space-y-3 text-[12.5px] text-mist-300">
                <li><span className="font-medium">Aryan Pathania</span> — Founder</li>
                <li><span className="font-medium">Aryan Sharma</span> — Cofounder</li>
                <li><span className="font-medium">Tanish Gupta</span> — Cofounder</li>
                <li><span className="font-medium">Archit</span> — Cofounder</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}