import type { Rating, ScheduleState } from '../lib/schedule'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Problem {
  id: string
  slug: string
  title: string
  url: string
  difficulty: Difficulty
  topics: string[]
}

export type NewProblem = Omit<Problem, 'id'>

/** A problem from the curated lists (Blind 75, NeetCode 150). */
export interface CuratedProblem extends Problem {
  inBlind75: boolean
  inNeetcode150: boolean
  /** Position in the NeetCode roadmap, 1-based. */
  listOrder: number
}

/** One logged attempt, first solve included. */
export interface ReviewRecord {
  problemId: string
  rating: Rating
  /** ISO timestamp. */
  reviewedAt: string
}

/** A suggestion the user skipped; it drops to the back of its topic for a week. */
export interface Skip {
  problemId: string
  skippedOn: string
}

export interface Settings {
  dailyReviewCap: number
  dailyNewTarget: number
}

export interface Progress extends ScheduleState {
  notes: string
  solutionUrl: string | null
}

export interface TrackedProblem extends Progress {
  problem: Problem
}

export interface Attempt {
  problemId: string
  rating: Rating
  minutes?: number | null
  solvedWithoutHelp?: boolean
  /** Only written when provided, so a quick review keeps existing notes. */
  notes?: string
  solutionUrl?: string | null
}

export interface Store {
  /** True when data lives only in this browser (no Supabase configured). */
  readonly isDemo: boolean
  listTracked(): Promise<TrackedProblem[]>
  searchCatalog(query: string): Promise<Problem[]>
  findProblemBySlug(slug: string): Promise<Problem | null>
  addProblem(problem: NewProblem): Promise<Problem>
  /** Logs an attempt and reschedules the problem. Returns the new schedule. */
  recordAttempt(attempt: Attempt, today: string): Promise<Progress>
  updateNotes(problemId: string, notes: string, solutionUrl: string | null): Promise<void>
  settings(): Promise<Settings>
  /** The curated lists in roadmap order. Empty until the seed has been loaded. */
  listCurated(): Promise<CuratedProblem[]>
  listReviews(): Promise<ReviewRecord[]>
  listSkips(): Promise<Skip[]>
  skipSuggestion(problemId: string, today: string): Promise<void>
}
