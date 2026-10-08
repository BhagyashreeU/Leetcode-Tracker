import type { Difficulty } from '../data/types'
import type { ReactNode } from 'react'
import { daysBetween } from '../lib/dates'
import { RATINGS, scheduleAttempt, type Rating, type ScheduleState, type Status } from '../lib/schedule'
import { topicLabel } from '../lib/topics'

const difficultyStyles: Record<Difficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  hard: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${difficultyStyles[difficulty]}`}>
      {difficulty}
    </span>
  )
}

export function TopicTags({ topics }: { topics: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {topics.map((t) => (
        <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
          {topicLabel(t)}
        </span>
      ))}
    </span>
  )
}

const ratingLabels: Record<Rating, { label: string; hint: string; style: string; active: string }> = {
  again: { label: 'Again', hint: "Couldn't solve it", style: 'border-rose-200 text-rose-700 hover:bg-rose-50', active: 'bg-rose-600 border-rose-600 text-white hover:bg-rose-600' },
  hard: { label: 'Hard', hint: 'Slow or shaky', style: 'border-amber-200 text-amber-700 hover:bg-amber-50', active: 'bg-amber-500 border-amber-500 text-white hover:bg-amber-500' },
  good: { label: 'Good', hint: 'Solved cleanly', style: 'border-sky-200 text-sky-700 hover:bg-sky-50', active: 'bg-sky-600 border-sky-600 text-white hover:bg-sky-600' },
  easy: { label: 'Easy', hint: 'Instant', style: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50', active: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600' },
}

function intervalLabel(prev: ScheduleState | null, rating: Rating, today: string): string {
  const next = scheduleAttempt(prev, rating, today)
  if (next.nextReviewOn === null) return 'Done'
  const days = daysBetween(today, next.nextReviewOn)
  if (next.status === 'mastered') return 'Mastered'
  return days === 1 ? 'Tomorrow' : `In ${days} days`
}

/**
 * Again / Hard / Good / Easy. Each shows what it means and when the problem
 * comes back, so the choice doesn't depend on hover tooltips.
 */
export function RatingButtons(props: {
  prev: ScheduleState | null
  today: string
  selected?: Rating | null
  disabled?: boolean
  /** Show 1-4 keyboard hints. */
  shortcuts?: boolean
  onRate: (rating: Rating) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How did it go?">
      {RATINGS.map((r, i) => {
        const { label, hint, style, active } = ratingLabels[r]
        const isActive = props.selected === r
        return (
          <button
            key={r}
            type="button"
            aria-pressed={props.selected !== undefined ? isActive : undefined}
            disabled={props.disabled}
            onClick={() => props.onRate(r)}
            className={`relative rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 ${isActive ? active : `bg-white ${style}`}`}
          >
            <span className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{label}</span>
              {props.shortcuts && <kbd className="hidden text-[10px] opacity-50 sm:inline">{i + 1}</kbd>}
            </span>
            <span className="block text-xs opacity-80">{hint}</span>
            <span className={`mt-1 block text-xs font-medium ${isActive ? '' : 'text-slate-500'}`}>{intervalLabel(props.prev, r, props.today)}</span>
          </button>
        )
      })}
    </div>
  )
}

const statusStyles: Record<Status, string> = {
  learning: 'bg-violet-50 text-violet-700',
  reviewing: 'bg-sky-50 text-sky-700',
  mastered: 'bg-emerald-50 text-emerald-700',
}

export function StatusPill({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}>{status}</span>
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' }) {
  const styles = tone === 'success' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-sky-50 text-sky-900 ring-sky-200'
  return (
    <div role="status" className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${styles}`}>
      {children}
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">
      {message}
    </p>
  )
}
