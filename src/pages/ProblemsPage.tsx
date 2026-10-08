import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DifficultyBadge, ErrorNote, StatusPill, TopicTags } from '../components/ui'
import { store } from '../data/store'
import { useTracker } from '../data/TrackerContext'
import type { Difficulty, TrackedProblem } from '../data/types'
import { daysBetween, formatDay } from '../lib/dates'
import type { Status } from '../lib/schedule'
import { TOPICS } from '../lib/topics'

const select =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none'
const STATUSES: (Status | '')[] = ['', 'learning', 'reviewing', 'mastered']

export function ProblemsPage() {
  const { tracked, loading, error } = useTracker()
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [status, setStatus] = useState<Status | ''>('')

  const counts = useMemo(() => {
    const c: Record<string, number> = { '': tracked.length, learning: 0, reviewing: 0, mastered: 0 }
    for (const t of tracked) c[t.status]++
    return c
  }, [tracked])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tracked
      .filter((t) => !q || t.problem.title.toLowerCase().includes(q))
      .filter((t) => !topic || t.problem.topics.includes(topic))
      .filter((t) => !difficulty || t.problem.difficulty === difficulty)
      .filter((t) => !status || t.status === status)
      .sort((a, b) => (a.nextReviewOn ?? '9999').localeCompare(b.nextReviewOn ?? '9999'))
  }, [tracked, search, topic, difficulty, status])

  if (loading) return <p className="text-slate-500">Loading…</p>

  if (tracked.length === 0) {
    return (
      <section className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">All problems</h1>
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <p className="font-medium text-slate-900">No problems yet</p>
          <p className="mt-1 text-sm text-slate-500">Everything you log shows up here with its review schedule.</p>
          <Link to="/log" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Log a problem
          </Link>
        </div>
      </section>
    )
  }

  const filtered = search || topic || difficulty || status

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">All problems</h1>
        <span className="text-sm text-slate-500">{tracked.length} tracked</span>
      </header>
      <ErrorNote message={error} />

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" role="group" aria-label="Status">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap capitalize transition ${status === s ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {s || 'All'} <span className="text-slate-400">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          aria-label="Search by title"
          className={`${select} col-span-2 sm:col-span-1`}
        />
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={select} aria-label="Topic">
          <option value="">All topics</option>
          {TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
          className={select}
          aria-label="Difficulty"
        >
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          No problems match these filters.{' '}
          {filtered && (
            <button
              type="button"
              className="font-medium text-slate-900 underline"
              onClick={() => {
                setSearch('')
                setTopic('')
                setDifficulty('')
                setStatus('')
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {rows.map((t) => (
            <ProblemRow key={t.problem.id} item={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

function NextReview({ item }: { item: TrackedProblem }) {
  const { today } = useTracker()
  if (!item.nextReviewOn) return <span className="text-slate-400">No more reviews</span>
  const days = daysBetween(today, item.nextReviewOn)
  if (days <= 0) return <span className="font-medium text-rose-600">Due now</span>
  return <span className="text-slate-500">{days === 1 ? 'Tomorrow' : `${formatDay(item.nextReviewOn)}`}</span>
}

function ProblemRow({ item }: { item: TrackedProblem }) {
  const { reload } = useTracker()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(item.notes)
  const [solutionUrl, setSolutionUrl] = useState(item.solutionUrl ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = notes !== item.notes || (solutionUrl || null) !== item.solutionUrl

  async function save() {
    try {
      await store.updateNotes(item.problem.id, notes, solutionUrl || null)
      await reload()
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{item.problem.title}</span>
            <DifficultyBadge difficulty={item.problem.difficulty} />
          </span>
          {item.problem.topics.length > 0 && (
            <span className="mt-1 block">
              <TopicTags topics={item.problem.topics} />
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <StatusPill status={item.status} />
          <NextReview item={item} />
        </span>
        <span aria-hidden className={`text-slate-400 transition ${open ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4">
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ['Step', `${item.step + 1} of 5`],
              ['Reviews', item.timesReviewed],
              ['Forgot', `${item.lapses}×`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">
            Last solved {formatDay(item.lastReviewedOn)} ·{' '}
            <a href={item.problem.url} target="_blank" rel="noreferrer" className="font-medium text-slate-700 underline">
              Open on LeetCode ↗
            </a>
            {item.solutionUrl && (
              <>
                {' · '}
                <a href={item.solutionUrl} target="_blank" rel="noreferrer" className="font-medium text-slate-700 underline">
                  My solution ↗
                </a>
              </>
            )}
          </p>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setSaved(false)
            }}
            placeholder="Key insight, pattern, edge cases"
            aria-label="Notes"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="url"
            value={solutionUrl}
            onChange={(e) => {
              setSolutionUrl(e.target.value)
              setSaved(false)
            }}
            placeholder="Link to your solution"
            aria-label="Solution link"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <ErrorNote message={error} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Save notes
            </button>
            {saved && !dirty && <span className="text-xs text-emerald-700">Saved</span>}
          </div>
        </div>
      )}
    </li>
  )
}
