import { Link } from 'react-router-dom'

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#d6ff9a" />
          <stop offset="100%" stopColor="#7fd3a3" />
        </linearGradient>
      </defs>
      <path
        d="M16 3.5 27 8v9.1c0 5.9-4.7 10-11 13.4C9.7 27.1 5 23 5 17.1V8L16 3.5Z"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="1.8"
      />
      <path
        d="M10.8 16.2 14.6 20l6.6-7.6"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Verisect home"
    >
      <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:scale-105" />
      <span className="font-display text-[17px] font-semibold tracking-tight text-mist-50">
        Verisect
      </span>
    </Link>
  )
}
