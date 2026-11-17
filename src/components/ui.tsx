import { Link } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal'

const variants: Record<Variant, string> = {
  primary:
    'bg-signal text-ink-950 hover:bg-[#c8fa85] hover:shadow-[0_12px_40px_-16px_rgba(184,242,107,0.9)] active:translate-y-px',
  outline:
    'border border-white/15 text-mist-100 hover:border-signal/60 hover:text-white hover:bg-white/5',
  ghost: 'text-mist-300 hover:text-white hover:bg-white/5',
  subtle: 'bg-white/8 text-mist-100 hover:bg-white/14 border border-white/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  )
}

export function Badge({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(184,242,107,0.6)]" />
      <span className="mono-label text-mist-300">{children}</span>
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-semibold leading-[1.1] sm:text-[2.6rem]">{title}</h2>
      {description && <p className="mt-4 text-[15px] leading-relaxed text-mist-400">{description}</p>}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium tracking-wide text-mist-300">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] text-mist-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-900/80 px-3.5 py-2.5 text-sm text-mist-100 placeholder:text-mist-500 transition-colors focus:border-signal/60 focus:bg-ink-900 focus:outline-none'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-signal ${className}`}
      aria-hidden="true"
    />
  )
}
