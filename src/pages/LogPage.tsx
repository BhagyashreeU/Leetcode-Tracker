import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, Notice, RatingButtons } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { Difficulty, Problem } from '../data/types'
import { daysBetween, formatDay } from '../lib/dates'
import { parseProblemSlug, problemUrl, titleFromSlug } from '../lib/leetcode'
import type { Rating } from '../lib/schedule'
import { TOPICS } from '../lib/topics'

const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none'
const label = 'block text-sm font-medium text-slate-700'

export function LogPage() {
  const { tracked, today, reload } = useTracker()
  const queryRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Problem[]>([])
  const [existing, setExisting] = useState<Problem | null>(null)

  // Used when the problem isn't in the catalog yet.
  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [topics, setTopics] = useState<string[]>([])

  const [rating, setRating] = useState<Rating | null>(null)
  const [minutes, setMinutes] = useState('')
  const [withoutHelp, setWithoutHelp] = useState(true)
  const [notes, setNotes] = useState('')
  const [solutionUrl, setSolutionUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const slug = parseProblemSlug(query)

  // Look the problem up in the catalog as the user types.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const [bySlug, found] = await Promise.all([
        slug ? store.findProblemBySlug(slug) : Promise.resolve(null),
        query.includes('/') ? Promise.resolve([]) : store.searchCatalog(query),
      ])
      if (cancelled) return
      setExisting(bySlug)
      setMatches(found.filter((p) => p.id !== bySlug?.id))
      if (!bySlug && slug) setTitle(titleFromSlug(slug))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, slug])

  const prev = existing ? (tracked.find((t) => t.problem.id === existing.id) ?? null) : null

  function pick(problem: Problem) {
    setQuery(problem.slug)
    setExisting(problem)
    setMatches([])
  }

  function toggleTopic(id: string) {
    setTopics((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]))
  }

  function reset() {
    setQuery('')
    setExisting(null)
    setMatches([])
    setTitle('')
    setDifficulty('medium')
    setTopics([])
    setRating(null)
    setMinutes('')
    setWithoutHelp(true)
    setNotes('')
    setSolutionUrl('')
    queryRef.current?.focus()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!slug || !rating) return
    setSaving(true)
    setError(null)
    try {
      const problem =
        existing ??
        (await store.addProblem({ slug, title: title.trim() || titleFromSlug(slug), url: problemUrl(slug), difficulty, topics }))
      const next = await store.recordAttempt(
        {
          problemId: problem.id,
          rating,
          minutes: minutes ? Number(minutes) : null,
          solvedWithoutHelp: withoutHelp,
          notes: notes || undefined,
          solutionUrl: solutionUrl || undefined,
        },
        today,
      )
      await reload()
      const when = next.nextReviewOn
        ? (() => {
            const days = daysBetween(today, next.nextReviewOn)
            return `${days === 1 ? 'tomorrow' : `in ${days} days`}, on ${formatDay(next.nextReviewOn)}`
          })()
        : null
      setSaved(when ? `Saved ${problem.title}. You'll review it ${when}.` : `Saved ${problem.title}. It's mastered.`)
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const missing = !slug ? 'Add a LeetCode link to save.' : !rating ? 'Pick how it felt to save.' : null

  return (
    <form onSubmit={submit} className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log a problem</h1>
        <p className="mt-1 text-sm text-slate-500">Just solved something? Log it and we'll schedule the first review.</p>
      </header>

      {saved && (
        <Notice tone="success">
          {saved}{' '}
          <Link to="/problems" className="font-medium underline">
            See all problems
          </Link>
        </Notice>
      )}

      <div className="space-y-2">
        <label htmlFor="problem" className={label}>
          Problem
        </label>
        <input
          id="problem"
          ref={queryRef}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSaved(null)
          }}
          placeholder="Paste a LeetCode link, e.g. leetcode.com/problems/two-sum"
          className={input}
          autoComplete="off"
        />

        {matches.length > 0 && !existing && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg bg-white text-sm ring-1 ring-slate-200">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                >
                  {p.title} <DifficultyBadge difficulty={p.difficulty} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && !slug && matches.length === 0 && (
          <p className="text-xs text-slate-500">No match among your problems. Paste the LeetCode link instead.</p>
        )}
      </div>

      {existing && (
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{existing.title}</span>
            <DifficultyBadge difficulty={existing.difficulty} />
          </div>
          {prev && (
            <p className="mt-1 text-sm text-slate-500">
              You're already tracking this.{' '}
              {prev.nextReviewOn ? `It was due ${formatDay(prev.nextReviewOn)}; ` : ''}saving logs a review now.
            </p>
          )}
        </div>
      )}

      {!existing && slug && (
        <fieldset className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <legend className="sr-only">New problem details</legend>
          <div className="space-y-1.5">
            <label htmlFor="title" className={label}>
              Title
            </label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
          <div className="space-y-1.5">
            <span className={label}>Difficulty</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Difficulty">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-md px-3 py-1 text-sm capitalize transition ${difficulty === d ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className={label}>
              Topics <span className="font-normal text-slate-400">(helps find your weak spots)</span>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topics">
              {TOPICS.map((t) => {
                const on = topics.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTopic(t.id)}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </fieldset>
      )}

      <div className="space-y-2">
        <span className={label}>How did it feel?</span>
        <RatingButtons prev={prev} today={today} selected={rating} onRate={setRating} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className={label}>
          Notes for future you
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="The key insight, the pattern, the edge case that tripped you up"
          className={input}
        />
      </div>

      <details className="group rounded-xl bg-white ring-1 ring-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
          More details <span className="font-normal text-slate-400">(time, help, solution link)</span>
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="minutes" className={label}>
                Minutes taken
              </label>
              <input id="minutes" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={input} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:mt-6">
              <input type="checkbox" checked={withoutHelp} onChange={(e) => setWithoutHelp(e.target.checked)} className="h-4 w-4" />
              Solved without hints or the solution
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="solution" className={label}>
              Link to your solution
            </label>
            <input
              id="solution"
              type="url"
              value={solutionUrl}
              onChange={(e) => setSolutionUrl(e.target.value)}
              placeholder="GitHub gist, LeetCode submission…"
              className={input}
            />
          </div>
        </div>
      </details>

      <ErrorNote message={error} />
      <div className="space-y-2">
        <button
          disabled={!!missing || saving}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save and schedule review'}
        </button>
        {missing && <p className="text-center text-xs text-slate-500">{missing}</p>}
      </div>
    </form>
  )
}
