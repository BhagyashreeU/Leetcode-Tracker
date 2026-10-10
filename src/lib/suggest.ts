// New-problem suggestions from docs/design.md, section 4: Blind 75 first, then
// the rest of NeetCode 150, picked from the weakest topics.
import type { CuratedProblem, Difficulty, Problem, ReviewRecord, Skip } from '../data/types'
import { addDays, localToday } from './dates'
import { TOPICS, type TopicId } from './topics'

export const DEFAULT_DAILY_NEW_TARGET = 2
/** A skipped problem drops to the back of its topic for this many days. */
export const SKIP_DAYS = 7

/** Topics that come before each topic in the NeetCode roadmap. */
export const PREREQUISITES: Record<TopicId, TopicId[]> = {
  'arrays-hashing': [],
  'two-pointers': ['arrays-hashing'],
  stack: ['arrays-hashing'],
  'binary-search': ['two-pointers'],
  'sliding-window': ['two-pointers'],
  'linked-list': ['two-pointers'],
  trees: ['binary-search', 'linked-list'],
  tries: ['trees'],
  heap: ['trees'],
  backtracking: ['trees'],
  graphs: ['backtracking'],
  '1d-dp': ['backtracking'],
  intervals: ['heap'],
  greedy: ['heap'],
  'advanced-graphs': ['graphs', 'heap'],
  '2d-dp': ['graphs', '1d-dp'],
  'bit-manipulation': ['1d-dp'],
  'math-geometry': ['graphs', 'bit-manipulation'],
}

export type ListPhase = 'blind75' | 'neetcode150' | 'done'

export const LIST_NAMES: Record<ListPhase, string> = { blind75: 'Blind 75', neetcode150: 'NeetCode 150', done: 'NeetCode 150' }

export interface ListProgress {
  phase: ListPhase
  /** The list suggestions come from (NeetCode 150 once everything is done). */
  pool: CuratedProblem[]
  solved: number
  total: number
}

/** Blind 75 until every problem in it is solved once, then NeetCode 150. */
export function activeList(catalog: CuratedProblem[], solved: Set<string>): ListProgress {
  const blind75 = catalog.filter((p) => p.inBlind75)
  const neetcode150 = catalog.filter((p) => p.inNeetcode150)
  const count = (list: CuratedProblem[]) => list.filter((p) => solved.has(p.id)).length
  if (blind75.some((p) => !solved.has(p.id))) {
    return { phase: 'blind75', pool: blind75, solved: count(blind75), total: blind75.length }
  }
  const phase = neetcode150.some((p) => !solved.has(p.id)) ? 'neetcode150' : 'done'
  return { phase, pool: neetcode150, solved: count(neetcode150), total: neetcode150.length }
}

export interface TopicStrength {
  topic: TopicId
  /** Solved problems from the pool in this topic. */
  solved: number
  total: number
  /** Share of Good or Easy ratings across every attempt in this topic; null with no attempts. */
  success: number | null
  attempts: number
  /** Solved anything in this topic, curated or not. */
  started: boolean
  /** 0 to 1. 0.5 * coverage + 0.5 * success (success counts as 0.5 with no attempts). */
  strength: number
}

const primaryTopic = (p: Problem) => p.topics[0]

/** Strength of each topic that has problems in `pool`, in roadmap order. */
export function topicStrengths(pool: CuratedProblem[], tracked: Problem[], reviews: ReviewRecord[]): TopicStrength[] {
  const solved = new Set(tracked.map((p) => p.id))
  const topicsById = new Map(tracked.map((p) => [p.id, p.topics]))
  return TOPICS.flatMap(({ id: topic }) => {
    const inTopic = pool.filter((p) => primaryTopic(p) === topic)
    if (inTopic.length === 0) return []
    const attempts = reviews.filter((r) => topicsById.get(r.problemId)?.includes(topic))
    const clean = attempts.filter((r) => r.rating === 'good' || r.rating === 'easy').length
    const success = attempts.length ? clean / attempts.length : null
    const solvedHere = inTopic.filter((p) => solved.has(p.id)).length
    return [
      {
        topic,
        solved: solvedHere,
        total: inTopic.length,
        success,
        attempts: attempts.length,
        started: tracked.some((p) => p.topics.includes(topic)),
        strength: 0.5 * (solvedHere / inTopic.length) + 0.5 * (success ?? 0.5),
      },
    ]
  })
}

export interface Suggestion {
  problem: CuratedProblem
  topic: TopicStrength
  /** "new": first problem in a topic. "weak": the topic is one of the weakest. */
  reason: 'new' | 'weak'
  /** Skipped in the last week and shown only because nothing else is left in its topic. */
  skipped: boolean
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

/**
 * Picks `count` unsolved problems from the active list. Topics are ranked
 * weakest first (untouched topics count as weakest once their roadmap
 * prerequisites are started), and picks rotate through the ranked topics so
 * one day isn't all one topic. Within a topic: Easy before Medium before Hard,
 * then roadmap order, with recently skipped problems last.
 */
export function suggestProblems(input: {
  catalog: CuratedProblem[]
  tracked: Problem[]
  reviews: ReviewRecord[]
  skips: Skip[]
  today: string
  count: number
}): Suggestion[] {
  const { catalog, tracked, reviews, skips, today, count } = input
  const solved = new Set(tracked.map((p) => p.id))
  const { phase, pool } = activeList(catalog, solved)
  if (phase === 'done' || count <= 0) return []

  const skipCutoff = addDays(today, -SKIP_DAYS)
  const recentlySkipped = new Set(skips.filter((s) => s.skippedOn > skipCutoff).map((s) => s.problemId))

  const strengths = topicStrengths(pool, tracked, reviews)
  const unsolved = (topic: TopicId) => pool.filter((p) => primaryTopic(p) === topic && !solved.has(p.id))
  const started = new Set(strengths.filter((s) => s.started).map((s) => s.topic))
  // A prerequisite with nothing left to solve in this list never blocks.
  const unlocked = (topic: TopicId) => PREREQUISITES[topic].every((p) => started.has(p) || unsolved(p).length === 0)
  const rank = (s: TopicStrength) => (s.started ? s.strength : 0)

  const ranked = strengths
    .filter((s) => unsolved(s.topic).length > 0 && unlocked(s.topic))
    .sort((a, b) => rank(a) - rank(b)) // stable, so ties keep roadmap order

  const queues = ranked.map((s) => ({
    topic: s,
    problems: unsolved(s.topic).sort(
      (a, b) =>
        Number(recentlySkipped.has(a.id)) - Number(recentlySkipped.has(b.id)) ||
        DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
        a.listOrder - b.listOrder,
    ),
  }))

  const picks: Suggestion[] = []
  while (picks.length < count && queues.some((q) => q.problems.length > 0)) {
    for (const q of queues) {
      const problem = q.problems.shift()
      if (!problem) continue
      picks.push({ problem, topic: q.topic, reason: q.topic.started ? 'weak' : 'new', skipped: recentlySkipped.has(problem.id) })
      if (picks.length === count) break
    }
  }
  return picks
}

/** Problems first solved on `today` (their earliest logged attempt is today). */
export function newSolvedToday(reviews: ReviewRecord[], today: string): number {
  const first = new Map<string, string>()
  for (const r of reviews) {
    const prev = first.get(r.problemId)
    if (!prev || r.reviewedAt < prev) first.set(r.problemId, r.reviewedAt)
  }
  return [...first.values()].filter((at) => localToday(new Date(at)) === today).length
}

/** Days in a row, ending today or yesterday, with at least one logged attempt. */
export function streak(reviews: ReviewRecord[], today: string): { current: number; longest: number } {
  const days = [...new Set(reviews.map((r) => localToday(new Date(r.reviewedAt))))].sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && addDays(days[i - 1], 1) === days[i] ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  const last = days.at(-1)
  const current = last === today || last === addDays(today, -1) ? run : 0
  return { current, longest }
}
