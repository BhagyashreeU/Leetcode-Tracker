import { expect, it } from 'vitest'
import { seedSql } from './seed'

// Fails when src/lib/curated.ts changes without `npm run seed`.
it('supabase/seed.sql matches the curated lists', async () => {
  await expect(seedSql()).toMatchFileSnapshot('../../supabase/seed.sql')
})
