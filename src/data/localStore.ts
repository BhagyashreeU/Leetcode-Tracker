import { CURATED } from '../lib/curated'
import { problemUrl } from '../lib/leetcode'
import { DEFAULT_DAILY_REVIEW_CAP, scheduleAttempt } from '../lib/schedule'
import { DEFAULT_DAILY_NEW_TARGET } from '../lib/suggest'
import type { Attempt, CuratedProblem, Problem, Progress, Store } from './types'

// Demo mode: same behavior as the Supabase store, kept in localStorage so the
// app can be tried before a Supabase project exists.

const KEY = 'leetcode-tracker-demo-v1'

interface StoredReview {
  problemId: string
  reviewedAt: string
  rating: Attempt['rating']
  minutes: number | null
  solvedWithoutHelp: boolean
}

interface DemoData {
  problems: Problem[]
  progress: Record<string, Progress>
  reviews: StoredReview[]
  /** problemId -> day it was last skipped. Missing in data saved before suggestions existed. */
  skips?: Record<string, string>
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoData
  } catch {
    // Unreadable storage: start fresh.
  }
  return { problems: [], progress: {}, reviews: [] }
}

function save(data: DemoData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

/**
 * The curated lists, plus problems the user added. A curated problem the user
 * logged before it was curated keeps its stored id so its progress still matches.
 */
function catalog(data: DemoData): { curated: CuratedProblem[]; all: Problem[] } {
  const stored = new Map(data.problems.map((p) => [p.slug, p]))
  const curated = CURATED.map(
    (c): CuratedProblem => ({
      id: stored.get(c.slug)?.id ?? `curated-${c.slug}`,
      slug: c.slug,
      title: c.title,
      url: problemUrl(c.slug),
      difficulty: c.difficulty,
      topics: [c.topic],
      inBlind75: c.inBlind75,
      inNeetcode150: c.inNeetcode150,
      listOrder: c.listOrder,
    }),
  )
  const curatedSlugs = new Set(CURATED.map((c) => c.slug))
  return { curated, all: [...curated, ...data.problems.filter((p) => !curatedSlugs.has(p.slug))] }
}

const toProblem = ({ id, slug, title, url, difficulty, topics }: Problem): Problem => ({ id, slug, title, url, difficulty, topics })

export function createLocalStore(): Store {
  return {
    isDemo: true,

    async listTracked() {
      const data = load()
      return catalog(data)
        .all.filter((p) => data.progress[p.id])
        .map((p) => ({ ...data.progress[p.id], problem: toProblem(p) }))
    },

    async searchCatalog(query) {
      const q = query.trim().toLowerCase()
      if (!q) return []
      return catalog(load())
        .all.filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q.replace(/ /g, '-')))
        .slice(0, 8)
        .map(toProblem)
    },

    async findProblemBySlug(slug) {
      const found = catalog(load()).all.find((p) => p.slug === slug)
      return found ? toProblem(found) : null
    },

    async addProblem(problem) {
      const data = load()
      if (catalog(data).all.some((p) => p.slug === problem.slug)) throw new Error('That problem is already in the catalog')
      const created = { ...problem, id: crypto.randomUUID() }
      data.problems.push(created)
      save(data)
      return created
    },

    async recordAttempt(attempt, today) {
      const data = load()
      const prev = data.progress[attempt.problemId] ?? null
      const next = scheduleAttempt(prev, attempt.rating, today)
      data.reviews.push({
        problemId: attempt.problemId,
        reviewedAt: new Date().toISOString(),
        rating: attempt.rating,
        minutes: attempt.minutes ?? null,
        solvedWithoutHelp: attempt.solvedWithoutHelp ?? attempt.rating !== 'again',
      })
      const progress: Progress = {
        ...next,
        notes: attempt.notes ?? prev?.notes ?? '',
        solutionUrl: attempt.solutionUrl !== undefined ? attempt.solutionUrl : (prev?.solutionUrl ?? null),
      }
      data.progress[attempt.problemId] = progress
      save(data)
      return progress
    },

    async updateNotes(problemId, notes, solutionUrl) {
      const data = load()
      const p = data.progress[problemId]
      if (!p) return
      data.progress[problemId] = { ...p, notes, solutionUrl }
      save(data)
    },

    async settings() {
      return { dailyReviewCap: DEFAULT_DAILY_REVIEW_CAP, dailyNewTarget: DEFAULT_DAILY_NEW_TARGET }
    },

    async listCurated() {
      return catalog(load()).curated
    },

    async listReviews() {
      return load().reviews.map(({ problemId, rating, reviewedAt }) => ({ problemId, rating, reviewedAt }))
    },

    async listSkips() {
      return Object.entries(load().skips ?? {}).map(([problemId, skippedOn]) => ({ problemId, skippedOn }))
    },

    async skipSuggestion(problemId, today) {
      const data = load()
      data.skips = { ...data.skips, [problemId]: today }
      save(data)
    },
  }
}
