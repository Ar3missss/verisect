import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AnalysisResult } from './forensics/types'
import {
  getCurrentUser,
  getHistory,
  planById,
  remainingScans,
  setPlan as persistPlan,
  signIn as persistSignIn,
  signOut as persistSignOut,
  signUp as persistSignUp,
  type PlanId,
  type User,
} from './store'

interface SessionValue {
  user: User | null
  plan: ReturnType<typeof planById>
  remaining: number
  signIn: (email: string, password: string) => Promise<User>
  signUp: (name: string, email: string, password: string) => Promise<User>
  signOut: () => void
  setPlan: (plan: PlanId) => void
  refresh: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCurrentUser())
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    setUser(getCurrentUser())
    setTick((value) => value + 1)
  }, [])

  const value = useMemo<SessionValue>(() => {
    void tick
    const plan = planById(user?.plan ?? 'free')
    return {
      user,
      plan,
      remaining: remainingScans(user),
      signIn: async (email, password) => {
        const next = await persistSignIn(email, password)
        setUser(next)
        return next
      },
      signUp: async (name, email, password) => {
        const next = await persistSignUp(name, email, password)
        setUser(next)
        return next
      },
      signOut: () => {
        persistSignOut()
        setUser(null)
      },
      setPlan: (planId) => {
        const next = persistPlan(planId)
        setUser(next)
      },
      refresh,
    }
  }, [user, tick, refresh])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside SessionProvider')
  return context
}

export function useScanHistory() {
  const { user } = useSession()
  const [history, setHistory] = useState<AnalysisResult[]>(() => getHistory(user?.id))
  const reload = useCallback(() => setHistory(getHistory(user?.id)), [user?.id])
  useEffect(() => {
    setHistory(getHistory(user?.id))
  }, [user?.id])
  return { history, reload, setHistory }
}
