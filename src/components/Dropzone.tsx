import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Sparkles, Upload } from 'lucide-react'
import { SAMPLES, buildSample, type SampleKind } from '../lib/samples'
import { Spinner } from './ui'

export function Dropzone({
  onFile,
  busy,
  onError,
}: {
  onFile: (file: File) => void
  busy?: boolean
  onError?: (message: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [loadingSample, setLoadingSample] = useState<SampleKind | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      onFile(file)
    },
    [onFile],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (busy) return
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (file) onFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFile, busy])

  const loadSample = async (kind: SampleKind) => {
    setLoadingSample(kind)
    try {
      onFile(await buildSample(kind))
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not build the sample image')
    } finally {
      setLoadingSample(null)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        className={`relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-colors sm:p-14 ${
          dragging
            ? 'border-signal/70 bg-signal/[0.06]'
            : 'border-white/14 bg-white/[0.015] hover:border-white/25'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="relative">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-ink-850 shadow-inner">
            <ImagePlus className="h-6 w-6 text-signal" />
          </div>
          <h3 className="mt-5 font-display text-xl text-mist-50">
            {dragging ? 'Drop to start the analysis' : 'Drop an image to audit it'}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mist-500">
            JPEG, PNG, WebP, BMP or GIF up to 22 MB. Or press{' '}
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-mist-300">
              ⌘V
            </kbd>{' '}
            to paste from the clipboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-signal px-6 text-sm font-medium text-ink-950 transition-colors hover:bg-[#c8fa85] disabled:opacity-50"
            >
              {busy ? <Spinner className="border-ink-950/30 border-t-ink-950" /> : <Upload className="h-4 w-4" />}
              {busy ? 'Analyzing…' : 'Choose a file'}
            </button>
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-mist-600">
              never leaves this device
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-mist-500" />
          <p className="mono-label">No image handy? Run a synthetic sample</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SAMPLES.map((sample) => (
            <button
              key={sample.kind}
              type="button"
              onClick={() => loadSample(sample.kind)}
              disabled={busy || loadingSample !== null}
              className="panel panel-hover group p-4 text-left disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-mist-100">{sample.label}</span>
                {loadingSample === sample.kind ? (
                  <Spinner />
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-mist-500 group-hover:text-signal">
                    run
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist-500">
                {sample.description}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-mist-600">
                {sample.expectation}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
