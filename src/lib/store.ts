import type { AnalysisResult } from './forensics/types'

export type PlanId = 'free' | 'pro' | 'team'

export interface User {
  id: string
  name: string
  email: string
  plan: PlanId
  createdAt: number
}

export interface Session {
  userId: string
  signedInAt: number
}

interface AccountRecord extends User {
  salt: string
  hash: string
}

export interface Plan {
  id: PlanId
  name: string
  price: number
  annualPrice: number
  scans: number
  seats: number
  tagline: string
  features: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Analyst',
    price: 0,
    annualPrice: 0,
    scans: 10,
    seats: 1,
    tagline: 'For the occasional gut-check.',
    features: [
      '10 scans per month',
      'All five forensic signals',
      'Heatmap overlays',
      'JSON report export',
      'Local scan history',
    ],
  },
  {
    id: 'pro',
    name: 'Investigator',
    price: 29,
    annualPrice: 24,
    scans: 500,
    seats: 1,
    tagline: 'For editors, fact-checkers and claims teams.',
    features: [
      '500 scans per month',
      'Confidence scoring and caveats',
      'Batch-ready report export',
      'Full metadata dump',
      'Priority support',
    ],
  },
  {
    id: 'team',
    name: 'Newsroom',
    price: 89,
    annualPrice: 74,
    scans: 5000,
    seats: 5,
    tagline: 'For verification desks and legal teams.',
    features: [
      '5,000 scans per month',
      '5 seats included',
      'Shared evidence log',
      'Audit trail per report',
      'Dedicated onboarding',
    ],
  },
]

export const planById = (id: PlanId): Plan => PLANS.find((plan) => plan.id === id) ?? PLANS[0]

const USERS_KEY = 'verisect.users'
const SESSION_KEY = 'verisect.session'
const HISTORY_PREFIX = 'verisect.scans.'
const MAX_HISTORY = 12

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 120_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return toBase64(bits)
}

function newSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toBase64(bytes.buffer)
}

const users = () => read<AccountRecord[]>(USERS_KEY, [])

export function getSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null)
}

export function getCurrentUser(): User | null {
  const session = getSession()
  if (!session) return null
  const account = users().find((user) => user.id === session.userId)
  if (!account) return null
  const { salt: _salt, hash: _hash, ...user } = account
  return user
}

export async function signUp(name: string, email: string, password: string): Promise<User> {
  const normalised = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) {
    throw new Error('Enter a valid email address.')
  }
  if (password.length < 8) throw new Error('Passwords need at least 8 characters.')
  const existing = users()
  if (existing.some((user) => user.email === normalised)) {
    throw new Error('An account with that email already exists in this browser.')
  }
  const salt = newSalt()
  const hash = await hashPassword(password, salt)
  const account: AccountRecord = {
    id: crypto.randomUUID?.() ?? `usr_${Date.now()}`,
    name: name.trim() || normalised.split('@')[0],
    email: normalised,
    plan: 'free',
    createdAt: Date.now(),
    salt,
    hash,
  }
  write(USERS_KEY, [...existing, account])
  write(SESSION_KEY, { userId: account.id, signedInAt: Date.now() })
  const { salt: _salt, hash: _hash, ...user } = account
  return user
}

export async function signIn(email: string, password: string): Promise<User> {
  const normalised = email.trim().toLowerCase()
  const account = users().find((user) => user.email === normalised)
  if (!account) throw new Error('No account with that email in this browser.')
  const hash = await hashPassword(password, account.salt)
  if (hash !== account.hash) throw new Error('That password does not match.')
  write(SESSION_KEY, { userId: account.id, signedInAt: Date.now() })
  const { salt: _salt, hash: _hash, ...user } = account
  return user
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function setPlan(plan: PlanId): User | null {
  const session = getSession()
  if (!session) return null
  const next = users().map((user) => (user.id === session.userId ? { ...user, plan } : user))
  write(USERS_KEY, next)
  return getCurrentUser()
}

const historyKey = (userId?: string | null) => `${HISTORY_PREFIX}${userId ?? 'guest'}`

export function getHistory(userId?: string | null): AnalysisResult[] {
  return read<AnalysisResult[]>(historyKey(userId), []).sort((a, b) => b.createdAt - a.createdAt)
}

export function saveScan(result: AnalysisResult, userId?: string | null): void {
  const key = historyKey(userId)
  const stored: AnalysisResult = {
    ...result,
    // Keep history light: a compact preview replaces the full-resolution frame.
    previewUrl: result.thumb,
  }
  const list = [stored, ...getHistory(userId)].slice(0, MAX_HISTORY)
  if (!write(key, list)) {
    // Quota exceeded — drop the oldest half and retry once.
    write(key, list.slice(0, Math.max(1, Math.floor(list.length / 2))))
  }
}

export function deleteScan(id: string, userId?: string | null): AnalysisResult[] {
  const key = historyKey(userId)
  const list = getHistory(userId).filter((scan) => scan.id !== id)
  write(key, list)
  return list
}

export function clearHistory(userId?: string | null): void {
  write(historyKey(userId), [])
}

export function monthlyUsage(userId?: string | null): number {
  const now = new Date()
  return getHistory(userId).filter((scan) => {
    const date = new Date(scan.createdAt)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
}

export function remainingScans(user: User | null): number {
  const plan = planById(user?.plan ?? 'free')
  return Math.max(0, plan.scans - monthlyUsage(user?.id))
}
