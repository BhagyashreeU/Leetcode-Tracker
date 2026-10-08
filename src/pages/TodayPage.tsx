import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, RatingButtons, TopicTags } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { TrackedProblem } from '../data/types'
import { daysBetween, formatDay } from '../lib/dates'
import type { Rating } from '../lib/schedule'

export function TodayPage() {
  const { due, deferred, tracked, loading, error } = useTracker()
  const [lastResult, setLastResult] = useState<string | null>(null)

  if (loading) return <p className="text-slate-500">Loading…</p>

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Due today</h1>
        <span className="text-sm text-slate-500">{due.length} to review</span>
      </header>
      <ErrorNote message={error} />
      {lastResult && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">{lastResult}</p>}

      {due.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {tracked.length === 0 ? (
            <>
              Nothing tracked yet.{' '}
              <Link to="/log" className="font-medium text-sky-700 underline">
                Log a problem you solved
              </Link>
              .
            </>
          ) : (
            'All caught up. Nothing is due today.'
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {due.map((item) => (
            <DueCard key={item.problem.id} item={item} onDone={setLastResult} />
          ))}
        </ul>
      )}

      {deferred > 0 && (
        <p className="text-sm text-slate-500">
          {deferred} more due, rolled to tomorrow to stay under your daily cap.
        </p>
      )}
    </section>
  )
}

function DueCard({ item, onDone }: { item: TrackedProblem; onDone: (message: string) => void }) {
  const { today, reload } = useTracker()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overdue = daysBetween(item.nextReviewOn!, today)

  async function rate(rating: Rating) {
    setSaving(true)
    setError(null)
    try {
      const next = await store.recordAttempt({ problemId: item.problem.id, rating }, today)
      onDone(
        next.nextReviewOn
          ? `${item.problem.title}: next review ${formatDay(next.nextReviewOn)}.`
          : `${item.problem.title}: mastered. It leaves the queue.`,
      )
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <a href={item.problem.url} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:underline">
          {item.problem.title}
        </a>
        <DifficultyBadge difficulty={item.problem.difficulty} />
        {overdue > 0 && <span className="text-xs font-medium text-rose-600">{overdue}d overdue</span>}
        {item.status === 'mastered' && <span className="text-xs text-slate-500">60-day check-in</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <TopicTags topics={item.problem.topics} />
        <span>
          Reviewed {item.timesReviewed}× · {item.lapses} lapses
        </span>
      </div>
      {item.notes && (
        // Collapsed so the notes don't give the answer away before the re-solve.
        <details className="mt-2 text-sm text-slate-600">
          <summary className="cursor-pointer text-xs text-slate-500">Show my notes</summary>
          <p className="mt-1 whitespace-pre-wrap">{item.notes}</p>
        </details>
      )}
      <p className="mt-3 mb-1.5 text-xs text-slate-500">Re-solve it, then rate how it went:</p>
      <RatingButtons prev={item} today={today} disabled={saving} onRate={rate} />
      <ErrorNote message={error} />
    </li>
  )
}
