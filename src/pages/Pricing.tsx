import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Info, Minus, X } from 'lucide-react'
import { Badge, Button, ButtonLink, SectionHeading } from '../components/ui'
import { PLANS, type Plan, type PlanId } from '../lib/store'
import { useSession } from '../lib/session'

const comparison = [
  { label: 'Scans per month', free: '10', pro: '500', team: '5,000' },
  { label: 'Five-signal engine', free: true, pro: true, team: true },
  { label: 'Heatmap overlays', free: true, pro: true, team: true },
  { label: 'JSON report export', free: true, pro: true, team: true },
  { label: 'Confidence + caveats', free: true, pro: true, team: true },
  { label: 'Local scan history', free: '12 reports', pro: '12 reports', team: '12 reports' },
  { label: 'Seats', free: '1', pro: '1', team: '5' },
  { label: 'Shared evidence log', free: false, pro: false, team: true },
  { label: 'Audit trail per report', free: false, pro: false, team: true },
  { label: 'Priority support', free: false, pro: true, team: true },
]

const billingFaqs = [
  {
    q: 'Will I be charged?',
    a: 'No. This build has no payment provider connected: checkout is simulated and plans are stored in your browser. Nothing is billed, and switching plans never asks for card details.',
  },
  {
    q: 'Do scans reset monthly?',
    a: 'Quotas are calculated from your local report history for the current calendar month. Deleting reports frees quota immediately.',
  },
  {
    q: 'Can I move a plan between devices?',
    a: 'Accounts live in this browser profile, so plans do not sync. A production deployment would move identity and usage to a server; the storage layer is already isolated behind one module.',
  },
]

function CheckoutModal({
  plan,
  annual,
  onClose,
  onConfirm,
}: {
  plan: Plan
  annual: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="panel relative w-full max-w-md p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-mist-500 hover:bg-white/6 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <Badge className="bg-signal/10 text-signal ring-signal/25">simulated checkout</Badge>
        <h2 className="mt-4 font-display text-xl font-semibold">Activate {plan.name}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mist-400">
          {plan.scans.toLocaleString()} scans per month, billed{' '}
          {annual ? `annually at $${plan.annualPrice * 12}` : `monthly at $${plan.price}`}. No card is
          requested in this build — confirming simply switches the plan on this browser.
        </p>
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-mist-300">{plan.name} · {annual ? 'annual' : 'monthly'}</span>
            <span className="font-mono text-mist-100">
              ${annual ? plan.annualPrice * 12 : plan.price}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] text-mist-500">
            <span>Due today</span>
            <span className="font-mono">$0.00</span>
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={onConfirm}>
          Activate plan <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="mt-3 text-center text-[11px] text-mist-600">
          Billing is disabled in this environment.
        </p>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
  const [checkout, setCheckout] = useState<Plan | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { user, setPlan } = useSession()
  const navigate = useNavigate()

  const choose = (plan: Plan) => {
    if (!user) {
      navigate('/auth?next=/pricing')
      return
    }
    if (plan.id === 'free') {
      setPlan('free')
      setToast('Switched to the Analyst plan.')
      return
    }
    setCheckout(plan)
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8">
      <SectionHeading
        align="center"
        eyebrow="Pricing"
        title="Priced per desk, not per panic."
        description="Every plan runs the full engine locally. You pay for volume, seats and the audit trail — never for access to a verdict."
      />

      <div className="mt-9 flex items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1">
          {[
            { id: 'monthly', label: 'Monthly' },
            { id: 'annual', label: 'Annual · save 17%' },
          ].map((option) => {
            const active = (option.id === 'annual') === annual
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setAnnual(option.id === 'annual')}
                className={`rounded-full px-4 py-1.5 text-[12.5px] transition-colors ${
                  active ? 'bg-signal text-ink-950' : 'text-mist-400 hover:text-mist-100'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {toast && (
        <div className="mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-xl border border-signal/25 bg-signal/[0.06] px-4 py-3">
          <p className="text-[12.5px] text-mist-100">{toast}</p>
          <button type="button" onClick={() => setToast(null)} className="text-[11px] text-mist-400">
            close
          </button>
        </div>
      )}

      <div className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.price
          const current = (user?.plan ?? 'free') === plan.id
          return (
            <div
              key={plan.id}
              className={`panel relative flex flex-col p-6 ${
                plan.id === 'pro' ? 'border-signal/35 bg-signal/[0.03] lg:-mt-3 lg:pb-8' : ''
              }`}
            >
              {plan.id === 'pro' && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-signal px-2.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-widest text-ink-950">
                  most picked
                </span>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-mist-200">{plan.name}</p>
                {current && (
                  <Badge className="bg-white/8 text-mist-200 ring-white/15">current</Badge>
                )}
              </div>
              <div className="mt-4 flex items-end gap-1.5">
                <span className="font-display text-[2.6rem] font-semibold leading-none text-mist-50">
                  ${price}
                </span>
                <span className="mb-1 text-[12px] text-mist-500">
                  / mo{annual && price > 0 ? ', billed yearly' : ''}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-mist-500">{plan.tagline}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[12.5px] text-mist-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.id === 'pro' ? 'primary' : 'outline'}
                className="mt-7 w-full"
                onClick={() => choose(plan)}
                disabled={current}
              >
                {current ? 'Your current plan' : plan.id === 'free' ? 'Downgrade' : `Choose ${plan.name}`}
              </Button>
            </div>
          )
        })}
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-mist-600">
        <Info className="h-3.5 w-3.5" />
        Checkout is simulated in this build; no payment method is collected or charged.
      </p>

      <div className="mt-20">
        <h2 className="font-display text-2xl font-semibold">Compare plans</h2>
        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-5 py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-mist-500">
                  Feature
                </th>
                {PLANS.map((plan) => (
                  <th key={plan.id} className="px-5 py-4 text-[12.5px] font-medium text-mist-200">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.label} className="border-b border-white/5 last:border-none">
                  <td className="px-5 py-3.5 text-[12.5px] text-mist-400">{row.label}</td>
                  {(['free', 'pro', 'team'] as PlanId[]).map((tier) => {
                    const value = row[tier]
                    return (
                      <td key={tier} className="px-5 py-3.5 text-[12.5px] text-mist-200">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="h-4 w-4 text-signal" />
                          ) : (
                            <Minus className="h-4 w-4 text-mist-700" />
                          )
                        ) : (
                          value
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-20 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading eyebrow="Billing FAQ" title="The fine print, plainly." />
        <div className="divide-y divide-white/8 border-y border-white/8">
          {billingFaqs.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-[14px] text-mist-100">{item.q}</span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 text-mist-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2.5 pr-8 text-[12.5px] leading-relaxed text-mist-400">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-6 sm:flex-row">
        <div>
          <p className="text-[14px] text-mist-100">Not sure which tier fits?</p>
          <p className="mt-1 text-[12.5px] text-mist-500">
            Start on Analyst — you can switch plans from the dashboard at any time.
          </p>
        </div>
        <ButtonLink to="/analyze" variant="outline">
          Run a free scan <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </div>

      {checkout && (
        <CheckoutModal
          plan={checkout}
          annual={annual}
          onClose={() => setCheckout(null)}
          onConfirm={() => {
            setPlan(checkout.id)
            setToast(`${checkout.name} activated — ${checkout.scans.toLocaleString()} scans per month.`)
            setCheckout(null)
          }}
        />
      )}
    </div>
  )
}
