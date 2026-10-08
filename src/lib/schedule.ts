// Spaced-repetition rules from docs/design.md, section 3. This is the single
// source of truth for scheduling; the reminder job will import it too.
import { addDays } from './dates'

export const INTERVALS = [1, 3, 7, 14, 30] as const
export const MAX_STEP = INTERVALS.length - 1
export const MASTERED_CHECKIN_DAYS = 60
export const DEFAULT_DAILY_REVIEW_CAP = 10

export const RATINGS = ['again', 'hard', 'good', 'easy'] as const
export type Rating = (typeof RATINGS)[number]
export type Status = 'learning' | 'reviewing' | 'mastered'

export interface ScheduleState {
  status: Status
  step: number
  /** null once a mastered problem has passed its 60-day check-in. */
  nextReviewOn: string | null
  lastReviewedOn: string
  timesReviewed: number
  lapses: number
}

function onStep(step: number, today: string): Pick<ScheduleState, 'status' | 'step' | 'nextReviewOn'> {
  return {
    status: step === 0 ? 'learning' : 'reviewing',
    step,
    nextReviewOn: addDays(today, INTERVALS[step]),
  }
}

/**
 * Returns the new schedule after an attempt rated `rating` on `today`.
 * `prev` is null for the first solve.
 */
export function scheduleAttempt(prev: ScheduleState | null, rating: Rating, today: string): ScheduleState {
  if (prev === null) {
    // First solve: Easy skips straight to step 1, everything else starts at step 0.
    return {
      ...onStep(rating === 'easy' ? 1 : 0, today),
      lastReviewedOn: today,
      timesReviewed: 0,
      lapses: 0,
    }
  }

  const base = { lastReviewedOn: today, timesReviewed: prev.timesReviewed + 1, lapses: prev.lapses }

  if (rating === 'again') {
    return { ...base, ...onStep(0, today), lapses: prev.lapses + 1 }
  }

  if (prev.status === 'mastered') {
    // The optional 60-day check-in: pass it and the problem leaves the queue.
    if (rating === 'hard') return { ...base, ...onStep(MAX_STEP, today) }
    return { ...base, status: 'mastered', step: MAX_STEP, nextReviewOn: null }
  }

  if (prev.step >= MAX_STEP && (rating === 'good' || rating === 'easy')) {
    return { ...base, status: 'mastered', step: MAX_STEP, nextReviewOn: addDays(today, MASTERED_CHECKIN_DAYS) }
  }

  const delta = rating === 'hard' ? 0 : rating === 'good' ? 1 : 2
  return { ...base, ...onStep(Math.min(prev.step + delta, MAX_STEP), today) }
}

export interface DueItem {
  nextReviewOn: string | null
  lapses: number
}

/**
 * Problems due on or before `today`, most overdue first, then most lapsed.
 * Anything past the daily cap rolls to tomorrow.
 */
export function dueToday<T extends DueItem>(items: T[], today: string, cap = DEFAULT_DAILY_REVIEW_CAP) {
  const due = items
    .filter((i) => i.nextReviewOn !== null && i.nextReviewOn <= today)
    .sort((a, b) => a.nextReviewOn!.localeCompare(b.nextReviewOn!) || b.lapses - a.lapses)
  return { shown: due.slice(0, cap), deferred: Math.max(0, due.length - cap) }
}
