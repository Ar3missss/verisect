import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { ButtonLink } from './components/ui'
import Landing from './pages/Landing'
import AnalyzePage from './pages/Analyze'
import PricingPage from './pages/Pricing'
import DashboardPage from './pages/Dashboard'
import AuthPage from './pages/Auth'
import DocsPage from './pages/Docs'

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-28 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mist-500">404</p>
      <h1 className="mt-4 font-display text-4xl font-semibold">This frame doesn&rsquo;t exist.</h1>
      <p className="mt-3 text-[13.5px] text-mist-400">
        The page you were looking for is not in the evidence log.
      </p>
      <div className="mt-7 flex gap-3">
        <ButtonLink to="/" variant="primary">
          <ArrowLeft className="h-4 w-4" /> Back home
        </ButtonLink>
        <ButtonLink to="/analyze" variant="outline">
          Open the analyzer
        </ButtonLink>
      </div>
      <Link to="/docs" className="mt-6 text-[12px] text-mist-500 hover:text-mist-200">
        or read the docs
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ScrollManager />
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  )
}
