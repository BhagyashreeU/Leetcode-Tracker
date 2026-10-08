// Dates are plain calendar days ("YYYY-MM-DD") so reviews line up with the
// user's local day, not UTC midnight.

export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(day: string, days: number): string {
  return new Date(toUtc(day) + days * 86_400_000).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

export function formatDay(day: string): string {
  return new Date(toUtc(day)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "Due today", "1 day overdue", "Overdue since Oct 1". */
export function overdueLabel(nextReviewOn: string, today: string): string {
  const days = daysBetween(nextReviewOn, today)
  if (days <= 0) return 'Due today'
  if (days === 1) return '1 day overdue'
  if (days <= 14) return `${days} days overdue`
  return `Overdue since ${formatDay(nextReviewOn)}`
}

export function formatLongDay(day: string): string {
  return new Date(toUtc(day)).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
