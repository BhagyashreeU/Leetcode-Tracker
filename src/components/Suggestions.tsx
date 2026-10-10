import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import { PREMIUM } from '../lib/curated'
import { activeList, LIST_NAMES, newSolvedToday, suggestProblems, type ListProgress, type Suggestion } from '../lib/suggest'
import { topicLabel } from '../lib/topics'
import { DifficultyBadge, ErrorNote } from './ui'

/** Today's new problems, below the review queue. */
export function Suggestions() {
  const { tracked, deferred, today, suggestionData, suggestionsError } = useTracker()
  const [extra, setExtra] = useState(0)
  const [showWhileBusy, setShowWhileBusy] = useState(false)

  const view = useMemo(() => {
    if (!suggestionData) return null
    const problems = tracked.map((t) => t.problem)
    const list = activeList(suggestionData.catalog, new Set(problems.map((p) => p.id)))
    const solvedToday = newSolvedToday(suggestionData.reviews, today)
    const count = Math.max(0, suggestionData.dailyNewTarget - solvedToday) + extra
    const picks = suggestProblems({ ...suggestionData, tracked: problems, today, count })
    return { list, solvedToday, picks }
  }, [suggestionData, tracked, today, extra])

  if (suggestionsError) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">New problems</h2>
        <ErrorNote message={`Couldn't load suggestions: ${suggestionsError}`} />
        <p className="text-sm text-slate-500">
          If you haven't yet, run the two setup files for suggestions in the Supabase SQL Editor (see the README).
        </p>
      </section>
    )
  }
  if (!view) return null

  const { list, solvedToday, picks } = view

  if (list.total === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">New problems</h2>
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          The Blind 75 and NeetCode 150 lists aren't loaded yet. Run <code>supabase/seed.sql</code> in the Supabase SQL
          Editor (see the README), then reload this page.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">New problems</h2>
        <ListMeter list={list} />
      </header>

      {list.phase === 'done' ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          You've solved all of NeetCode 150. Keep up the reviews, or log any other problem you want to remember.
        </p>
      ) : deferred > 0 && !showWhileBusy ? (
        <p className="text-sm text-slate-500">
          New problems are paused while reviews pile up. Clear today's reviews first, or{' '}
          <button onClick={() => setShowWhileBusy(true)} className="font-medium text-slate-900 underline">
            show them anyway
          </button>
          .
        </p>
      ) : (
        <>
          {solvedToday > 0 && picks.length === 0 && (
            <p className="text-sm text-slate-600">
              You solved {solvedToday} new {solvedToday === 1 ? 'problem' : 'problems'} today. That's your goal.{' '}
              <button onClick={() => setExtra((n) => n + 1)} className="font-medium text-slate-900 underline">
                Suggest another
              </button>
            </p>
          )}
          {picks.length > 0 && (
            <ul className="space-y-3">
              {picks.map((s) => (
                <SuggestionCard key={s.problem.id} suggestion={s} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function ListMeter({ list }: { list: ListProgress }) {
  return (
    <span className="flex items-center gap-2 text-sm text-slate-500">
      {LIST_NAMES[list.phase]}: {list.solved}/{list.total}
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <span className="block h-full rounded-full bg-sky-500" style={{ width: `${(list.solved / list.total) * 100}%` }} />
      </span>
    </span>
  )
}

function reasonText({ reason, topic }: Suggestion): string {
  const name = topicLabel(topic.topic)
  if (reason === 'new') return `New topic: ${name}`
  return `Weak spot: ${name} · ${topic.solved}/${topic.total} solved${topic.success === null ? '' : `, ${Math.round(topic.success * 100)}% clean`}`
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const { today, reload } = useTracker()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { problem } = suggestion

  async function skip() {
    setBusy(true)
    setError(null)
    try {
      await store.skipSuggestion(problem.id, today)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5" aria-busy={busy}>
      <h3 className="font-semibold text-slate-900">{problem.title}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <DifficultyBadge difficulty={problem.difficulty} />
        <span className="text-slate-500">{reasonText(suggestion)}</span>
        {PREMIUM.has(problem.slug) && <span className="text-amber-700">· LeetCode Premium</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Solve on LeetCode <span aria-hidden>↗</span>
        </a>
        <Link
          to={`/log?problem=${problem.slug}`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Log it
        </Link>
        <button
          onClick={skip}
          disabled={busy}
          title="Show other problems first for a week"
          className="ml-auto px-2 py-2 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
      <ErrorNote message={error} />
    </li>
  )
}
