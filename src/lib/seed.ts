// Builds supabase/seed.sql from the curated lists. `npm run seed` rewrites the
// file; a test fails if the two drift apart.
import { CURATED } from './curated'
import { problemUrl } from './leetcode'

const quote = (s: string) => `'${s.replaceAll("'", "''")}'`

export function seedSql(): string {
  const rows = CURATED.map(
    (p) =>
      `  (${[quote(p.slug), quote(p.title), quote(problemUrl(p.slug)), quote(p.difficulty), quote(`{${p.topic}}`), p.inBlind75, p.inNeetcode150, p.listOrder].join(', ')}, null)`,
  )
  return `-- Generated from src/lib/curated.ts by \`npm run seed\`. Don't edit by hand.
-- Loads NeetCode 150, with the Blind 75 problems marked, into the catalog.
-- Safe to run again: existing rows (including ones you logged yourself) are
-- updated in place, so your progress on them is kept.

insert into problems (slug, title, url, difficulty, topics, in_blind75, in_neetcode150, list_order, created_by) values
${rows.join(',\n')}
on conflict (slug) do update set
  title = excluded.title,
  url = excluded.url,
  difficulty = excluded.difficulty,
  topics = excluded.topics,
  in_blind75 = excluded.in_blind75,
  in_neetcode150 = excluded.in_neetcode150,
  list_order = excluded.list_order;
`
}
