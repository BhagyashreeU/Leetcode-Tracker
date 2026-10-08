# LeetCode Tracker

Track the LeetCode problems you've solved and re-solve them on a spaced-repetition
schedule (1, 3, 7, 14 and 30 days). Design: [docs/design.md](docs/design.md).

## What works now

- **Today**: problems due for review (overdue first), with Again / Hard / Good / Easy
  buttons that show when each choice brings the problem back.
- **Log**: paste a LeetCode URL, set difficulty and topics, rate how it felt, add notes.
- **All problems**: filter by topic, difficulty and status; see next review dates; edit notes.

Problem suggestions, reminders and deployment come next.

## Run it locally

```sh
npm install   # needs Node.js 22.12 or newer
npm run dev
```

Without Supabase keys the app runs in **demo mode**: everything works, but data is
kept only in your browser.

## Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/migrations/20261008000000_init.sql`](supabase/migrations/20261008000000_init.sql)
   (or `supabase db push` with the Supabase CLI).
3. In **Authentication > URL Configuration**, add `http://localhost:5173` (and later the
   Vercel URL) to the redirect URLs, so the email sign-in link comes back to the app.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from
   **Project Settings > API**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (scheduling rules, URL parsing) |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Typecheck and build for production |

## Layout

- `src/lib/schedule.ts`: the review rules. One tested function, shared later with the reminder job.
- `src/data/`: storage. `supabaseStore.ts` for real use, `localStore.ts` for demo mode.
- `src/pages/`: the Today, Log and All problems screens.
- `supabase/migrations/`: tables and row-level security.
