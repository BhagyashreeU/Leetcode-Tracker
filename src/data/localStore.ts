import { DEFAULT_DAILY_REVIEW_CAP, scheduleAttempt } from '../lib/schedule'
import type { Attempt, Problem, Progress, Store } from './types'

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

export function createLocalStore(): Store {
  return {
    isDemo: true,

    async listTracked() {
      const { problems, progress } = load()
      return problems.filter((p) => progress[p.id]).map((p) => ({ ...progress[p.id], problem: p }))
    },

    async searchCatalog(query) {
      const q = query.trim().toLowerCase()
      if (!q) return []
      return load()
        .problems.filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q.replace(/ /g, '-')))
        .slice(0, 8)
    },

    async findProblemBySlug(slug) {
      return load().problems.find((p) => p.slug === slug) ?? null
    },

    async addProblem(problem) {
      const data = load()
      if (data.problems.some((p) => p.slug === problem.slug)) throw new Error('That problem is already in the catalog')
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

    async dailyReviewCap() {
      return DEFAULT_DAILY_REVIEW_CAP
    },
  }
}
