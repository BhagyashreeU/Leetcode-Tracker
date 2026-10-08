import { describe, expect, it } from 'vitest'
import { parseProblemSlug, titleFromSlug } from './leetcode'

describe('parseProblemSlug', () => {
  it('reads slugs from LeetCode URLs', () => {
    expect(parseProblemSlug('https://leetcode.com/problems/two-sum/')).toBe('two-sum')
    expect(parseProblemSlug('https://leetcode.com/problems/two-sum/description/?envType=study-plan')).toBe('two-sum')
    expect(parseProblemSlug('leetcode.com/problems/3sum')).toBe('3sum')
  })

  it('accepts a bare slug and rejects anything else', () => {
    expect(parseProblemSlug(' Two-Sum ')).toBe('two-sum')
    expect(parseProblemSlug('two sum')).toBeNull()
    expect(parseProblemSlug('https://example.com/x')).toBeNull()
  })
})

it('titleFromSlug', () => {
  expect(titleFromSlug('longest-substring-without-repeating-characters')).toBe('Longest Substring Without Repeating Characters')
})
