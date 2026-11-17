import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, Field, Spinner, inputClass } from '../components/ui'
import { LogoMark } from '../components/Logo'
import { useSession } from '../lib/session'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { signIn, signUp } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') await signUp(name, email, password)
      else await signIn(email, password)
      navigate(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const demo = async () => {
    setError(null)
    setBusy(true)
    try {
      try {
        await signIn('demo@verisect.app', 'verisect-demo')
      } catch {
        await signUp('Demo Analyst', 'demo@verisect.app', 'verisect-demo')
      }
      navigate(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the demo account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-lg font-semibold">Verisect</span>
        </Link>

        <h1 className="mt-8 font-display text-3xl font-semibold leading-tight">
          {mode === 'signin' ? 'Welcome back to the lab.' : 'Create your analyst account.'}
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist-400">
          {mode === 'signin'
            ? 'Your reports and quota live in this browser profile.'
            : 'Free plan includes 10 scans a month and the full signal stack.'}
        </p>

        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(['signin', 'signup'] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option)
                setError(null)
              }}
              className={`rounded-full px-4 py-1.5 text-[12.5px] transition-colors ${
                mode === option ? 'bg-signal text-ink-950' : 'text-mist-400 hover:text-mist-100'
              }`}
            >
              {option === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <Field label="Name">
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Rivera"
                autoComplete="name"
                required
              />
            </Field>
          )}
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@newsroom.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field
            label="Password"
            hint={mode === 'signup' ? 'At least 8 characters. Hashed with PBKDF2 in this browser.' : undefined}
          >
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-rose-400/25 bg-rose-400/[0.07] px-3 py-2.5 text-[12.5px] text-rose-200">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Spinner className="border-ink-950/30 border-t-ink-950" /> : null}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/8" />
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-600">or</span>
          <span className="h-px flex-1 bg-white/8" />
        </div>

        <Button variant="outline" className="w-full" onClick={demo} disabled={busy}>
          <Sparkles className="h-4 w-4 text-signal" />
          Explore with a demo account
        </Button>

        <p className="mt-6 flex items-start gap-2 text-[11.5px] leading-relaxed text-mist-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This build keeps accounts, plans and reports in local storage. No email is sent and no
          data reaches a server. Clearing site data removes the account.
        </p>

        <p className="mt-4 text-[11.5px] text-mist-600">
          Prefer not to sign up?{' '}
          <Link to="/analyze" className="text-signal hover:underline">
            Scan without an account
          </Link>
          .
        </p>
      </div>

      <div className="hidden lg:block">
        <div className="panel relative overflow-hidden p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-signal/10 blur-3xl" />
          <ShieldCheck className="h-8 w-8 text-signal" />
          <h2 className="mt-6 font-display text-2xl font-semibold leading-snug">
            Ten free scans a month,
            <br />
            five forensic signals each.
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-400">
            No credit card, no upload. The analyzer runs on your machine and the report stays on it.
          </p>

          <div className="mt-8 space-y-3">
            {[
              ['Error level analysis', '26%'],
              ['Copy-move detection', '26%'],
              ['Sensor noise profile', '22%'],
              ['Metadata provenance', '20%'],
              ['Compression integrity', '8%'],
            ].map(([label, weight]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex-1 text-[12.5px] text-mist-300">{label}</span>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-signal/70" style={{ width: weight }} />
                </div>
                <span className="w-9 text-right font-mono text-[10.5px] text-mist-500">{weight}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-white/8 bg-ink-950/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-mist-500">
              Typical scan
            </p>
            <p className="mt-1.5 font-mono text-[13px] text-mist-200">
              1,240 ms · 5 signals · 0 bytes uploaded
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
