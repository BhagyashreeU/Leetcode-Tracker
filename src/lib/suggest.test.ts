import { describe, expect, it } from 'vitest'
import type { CuratedProblem, ReviewRecord } from '../data/types'
import { CURATED } from './curated'
import { activeList, newSolvedToday, PREREQUISITES, streak, suggestProblems, topicStrengths } from './suggest'
import { TOPICS } from './topics'

const catalog: CuratedProblem[] = CURATED.map((c) => ({
  id: c.slug,
  slug: c.slug,
  title: c.title,
  url: `https://leetcode.com/problems/${c.slug}/`,
  difficulty: c.difficulty,
  topics: [c.topic],
  inBlind75: c.inBlind75,
  inNeetcode150: c.inNeetcode150,
  listOrder: c.listOrder,
}))
const bySlug = (slug: string) => catalog.find((p) => p.slug === slug)!
const solvedOf = (slugs: string[]) => slugs.map(bySlug)
const review = (problemId: string, rating: ReviewRecord['rating'], reviewedAt = '2026-10-01T12:00:00'): ReviewRecord => ({
  problemId,
  rating,
  reviewedAt,
})
const today = '2026-10-10'
const suggest = (opts: Partial<Parameters<typeof suggestProblems>[0]> = {}) =>
  suggestProblems({ catalog, tracked: [], reviews: [], skips: [], today, count: 2, ...opts }).map((s) => s.problem.slug)

describe('curated lists', () => {
  it('has NeetCode 150 with Blind 75 inside it', () => {
    expect(catalog).toHaveLength(150)
    expect(catalog.filter((p) => p.inBlind75)).toHaveLength(75)
    expect(new Set(catalog.map((p) => p.slug)).size).toBe(150)
  })

  it('uses only known topics, in roadmap order', () => {
    const order = TOPICS.map((t) => t.id as string)
    const seen = catalog.map((p) => order.indexOf(p.topics[0]))
    expect(seen.every((i) => i >= 0)).toBe(true)
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })

  it('has no prerequisite cycles', () => {
    const visit = (topic: keyof typeof PREREQUISITES, path: string[]): void => {
      expect(path).not.toContain(topic)
      for (const p of PREREQUISITES[topic]) visit(p, [...path, topic])
    }
    for (const t of TOPICS) visit(t.id, [])
  })
})

describe('activeList', () => {
  it('stays on Blind 75 until all of it is solved, then moves to NeetCode 150', () => {
    const blind = catalog.filter((p) => p.inBlind75)
    expect(activeList(catalog, new Set(['two-sum']))).toMatchObject({ phase: 'blind75', solved: 1, total: 75 })
    expect(activeList(catalog, new Set(blind.map((p) => p.id)))).toMatchObject({ phase: 'neetcode150', solved: 75, total: 150 })
    expect(activeList(catalog, new Set(catalog.map((p) => p.id)))).toMatchObject({ phase: 'done' })
  })
})

describe('suggestProblems', () => {
  it('starts with the easiest Arrays & Hashing problems', () => {
    expect(suggest()).toEqual(['contains-duplicate', 'valid-anagram'])
  })

  it('opens new topics once their prerequisites are started', () => {
    // Two Pointers and Stack both follow Arrays & Hashing.
    expect(suggest({ tracked: solvedOf(['contains-duplicate']) })).toEqual(['valid-palindrome', 'valid-parentheses'])
  })

  it('never suggests something already solved and only uses Blind 75 first', () => {
    const picks = suggest({ tracked: solvedOf(['contains-duplicate', 'valid-anagram']), count: 40 })
    expect(picks).not.toContain('contains-duplicate')
    expect(picks.every((s) => bySlug(s).inBlind75)).toBe(true)
    expect(new Set(picks).size).toBe(picks.length)
  })

  it('picks untouched unlocked topics before weak ones', () => {
    const tracked = solvedOf(['contains-duplicate', 'valid-palindrome', 'valid-parentheses'])
    const picks = suggestProblems({ catalog, tracked, reviews: [], skips: [], today, count: 3 })
    expect(picks.map((p) => [p.topic.topic, p.reason])).toEqual([
      ['sliding-window', 'new'],
      ['binary-search', 'new'],
      ['linked-list', 'new'],
    ])
  })

  it('picks from the weakest started topic first', () => {
    // One problem started in every topic; only the Arrays & Hashing attempt went badly.
    const starters = [
      'contains-duplicate',
      'valid-palindrome',
      'best-time-to-buy-and-sell-stock',
      'valid-parentheses',
      'find-minimum-in-rotated-sorted-array',
      'reverse-linked-list',
      'invert-binary-tree',
      'implement-trie-prefix-tree',
      'find-median-from-data-stream',
      'combination-sum',
      'number-of-islands',
      'alien-dictionary',
      'climbing-stairs',
      'unique-paths',
      'maximum-subarray',
      'meeting-rooms',
      'rotate-image',
      'number-of-1-bits',
    ]
    const reviews = starters.map((s) => review(s, s === 'contains-duplicate' ? 'again' : 'good'))
    const [first, second] = suggestProblems({ catalog, tracked: solvedOf(starters), reviews, skips: [], today, count: 2 })
    expect(first).toMatchObject({ reason: 'weak', problem: { slug: 'valid-anagram' } })
    expect(second.topic.topic).not.toBe('arrays-hashing')
  })

  it('rotates topics so a day is not all one topic', () => {
    const tracked = solvedOf(['contains-duplicate'])
    const picks = suggestProblems({ catalog, tracked, reviews: [], skips: [], today, count: 2 })
    expect(new Set(picks.map((p) => p.topic.topic)).size).toBe(2)
  })

  it('moves a recently skipped problem to the back of its topic for a week', () => {
    expect(suggest({ skips: [{ problemId: 'contains-duplicate', skippedOn: '2026-10-08' }] })).toEqual([
      'valid-anagram',
      'two-sum',
    ])
    expect(suggest({ skips: [{ problemId: 'contains-duplicate', skippedOn: '2026-10-03' }] })).toEqual([
      'contains-duplicate',
      'valid-anagram',
    ])
  })
})

describe('topicStrengths', () => {
  it('mixes coverage and clean attempts, with 0.5 success before any attempt', () => {
    const pool = catalog.filter((p) => p.inBlind75)
    const tracked = solvedOf(['contains-duplicate', 'valid-anagram'])
    const reviews = [review('contains-duplicate', 'good'), review('valid-anagram', 'again')]
    const [arrays, twoPointers] = topicStrengths(pool, tracked, reviews)
    expect(arrays).toMatchObject({ topic: 'arrays-hashing', solved: 2, total: 8, success: 0.5, started: true })
    expect(arrays.strength).toBeCloseTo(0.5 * (2 / 8) + 0.25)
    expect(twoPointers).toMatchObject({ solved: 0, success: null, started: false, strength: 0.25 })
  })
})

describe('daily counts', () => {
  it('counts problems first solved today', () => {
    const reviews = [
      review('a', 'good', '2026-10-09T10:00:00'),
      review('a', 'good', '2026-10-10T10:00:00'),
      review('b', 'hard', '2026-10-10T11:00:00'),
    ]
    expect(newSolvedToday(reviews, today)).toBe(1)
  })

  it('tracks current and longest streaks', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08', '2026-10-09']
    const reviews = days.map((d) => review('a', 'good', `${d}T12:00:00`))
    expect(streak(reviews, today)).toEqual({ current: 3, longest: 3 })
    expect(streak(reviews, '2026-10-12')).toEqual({ current: 0, longest: 3 })
    expect(streak([], today)).toEqual({ current: 0, longest: 0 })
  })
})
