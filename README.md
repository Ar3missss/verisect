# Verisect

A complete SaaS website for an AI-assisted image forgery detector. The forensic engine is real:
uploads are analysed in the browser with error-level analysis, sensor-noise consistency,
copy-move matching, metadata auditing and compression-grid integrity, then fused into a tamper
score with a confidence value, heatmaps and a JSON report.

Nothing is uploaded. There is no backend, no image storage and no third-party script on the
analyzer route.

## Stack

- Vite 6 + React 19 + TypeScript (strict)
- Tailwind CSS v4 (theme tokens in `src/index.css`)
- React Router 7
- Lucide icons

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --build
npm run build      # typecheck + production bundle
npm run preview    # serve dist/
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing: hero scan viewport, method stack, sample report, plans, FAQ |
| `/analyze` | Dropzone, live stage progress, full forensic report, JSON export |
| `/dashboard` | Account-scoped evidence log, stats, quota, saved-report viewer |
| `/pricing` | Three plans, annual toggle, feature matrix, simulated checkout |
| `/auth` | Sign in / sign up, demo account |
| `/docs` | Method notes, report schema, scoring, limits, privacy model |

## Engine

`src/lib/forensics/` contains the whole analyzer:

- `decode.ts` — `createImageBitmap` decode, format sniffing, 1100 px analysis raster, grayscale.
- `ela.ts` — JPEG re-encode at q90, per-pixel residual, 16×16 block statistics with a
  median/MAD baseline. Skipped for lossless containers, and the report says so.
- `noise.ts` — 3×3 high-pass residual, 20×20 block deviation vs the frame median, heatmap.
- `copyMove.ts` — 32×32 patch descriptors on a 4 px stride, corner-strength anchor selection
  (smaller eigenvalue of the structure tensor), normalised cross-correlation matching,
  displacement clustering weighted by correlation, 2D-region and area filters.
- `metadata.ts` — manual JPEG marker / PNG chunk parsing: EXIF IFD0 + Exif sub-IFD (both byte
  orders), XMP, Photoshop APP13, PNG tEXt/iTXt/eXIf, editor and generative-tool signatures.
- `compression.ts` — 8×8 block-grid gradient energy across eight phases and per region.
- `analyze.ts` — orchestration, progress callbacks, suspicion grid, region boxes, heatmaps,
  weighted fusion, single-signal escalation (≥65 closes up to half the gap), confidence.

Weights: error level 26, copy-move 26, noise 22, metadata 20, compression 8. Bands:
0–27 low, 28–59 review, 60–100 strong evidence.

Reports are probabilistic. The UI, the docs and the exported JSON all say so explicitly.

## Accounts and billing

Accounts, plans and scan history live in `localStorage` (PBKDF2-SHA256, 120k iterations, random
salt; only the hash is stored). Plans switch through a simulated checkout — no card is charged and
no data leaves the device. `src/lib/store.ts` isolates persistence so a production build can swap
in a real auth provider and database without touching the analyzer.

## Sample images

`src/lib/samples.ts` generates three synthetic JPEGs on demand from a seeded PRNG:

- `clean-capture.jpg` — textured concrete macro scene, single grain profile (expect a low score).
- `cloned-detail.jpg` — same scene with a 190×152 crop duplicated (expect copy-move evidence).
- `edited-receipt.jpg` — a receipt with its paid stamp duplicated (expect a high score).

They exist so the analyzer can be exercised without an upload. They are synthetic; scores on real
photographs depend heavily on the file's compression history.

## Known limits

- Heuristic, deterministic stack — not a trained classifier and not benchmarked as one.
- Lossless PNG/WebP files have no JPEG history, so error-level analysis is unavailable.
- Generative fills and edits made before a final re-encode often leave no pixel trace.
- Highly repetitive synthetic content (uniform horizons, repeating abstract shapes) can look like
  a clone to any patch-correlation detector.
- Reports are technical findings, not legal proof.
