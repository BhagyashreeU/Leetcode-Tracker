import { useMemo } from 'react'
import { ErrorNote } from '../components/ui'
import { useTracker } from '../data/TrackerContext'
import { activeList, LIST_NAMES, PREREQUISITES, streak, topicStrengths, type TopicStrength } from '../lib/suggest'
import { topicLabel } from '../lib/topics'

export function ProgressPage() {
  const { tracked, today, loading, suggestionData, suggestionsError } = useTracker()

  const view = useMemo(() => {
    if (!suggestionData) return null
    const problems = tracked.map((t) => t.problem)
    const solved = new Set(problems.map((p) => p.id))
    const { catalog, reviews } = suggestionData
    const list = activeList(catalog, solved)
    const count = (pred: (p: (typeof catalog)[number]) => boolean) => {
      const all = catalog.filter(pred)
      return { solved: all.filter((p) => solved.has(p.id)).length, total: all.length }
    }
    const strengths = topicStrengths(list.pool, problems, reviews)
    return {
      list,
      lists: [
        { name: 'Blind 75', ...count((p) => p.inBlind75) },
        { name: 'NeetCode 150', ...count((p) => p.inNeetcode150) },
      ],
      strengths,
      started: new Set<string>(strengths.filter((s) => s.started).map((s) => s.topic)),
      streak: streak(reviews, today),
    }
  }, [suggestionData, tracked, today])

  if (loading) return <p className="text-slate-500">Loading…</p>

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Progress</h1>
      <ErrorNote message={suggestionsError && `Couldn't load progress: ${suggestionsError}`} />

      {view && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Current streak" value={`${view.streak.current} ${view.streak.current === 1 ? 'day' : 'days'}`} />
            <Stat label="Longest streak" value={`${view.streak.longest} ${view.streak.longest === 1 ? 'day' : 'days'}`} />
          </div>

          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            {view.lists.map((l) => (
              <Bar key={l.name} label={l.name} detail={`${l.solved}/${l.total}`} value={l.total ? l.solved / l.total : 0} tone="bg-sky-500" />
            ))}
          </div>

          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Topic strength</h2>
              <p className="text-sm text-slate-500">
                Half how much of {LIST_NAMES[view.list.phase]} you've covered, half how often your attempts went Good or
                Easy. Suggestions come from the weakest topics you can start.
              </p>
            </div>
            <ul className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              {view.strengths.map((s) => (
                <TopicRow key={s.topic} s={s} started={view.started} />
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function Bar({ label, detail, value, tone }: { label: string; detail: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        <span className="text-xs text-slate-500">{detail}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  )
}

function TopicRow({ s, started }: { s: TopicStrength; started: Set<string> }) {
  const waitingOn = PREREQUISITES[s.topic].filter((p) => !started.has(p))
  const detail = s.started
    ? `${s.solved}/${s.total} solved${s.success === null ? '' : ` · ${Math.round(s.success * 100)}% clean`}`
    : waitingOn.length
      ? `Opens after ${waitingOn.map(topicLabel).join(' and ')}`
      : 'Ready to start'
  const tone = s.strength < 0.4 ? 'bg-rose-400' : s.strength < 0.7 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <li>
      <Bar label={topicLabel(s.topic)} detail={detail} value={s.started ? s.strength : 0} tone={tone} />
    </li>
  )
}
