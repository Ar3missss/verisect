export { formatBytes } from './forensics/utils'

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const verdictMeta = {
  authentic: {
    label: 'No manipulation found',
    short: 'Authentic',
    tone: 'text-emerald-300',
    chip: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
    bar: 'bg-emerald-400',
  },
  suspect: {
    label: 'Needs human review',
    short: 'Suspect',
    tone: 'text-amber-300',
    chip: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
    bar: 'bg-amber-400',
  },
  tampered: {
    label: 'Manipulation detected',
    short: 'Manipulated',
    tone: 'text-rose-300',
    chip: 'bg-rose-400/10 text-rose-300 ring-rose-400/30',
    bar: 'bg-rose-400',
  },
} as const
