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
  dailyReviewCap(): Promise<number>
}
