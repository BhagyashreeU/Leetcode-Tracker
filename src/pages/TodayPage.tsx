import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, Notice, RatingButtons, TopicTags } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { TrackedProblem } from '../data/types'
import { daysBetween, formatDay, formatLongDay, overdueLabel } from '../lib/dates'
import { INTERVALS, RATINGS, type Rating } from '../lib/schedule'

export function TodayPage() {
  const { due, deferred, doneToday, tracked, today, loading, error } = useTracker()
  const [lastResult, setLastResult] = useState<string | null>(null)

  if (loading) return <p className="text-slate-500">Loading…</p>

  const total = doneToday + due.length

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">
          {formatLongDay(today)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Today</h1>
      </header>

      <ErrorNote message={error} />

      {total > 0 && <DailyProgress done={doneToday} total={total} />}
      {lastResult && <Notice tone="success">{lastResult}</Notice>}

      {due.length > 0 ? (
        <ol className="space-y-3">
          {due.map((item, i) => (
            <DueCard key={item.problem.id} item={item} isNext={i === 0} onDone={setLastResult} />
          ))}
        </ol>
      ) : tracked.length === 0 ? (
        <FirstRun />
      ) : (
        <CaughtUp />
      )}

      {deferred > 0 && (
        <p className="text-sm text-slate-500">
          {deferred} more {deferred === 1 ? 'review moves' : 'reviews move'} to tomorrow to keep today manageable.
        </p>
      )}
    </section>
  )
}

function DailyProgress({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100)
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-900">
          {done === total ? 'All reviews done' : `${total - done} ${total - done === 1 ? 'review' : 'reviews'} left`}
        </span>
        <span className="text-slate-500">
          {done} of {total} done
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Five dots, one per step in the 1/3/7/14/30-day schedule. */
function StepDots({ step, mastered }: { step: number; mastered: boolean }) {
  return (
    <span className="flex items-center gap-1" title={`Step ${step + 1} of ${INTERVALS.length}`}>
      {INTERVALS.map((days, i) => (
        <span
          key={days}
          className={`h-1.5 w-1.5 rounded-full ${mastered || i <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
        />
      ))}
      <span className="sr-only">
        Step {step + 1} of {INTERVALS.length}
      </span>
    </span>
  )
}

function DueCard({ item, isNext, onDone }: { item: TrackedProblem; isNext: boolean; onDone: (message: string) => void }) {
  const { today, reload } = useTracker()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overdue = daysBetween(item.nextReviewOn!, today) > 0

  async function rate(rating: Rating) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const next = await store.recordAttempt({ problemId: item.problem.id, rating }, today)
      if (!next.nextReviewOn) onDone(`${item.problem.title} is mastered and leaves your queue.`)
      else {
        const days = daysBetween(today, next.nextReviewOn)
        onDone(
          `${item.problem.title} comes back ${days === 1 ? 'tomorrow' : `in ${days} days`}, on ${formatDay(next.nextReviewOn)}.`,
        )
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  // Keys 1-4 rate the top card, unless the user is typing somewhere.
  useEffect(() => {
    if (!isNext) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest('input, textarea, select')) return
      const rating = RATINGS[Number(e.key) - 1]
      if (rating) void rate(rating)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <li
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 sm:p-5 ${isNext ? 'ring-slate-300' : 'ring-slate-200'}`}
      aria-busy={saving}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{item.problem.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <DifficultyBadge difficulty={item.problem.difficulty} />
            <span className={overdue ? 'font-medium text-rose-600' : 'text-slate-500'}>
              {item.status === 'mastered' ? '60-day check-in' : overdueLabel(item.nextReviewOn!, today)}
            </span>
            {item.lapses > 0 && (
              <span className="text-slate-500">
                · forgot {item.lapses}× before
              </span>
            )}
          </div>
        </div>
        <StepDots step={item.step} mastered={item.status === 'mastered'} />
      </div>

      {item.problem.topics.length > 0 && (
        <div className="mt-2">
          <TopicTags topics={item.problem.topics} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={item.problem.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Solve on LeetCode <span aria-hidden>↗</span>
        </a>
        {item.notes && (
          // Collapsed so the notes don't give the answer away before the re-solve.
          <details className="text-sm text-slate-600">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-800">Peek at my notes</summary>
            <p className="mt-2 rounded-lg bg-slate-50 p-3 whitespace-pre-wrap">{item.notes}</p>
          </details>
        )}
      </div>

      <p className="mt-4 mb-2 text-sm font-medium text-slate-700">How did it go?</p>
      <RatingButtons prev={item} today={today} disabled={saving} shortcuts={isNext} onRate={rate} />
      <ErrorNote message={error} />
    </li>
  )
}

function FirstRun() {
  const steps = [
    ['Solve a problem on LeetCode', 'Any problem you want to remember.'],
    ['Log it here', 'Paste the link and say how it felt.'],
    ['Re-solve it when it comes back', `Reviews come after ${INTERVALS.join(', ')} days, adjusted by how each one goes.`],
  ]
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">Remember what you solve</h2>
      <p className="mt-1 text-sm text-slate-600">Spaced repetition brings problems back right before you'd forget them.</p>
      <ol className="mt-5 space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">{title}</p>
              <p className="text-sm text-slate-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        to="/log"
        className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Log your first problem
      </Link>
    </div>
  )
}

function CaughtUp() {
  const { upcoming, today } = useTracker()
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
        <p className="text-lg font-semibold text-slate-900">You're all caught up</p>
        <p className="mt-1 text-sm text-slate-500">Nothing else is due today. Solve something new?</p>
        <Link
          to="/log"
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Log a problem
        </Link>
      </div>
      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-700">Coming up</h2>
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
            {upcoming.map((t) => {
              const days = daysBetween(today, t.nextReviewOn!)
              return (
                <li key={t.problem.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="truncate text-slate-900">{t.problem.title}</span>
                  <span className="shrink-0 text-slate-500">
                    {days === 1 ? 'Tomorrow' : `${formatDay(t.nextReviewOn!)} · in ${days} days`}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
