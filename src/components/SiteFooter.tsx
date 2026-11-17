import { Link } from 'react-router-dom'
import { Logo } from './Logo'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Analyzer', to: '/analyze' },
      { label: 'Forensic signals', to: '/#signals' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How it works', to: '/#how' },
      { label: 'Docs & limits', to: '/docs' },
      { label: 'FAQ', to: '/#faq' },
      { label: 'Method notes', to: '/docs#method' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/docs#about' },
      { label: 'Security', to: '/docs#privacy' },
      { label: 'Status', to: '/docs#limits' },
      { label: 'Contact', to: '/docs#contact' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-mist-500">
              Verisect is an image-forensics workspace for people who have to answer one question:
              <span className="text-mist-300"> was this picture altered?</span>
            </p>
            <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-500">
              Analysis runs in your browser · No upload storage
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="mono-label text-mist-400">{column.title}</p>
                <ul className="mt-3.5 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-[13px] text-mist-500 transition-colors hover:text-mist-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/6 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-mist-500">
            © {new Date().getFullYear()} Verisect Labs. Forensic output is probabilistic — not legal
            proof.
          </p>
          <div className="flex items-center gap-5 text-[12px] text-mist-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              All systems nominal
            </span>
            <Link to="/docs#privacy" className="hover:text-mist-200">
              Privacy
            </Link>
            <Link to="/docs#limits" className="hover:text-mist-200">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
