import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, RatingButtons } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { Difficulty, Problem } from '../data/types'
import { formatDay } from '../lib/dates'
import { parseProblemSlug, problemUrl, titleFromSlug } from '../lib/leetcode'
import type { Rating } from '../lib/schedule'
import { TOPICS } from '../lib/topics'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

export function LogPage() {
  const { tracked, today, reload } = useTracker()
  const navigate = useNavigate()

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
      navigate('/problems', {
        state: { message: `Logged ${problem.title}. Next review ${next.nextReviewOn ? formatDay(next.nextReviewOn) : 'none'}.` },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Log a problem</h1>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">LeetCode URL or problem name</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="https://leetcode.com/problems/two-sum/"
          className={input}
        />
      </label>

      {matches.length > 0 && !existing && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                {p.title} <DifficultyBadge difficulty={p.difficulty} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {existing ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="font-medium">{existing.title}</span>
          <DifficultyBadge difficulty={existing.difficulty} />
          {prev && <span className="text-slate-500">already tracked, this logs a review</span>}
        </div>
      ) : (
        slug && (
          <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs text-slate-500">New problem</legend>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
            </label>
            <div className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Difficulty</span>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-lg border px-3 py-1 text-sm capitalize ${difficulty === d ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Topics</span>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${topics.includes(t.id) ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 text-slate-600'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
        )
      )}

      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">How did it feel?</span>
        <RatingButtons prev={prev} today={today} selected={rating} onRate={setRating} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Minutes (optional)</span>
          <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={input} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={withoutHelp} onChange={(e) => setWithoutHelp(e.target.checked)} />
          Solved without help
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Notes: key insight, pattern, edge cases</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Solution link (optional)</span>
        <input type="url" value={solutionUrl} onChange={(e) => setSolutionUrl(e.target.value)} className={input} />
      </label>

      <ErrorNote message={error} />
      <button
        disabled={!slug || !rating || saving}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {query && !slug && <p className="text-xs text-slate-500">Paste a LeetCode problem URL, or pick a match above.</p>}
    </form>
  )
}
