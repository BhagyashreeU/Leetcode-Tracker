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
- **Reminders**: one email and one phone or browser notification a day when reviews are due
  (nothing on days with nothing due). Pick the time, time zone and channels in **Settings** (the gear).
- **Installable**: add it to your phone's Home Screen or install it from the browser like an app.

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

## Put it online (Vercel)

1. Sign in at [vercel.com](https://vercel.com) with GitHub, click **Add New > Project** and
   import this repository. Vercel detects Vite; keep its defaults.
2. Before clicking **Deploy**, open **Environment Variables** and add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` with the same values as in your `.env.local`. Then **Deploy**.
3. Copy the address Vercel gives you (like `https://leetcode-tracker.vercel.app`).
4. In Supabase, **Authentication > URL Configuration**: set **Site URL** to that address and add
   `https://<your-address>/**` to the redirect URLs. Keep `http://localhost:5173` there too.

Every push to `master` redeploys automatically.

## Turn on reminders

You need the Vercel address from the previous section. Run the commands in this folder on your computer.

1. In the Supabase SQL Editor, run [`supabase/migrations/20261010120000_reminders.sql`](supabase/migrations/20261010120000_reminders.sql).
2. Sign up at [resend.com](https://resend.com) **with the email you want reminders sent to**
   (until you add your own domain, Resend only delivers to that address). Create an API key
   under **API Keys** and copy it (it starts with `re_`).
3. Run `npm run setup-reminders` and paste the Resend key and your Vercel address when asked.
   It creates the notification keys and two files that stay on your computer:
   `supabase/reminders.env` and `supabase/reminders-cron.sql`.
4. Deploy the reminder job (press `y` if `npx` asks to install `supabase`):
   ```sh
   npx supabase login
   npx supabase link --project-ref <your project ref>
   npx supabase secrets set --env-file supabase/reminders.env
   npx supabase functions deploy send-reminders --use-api
   ```
   The project ref is the part before `.supabase.co` in your Supabase URL; the setup script prints
   these commands with it filled in.
5. Open `supabase/reminders-cron.sql`, paste it into the Supabase SQL Editor and click **Run**.
   This checks every 30 minutes whose reminder time it is.
6. Open the app, go to **Settings** (the gear), pick a time, click **Save**, then
   **Turn on for this device** and allow notifications. **Send a test reminder** sends one right away.

On iPhone or iPad, notifications only work from the Home Screen app: open the Vercel address in
Safari, tap **Share > Add to Home Screen**, open it from there, and turn notifications on in Settings.
Do this once on each device you want notified.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (scheduling, suggestions, URL parsing) |
| `npm run seed` | Rewrite `supabase/seed.sql` after changing `src/lib/curated.ts` |
| `npm run setup-reminders` | Create reminder secrets and the schedule SQL (see "Turn on reminders") |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Typecheck and build for production |

## Layout

- `src/lib/schedule.ts`: the review rules. `src/lib/reminders.ts`: when to remind and what to say.
  Both are shared with the reminder job, so the app and the job can't disagree.
- `src/lib/curated.ts`: Blind 75 and NeetCode 150. `src/lib/suggest.ts`: topic strength and picks.
- `src/data/`: storage. `supabaseStore.ts` for real use, `localStore.ts` for demo mode.
- `src/pages/`: the Today, Log, Problems, Progress and Settings screens.
- `public/sw.js`: service worker that shows notifications. `public/manifest.webmanifest`: makes it installable.
- `supabase/functions/send-reminders/`: the reminder job (email through Resend, Web Push).
- `supabase/migrations/`: tables and row-level security. `supabase/seed.sql`: the curated lists.
