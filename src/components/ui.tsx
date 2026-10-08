import type { Difficulty } from '../data/types'
import { daysBetween } from '../lib/dates'
import { RATINGS, scheduleAttempt, type Rating, type ScheduleState } from '../lib/schedule'
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

const ratingLabels: Record<Rating, { label: string; hint: string; style: string }> = {
  again: { label: 'Again', hint: "Couldn't solve it", style: 'border-rose-300 text-rose-700 hover:bg-rose-50' },
  hard: { label: 'Hard', hint: 'Solved, slow or shaky', style: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  good: { label: 'Good', hint: 'Solved cleanly', style: 'border-sky-300 text-sky-700 hover:bg-sky-50' },
  easy: { label: 'Easy', hint: 'Instant', style: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
}

function intervalLabel(prev: ScheduleState | null, rating: Rating, today: string): string {
  const next = scheduleAttempt(prev, rating, today)
  if (next.nextReviewOn === null) return 'done'
  const days = daysBetween(today, next.nextReviewOn)
  return `${days}d`
}

/** Again / Hard / Good / Easy, each showing when the problem would come back. */
export function RatingButtons(props: {
  prev: ScheduleState | null
  today: string
  selected?: Rating | null
  disabled?: boolean
  onRate: (rating: Rating) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((r) => {
        const { label, hint, style } = ratingLabels[r]
        const active = props.selected === r
        return (
          <button
            key={r}
            type="button"
            title={hint}
            disabled={props.disabled}
            onClick={() => props.onRate(r)}
            className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition disabled:opacity-50 ${style} ${active ? 'ring-2 ring-current' : ''}`}
          >
            {label}
            <span className="block text-xs font-normal opacity-70">{intervalLabel(props.prev, r, props.today)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>
}
