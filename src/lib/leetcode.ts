/** Accepts a LeetCode problem URL (any variant) or a bare slug. */
export function parseProblemSlug(input: string): string | null {
  const text = input.trim().toLowerCase()
  const fromUrl = text.match(/leetcode\.(?:com|cn)\/problems\/([a-z0-9-]+)/)
  if (fromUrl) return fromUrl[1]
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text) ? text : null
}

export function problemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`
}

/** "two-sum" -> "Two Sum". A starting guess; the user can edit it. */
export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
