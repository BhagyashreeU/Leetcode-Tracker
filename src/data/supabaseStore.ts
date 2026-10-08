import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_DAILY_REVIEW_CAP, scheduleAttempt } from '../lib/schedule'
import type { Attempt, NewProblem, Problem, Progress, Store, TrackedProblem } from './types'

interface ProblemRow {
  id: string
  slug: string
  title: string
  url: string
  difficulty: Problem['difficulty']
  topics: string[]
}

interface UserProblemRow {
  problem_id: string
  status: Progress['status']
  step: number
  next_review_on: string | null
  last_reviewed_on: string
  times_reviewed: number
  lapses: number
  notes: string
  solution_url: string | null
}

const PROBLEM_COLUMNS = 'id, slug, title, url, difficulty, topics'

const toProblem = (r: ProblemRow): Problem => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  url: r.url,
  difficulty: r.difficulty,
  topics: r.topics,
})

const toProgress = (r: UserProblemRow): Progress => ({
  status: r.status,
  step: r.step,
  nextReviewOn: r.next_review_on,
  lastReviewedOn: r.last_reviewed_on,
  timesReviewed: r.times_reviewed,
  lapses: r.lapses,
  notes: r.notes,
  solutionUrl: r.solution_url,
})

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}

export function createSupabaseStore(db: SupabaseClient): Store {
  async function userId(): Promise<string> {
    const { data } = await db.auth.getSession()
    if (!data.session) throw new Error('Not signed in')
    return data.session.user.id
  }

  return {
    isDemo: false,

    async listTracked() {
      const rows = check(
        await db.from('user_problems').select(`*, problem:problems(${PROBLEM_COLUMNS})`),
      ) as (UserProblemRow & { problem: ProblemRow })[]
      return rows.map((r): TrackedProblem => ({ ...toProgress(r), problem: toProblem(r.problem) }))
    },

    async searchCatalog(query) {
      // Keep only characters that are safe inside a PostgREST `or` filter.
      const q = query.replace(/[^a-zA-Z0-9 -]/g, '').trim()
      if (!q) return []
      const rows = check(
        await db
          .from('problems')
          .select(PROBLEM_COLUMNS)
          .or(`title.ilike.%${q}%,slug.ilike.%${q.replace(/ /g, '-')}%`)
          .order('list_order', { nullsFirst: false })
          .limit(8),
      ) as ProblemRow[]
      return rows.map(toProblem)
    },

    async findProblemBySlug(slug) {
      const row = check(await db.from('problems').select(PROBLEM_COLUMNS).eq('slug', slug).maybeSingle()) as ProblemRow | null
      return row && toProblem(row)
    },

    async addProblem(problem: NewProblem) {
      const row = check(await db.from('problems').insert(problem).select(PROBLEM_COLUMNS).single()) as ProblemRow
      return toProblem(row)
    },

    async recordAttempt(attempt: Attempt, today: string) {
      const uid = await userId()
      const prevRow = check(
        await db.from('user_problems').select('*').eq('problem_id', attempt.problemId).maybeSingle(),
      ) as UserProblemRow | null
      const prev = prevRow && toProgress(prevRow)
      const next = scheduleAttempt(prev, attempt.rating, today)

      check(
        await db.from('reviews').insert({
          user_id: uid,
          problem_id: attempt.problemId,
          rating: attempt.rating,
          minutes: attempt.minutes ?? null,
          solved_without_help: attempt.solvedWithoutHelp ?? attempt.rating !== 'again',
        }),
      )

      const notes = attempt.notes ?? prev?.notes ?? ''
      const solutionUrl = attempt.solutionUrl !== undefined ? attempt.solutionUrl : (prev?.solutionUrl ?? null)
      check(
        await db.from('user_problems').upsert({
          user_id: uid,
          problem_id: attempt.problemId,
          status: next.status,
          step: next.step,
          next_review_on: next.nextReviewOn,
          last_reviewed_on: next.lastReviewedOn,
          times_reviewed: next.timesReviewed,
          lapses: next.lapses,
          notes,
          solution_url: solutionUrl,
        }),
      )
      return { ...next, notes, solutionUrl }
    },

    async updateNotes(problemId, notes, solutionUrl) {
      check(await db.from('user_problems').update({ notes, solution_url: solutionUrl }).eq('problem_id', problemId))
    },

    async dailyReviewCap() {
      const row = check(await db.from('settings').select('daily_review_cap').maybeSingle()) as { daily_review_cap: number } | null
      return row?.daily_review_cap ?? DEFAULT_DAILY_REVIEW_CAP
    },
  }
}
