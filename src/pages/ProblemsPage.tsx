import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, TopicTags } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { Difficulty, TrackedProblem } from '../data/types'
import { formatDay } from '../lib/dates'
import type { Status } from '../lib/schedule'
import { TOPICS } from '../lib/topics'

const select = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm'

export function ProblemsPage() {
  const { tracked, loading, error } = useTracker()
  const message = (useLocation().state as { message?: string } | null)?.message
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [status, setStatus] = useState<Status | ''>('')

  const rows = useMemo(
    () =>
      tracked
        .filter((t) => !topic || t.problem.topics.includes(topic))
        .filter((t) => !difficulty || t.problem.difficulty === difficulty)
        .filter((t) => !status || t.status === status)
        .sort((a, b) => (a.nextReviewOn ?? '9999').localeCompare(b.nextReviewOn ?? '9999')),
    [tracked, topic, difficulty, status],
  )

  if (loading) return <p className="text-slate-500">Loading…</p>

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-slate-900">All problems</h1>
        <span className="text-sm text-slate-500">{tracked.length} tracked</span>
      </header>
      {message && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">{message}</p>}
      <ErrorNote message={error} />

      <div className="flex flex-wrap gap-2">
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={select}>
          <option value="">All topics</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | '')} className={select}>
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | '')} className={select}>
          <option value="">Any status</option>
          <option value="learning">Learning</option>
          <option value="reviewing">Reviewing</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-500">No problems match.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((t) => (
            <ProblemRow key={t.problem.id} item={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ProblemRow({ item }: { item: TrackedProblem }) {
  const { reload } = useTracker()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(item.notes)
  const [solutionUrl, setSolutionUrl] = useState(item.solutionUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    try {
      await store.updateNotes(item.problem.id, notes, solutionUrl || null)
      await reload()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <li className="p-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left">
        <span className="font-medium text-slate-900">{item.problem.title}</span>
        <DifficultyBadge difficulty={item.problem.difficulty} />
        <TopicTags topics={item.problem.topics} />
        <span className="ml-auto text-sm text-slate-500">
          <span className="capitalize">{item.status}</span> ·{' '}
          {item.nextReviewOn ? `next ${formatDay(item.nextReviewOn)}` : 'no more reviews'}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">
            Step {item.step + 1} of 5 · reviewed {item.timesReviewed}× · {item.lapses} lapses · last {formatDay(item.lastReviewedOn)} ·{' '}
            <a href={item.problem.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">
              open on LeetCode
            </a>
          </p>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key insight, pattern, edge cases"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="url"
            value={solutionUrl}
            onChange={(e) => setSolutionUrl(e.target.value)}
            placeholder="Solution link"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <ErrorNote message={error} />
          <button type="button" onClick={save} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
            Save notes
          </button>
        </div>
      )}
    </li>
  )
}
