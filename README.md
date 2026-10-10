# LeetCode Tracker

Track the LeetCode problems you've solved and re-solve them on a spaced-repetition
schedule (1, 3, 7, 14 and 30 days). Design: [docs/design.md](docs/design.md).

## What works now

- **Today**: problems due for review (overdue first) with a daily progress bar. Open the
  problem on LeetCode, re-solve it, then rate it Again / Hard / Good / Easy (or press 1-4).
  Each button says when the problem comes back. When you're caught up, it shows what's next.
- **Log**: paste a LeetCode URL, rate how it felt, add notes. Time taken and a solution
  link are optional. You stay on the page to log the next one.
- **Problems**: search, filter by status, topic and difficulty, see next review dates, edit notes.
- **New problems** (on Today): two a day from Blind 75, then the rest of NeetCode 150, picked
  from your weakest topics. Topics open in NeetCode roadmap order. "Log it" opens the log form
  with the problem filled in; "Skip for now" moves a problem to the back of its topic for a week.
  Suggestions pause while reviews are over the daily cap.
- **Progress**: list progress, daily streak, and strength per topic.

Reminders and deployment come next.

## Run it locally

```sh
npm install   # needs Node.js 22.12 or newer
npm run dev
```

Without Supabase keys the app runs in **demo mode**: everything works, but data is
kept only in your browser.

## Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run each file in [`supabase/migrations/`](supabase/migrations) in date order,
   then [`supabase/seed.sql`](supabase/seed.sql), which loads Blind 75 and NeetCode 150
   (or `supabase db push` and then the seed with the Supabase CLI).
3. In **Authentication > URL Configuration**, add `http://localhost:5173` (and later the
   Vercel URL) to the redirect URLs, so the email sign-in link comes back to the app.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from
   **Project Settings > API**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (scheduling, suggestions, URL parsing) |
| `npm run seed` | Rewrite `supabase/seed.sql` after changing `src/lib/curated.ts` |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Typecheck and build for production |

## Layout

- `src/lib/schedule.ts`: the review rules. One tested function, shared later with the reminder job.
- `src/lib/curated.ts`: Blind 75 and NeetCode 150. `src/lib/suggest.ts`: topic strength and picks.
- `src/data/`: storage. `supabaseStore.ts` for real use, `localStore.ts` for demo mode.
- `src/pages/`: the Today, Log and All problems screens.
- `supabase/migrations/`: tables and row-level security. `supabase/seed.sql`: the curated lists.
