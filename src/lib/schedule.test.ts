import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, overdueLabel } from './dates'
import { dueToday, scheduleAttempt, type ScheduleState } from './schedule'

const at = (step: number, extra: Partial<ScheduleState> = {}): ScheduleState => ({
  status: step === 0 ? 'learning' : 'reviewing',
  step,
  nextReviewOn: '2026-10-08',
  lastReviewedOn: '2026-10-01',
  timesReviewed: 2,
  lapses: 0,
  ...extra,
})

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-10-08', '2026-11-07')).toBe(30)
  })
})

describe('scheduleAttempt', () => {
  it('follows the worked example in the design doc', () => {
    let s = scheduleAttempt(null, 'good', '2026-10-08')
    expect(s.nextReviewOn).toBe('2026-10-09')
    s = scheduleAttempt(s, 'good', '2026-10-09')
    expect(s.nextReviewOn).toBe('2026-10-12')
    s = scheduleAttempt(s, 'hard', '2026-10-12')
    expect(s.nextReviewOn).toBe('2026-10-15')
    s = scheduleAttempt(s, 'good', '2026-10-15')
    expect(s.nextReviewOn).toBe('2026-10-22')
    expect(s).toMatchObject({ step: 2, status: 'reviewing', timesReviewed: 3, lapses: 0 })
  })

  it('first solve: Easy jumps to step 1, others start at step 0', () => {
    expect(scheduleAttempt(null, 'easy', '2026-10-08')).toMatchObject({ step: 1, nextReviewOn: '2026-10-11', status: 'reviewing' })
    for (const r of ['again', 'hard', 'good'] as const) {
      expect(scheduleAttempt(null, r, '2026-10-08')).toMatchObject({ step: 0, nextReviewOn: '2026-10-09', status: 'learning', lapses: 0, timesReviewed: 0 })
    }
  })

  it('Again resets to step 0 and counts a lapse', () => {
    expect(scheduleAttempt(at(3, { lapses: 1 }), 'again', '2026-10-08')).toMatchObject({ step: 0, lapses: 2, nextReviewOn: '2026-10-09', status: 'learning' })
  })

  it('Hard stays, Good moves up one, Easy moves up two', () => {
    expect(scheduleAttempt(at(2), 'hard', '2026-10-08')).toMatchObject({ step: 2, nextReviewOn: '2026-10-15' })
    expect(scheduleAttempt(at(2), 'good', '2026-10-08')).toMatchObject({ step: 3, nextReviewOn: '2026-10-22' })
    expect(scheduleAttempt(at(1), 'easy', '2026-10-08')).toMatchObject({ step: 3, nextReviewOn: '2026-10-22' })
  })

  it('Easy is capped at the 30-day step', () => {
    expect(scheduleAttempt(at(3), 'easy', '2026-10-08')).toMatchObject({ step: 4, nextReviewOn: '2026-11-07', status: 'reviewing' })
  })

  it('Good or Easy on step 4 masters the problem with a 60-day check-in', () => {
    for (const r of ['good', 'easy'] as const) {
      expect(scheduleAttempt(at(4), r, '2026-10-08')).toMatchObject({ status: 'mastered', step: 4, nextReviewOn: '2026-12-07' })
    }
    expect(scheduleAttempt(at(4), 'hard', '2026-10-08')).toMatchObject({ status: 'reviewing', step: 4, nextReviewOn: '2026-11-07' })
  })

  it('passing the mastered check-in leaves the queue; failing it starts over', () => {
    const mastered = at(4, { status: 'mastered' })
    expect(scheduleAttempt(mastered, 'good', '2026-12-07')).toMatchObject({ status: 'mastered', nextReviewOn: null })
    expect(scheduleAttempt(mastered, 'hard', '2026-12-07')).toMatchObject({ status: 'reviewing', step: 4, nextReviewOn: '2027-01-06' })
    expect(scheduleAttempt(mastered, 'again', '2026-12-07')).toMatchObject({ status: 'learning', step: 0, lapses: 1 })
  })

  it('a late review counts from the day it is done', () => {
    const late = at(1, { nextReviewOn: '2026-10-01' })
    expect(scheduleAttempt(late, 'good', '2026-10-08').nextReviewOn).toBe('2026-10-15')
  })
})

describe('dueToday', () => {
  const item = (id: string, nextReviewOn: string | null, lapses = 0) => ({ id, nextReviewOn, lapses })

  it('keeps overdue and due items, most overdue then most lapsed first', () => {
    const items = [
      item('future', '2026-10-09'),
      item('today', '2026-10-08'),
      item('old', '2026-10-01'),
      item('today-lapsed', '2026-10-08', 3),
      item('done', null),
    ]
    const { shown, deferred } = dueToday(items, '2026-10-08')
    expect(shown.map((i) => i.id)).toEqual(['old', 'today-lapsed', 'today'])
    expect(deferred).toBe(0)
  })

  it('rolls anything past the cap to tomorrow', () => {
    const items = Array.from({ length: 12 }, (_, n) => item(`p${n}`, '2026-10-08'))
    const { shown, deferred } = dueToday(items, '2026-10-08', 10)
    expect(shown).toHaveLength(10)
    expect(deferred).toBe(2)
  })
})

describe('overdueLabel', () => {
  it('reads naturally for short and long gaps', () => {
    expect(overdueLabel('2026-10-08', '2026-10-08')).toBe('Due today')
    expect(overdueLabel('2026-10-07', '2026-10-08')).toBe('1 day overdue')
    expect(overdueLabel('2026-10-01', '2026-10-08')).toBe('7 days overdue')
    expect(overdueLabel('2026-09-01', '2026-10-08')).toBe('Overdue since Sep 1')
  })
})
