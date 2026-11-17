import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, Menu, ScanLine, X } from 'lucide-react'
import { Logo } from './Logo'
import { ButtonLink, buttonClass } from './ui'
import { useSession } from '../lib/session'

const links = [
  { to: '/analyze', label: 'Analyzer' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
  { to: '/#signals', label: 'Signals' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const { user, remaining, signOut } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!menu) return
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menu])

  const initials = user
    ? (user.name || user.email)
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : ''

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) =>
              link.to.includes('#') ? (
                <a
                  key={link.to}
                  href={link.to}
                  className="rounded-full px-3.5 py-2 text-[13.5px] text-mist-400 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-full px-3.5 py-2 text-[13.5px] transition-colors ${
                      isActive ? 'text-white' : 'text-mist-400 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ),
            )}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-[11.5px] text-mist-300 lg:inline-flex">
                <ScanLine className="h-3.5 w-3.5 text-signal" />
                {remaining} scans left
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenu((value) => !value)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 py-1 pl-1 pr-2.5 transition-colors hover:border-white/20"
                  aria-expanded={menu}
                  aria-haspopup="menu"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-signal/15 font-mono text-[11px] font-semibold text-signal">
                    {initials}
                  </span>
                  <span className="max-w-28 truncate text-[13px] text-mist-200">{user.name}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-mist-500 transition-transform ${menu ? 'rotate-180' : ''}`} />
                </button>
                {menu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl shadow-black/60"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-[13px] text-mist-100">{user.email}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-widest text-mist-500">
                        {user.plan} plan
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-mist-300 hover:bg-white/6 hover:text-white"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        signOut()
                        navigate('/')
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-mist-300 hover:bg-white/6 hover:text-white"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                )}
              </div>
              <ButtonLink to="/analyze" size="sm" className="gap-1.5">
                New scan
              </ButtonLink>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="rounded-full px-3.5 py-2 text-[13.5px] text-mist-300 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <ButtonLink to="/analyze" size="sm">
                Run a free scan
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-mist-300 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-ink-950/98 px-5 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) =>
              link.to.includes('#') ? (
                <a
                  key={link.to}
                  href={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-mist-300 hover:bg-white/5"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-lg px-3 py-2.5 text-sm text-mist-300 hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ),
            )}
            {user && (
              <Link to="/dashboard" className="rounded-lg px-3 py-2.5 text-sm text-mist-300 hover:bg-white/5">
                Dashboard
              </Link>
            )}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {user ? (
              <>
                <ButtonLink to="/analyze" size="md" className="w-full">
                  New scan · {remaining} left
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => {
                    signOut()
                    navigate('/')
                    setOpen(false)
                  }}
                  className={buttonClass('outline', 'md', 'w-full')}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <ButtonLink to="/analyze" size="md" className="w-full">
                  Run a free scan
                </ButtonLink>
                <ButtonLink to="/auth" variant="outline" size="md" className="w-full">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
