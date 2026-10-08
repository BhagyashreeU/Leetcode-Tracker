# LeetCode Review Tracker: Design

Status: approved by B, 2026-10-08 (repo: yes, intervals 1/3/7/14/30: yes, email + push in every version, Blind 75 then NeetCode 150, stack: Supabase + Vercel)

## 1. What the app does

- Log a problem you just solved and rate how hard it felt.
- Show a **Due today** list of problems to re-solve, scheduled by spaced repetition.
- Suggest new problems from a curated list (NeetCode 150), weighted toward your weak topics.
- Send a daily reminder when reviews are due.

Single user to start (just B), but behind a login so the data is private and it can grow later.

## 2. What we store

Stored in **Supabase Postgres**. Row-level security lets a signed-in user read and write only their own rows; the `problems` catalog is read-only.

### `problems` (the catalog: curated list plus anything you add)

| Field | Type | Example |
|---|---|---|
| id | uuid | |
| slug | text, unique | `two-sum` |
| title | text | Two Sum |
| url | text | https://leetcode.com/problems/two-sum/ |
| difficulty | `easy` / `medium` / `hard` | easy |
| topics | text[] | `{arrays, hashing}` |
| in_blind75 | bool | true |
| in_neetcode150 | bool | true |
| list_order | int, nullable | 1 (roadmap order) |

### `user_problems` (your progress on one problem)

| Field | Type | Notes |
|---|---|---|
| user_id, problem_id | uuid | one row per problem you've started |
| status | `learning` / `reviewing` / `mastered` | |
| step | int | position in the schedule (0 to 4) |
| next_review_on | date | drives the Due today list |
| last_reviewed_on | date | |
| times_reviewed | int | |
| lapses | int | how often you failed a review |
| notes | text | key insight, pattern, edge cases |
| solution_url | text, nullable | link to your code or gist |

### `reviews` (one row per attempt, first solve included)

| Field | Type | Notes |
|---|---|---|
| user_id, problem_id | uuid | |
| reviewed_at | timestamptz | |
| rating | `again` / `hard` / `good` / `easy` | how it felt |
| minutes | int, nullable | time taken |
| solved_without_help | bool | |

Keeping every attempt in `reviews` lets us compute weak topics and progress charts later without changing the schema.

### `settings`

Reminder email, email on/off, push on/off, reminder hour and time zone, daily new-problem target (default 2), daily review cap (default 10).

## 3. Review schedule

Intervals (days): **1, 3, 7, 14, 30**, as steps 0 to 4.

After each attempt you pick a rating, and the step moves:

| Rating | Meaning | Step change |
|---|---|---|
| Again | Couldn't solve it or needed the solution | back to step 0, `lapses + 1` |
| Hard | Solved, but slow or shaky | stay on the same step |
| Good | Solved cleanly | up one step |
| Easy | Instant, could explain it to anyone | up two steps |

`next_review_on = today + interval[step]`.

- **First solve** uses the same rule from step 0, except Easy jumps straight to step 1 (3 days).
- **Mastered**: a Good or Easy rating while on step 4 (30 days) marks the problem mastered. Mastered problems get one optional 60-day check-in and otherwise leave the queue.
- **Missed days**: overdue items stay in Due today, oldest first. The interval counts from the day you actually review, so a late review is never punished twice.
- **Daily cap**: if more than the cap are due, show the most overdue and the most-lapsed first; the rest roll to tomorrow.

Example: solve Two Sum (Good) on Oct 8, due Oct 9. Good on Oct 9, due Oct 12. Hard on Oct 12, due Oct 15 again (still 3 days). Good, then due 7 days later, and so on.

This is a simplified version of the Anki SM-2 approach. Fixed steps are easier to reason about than SM-2's per-card ease factor, and we can switch later because every attempt is already logged.

## 4. Problem suggestions

Seed data: one JSON file with the union of Blind 75 and NeetCode 150 (slug, title, URL, difficulty, topic, order, `in_blind75`, `in_neetcode150`) loaded into `problems`. Titles and links only, no problem text.

**List phases** (B's choice): suggestions come only from **Blind 75** until every Blind 75 problem has been solved at least once, then switch to the remaining **NeetCode 150** problems. Most of Blind 75 is inside NeetCode 150, so solved problems carry over and are never suggested twice. The Today screen shows progress for the active list (for example "Blind 75: 31/75").

**Topic strength**, per topic (arrays, two pointers, sliding window, trees, graphs, DP, and so on):

```
coverage   = solved in topic / curated problems in topic
success    = (good + easy reviews) / all reviews in topic   (0.5 if no reviews yet)
strength   = 0.5 * coverage + 0.5 * success
```

**Picking today's new problems** (default 2 a day):

1. Within the active list, rank topics by lowest strength. Topics you've never touched count as weakest, but only after their prerequisites in the NeetCode roadmap order (for example arrays before two pointers before sliding window).
2. In the weakest topic, take the next unsolved problem in list order, preferring Easy, then Medium, then Hard.
3. Second pick comes from the next-weakest topic, so you don't grind one topic all day.
4. Skip suggestions are allowed; a skipped problem drops to the end of its topic for a week.

The Due today list always comes first; new suggestions appear below it, and the app can hide them when reviews exceed the daily cap.

## 5. Reminders

- **Daily email**: a scheduled job runs every hour, finds users whose reminder hour it is in their time zone and who have reviews due, and sends one email: "4 reviews due, 2 new suggestions," with links. No email when nothing is due. Sent through Resend (free tier, 100 emails a day).
- **In-app**: a count badge on Due today, and the browser tab title shows the count.
- **Browser push** (every version, B's choice): the app is an installable web app (PWA) with a service worker. The same hourly job sends a web push notification alongside the email, using VAPID keys and a `push_subscriptions` table (one row per browser or phone). On iPhone, push only works after "Add to Home Screen" (iOS 16.4+); on desktop and Android it works in the browser.
- B can turn email and push on or off separately in Settings.

## 6. Stack (chosen by B)

| Part | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, installable PWA (`vite-plugin-pwa`) | Simple, fast to build, widely known |
| Database + login | Supabase (Postgres, Auth, row-level security) | Free tier covers this easily; login with email magic link or Google |
| Scheduled job | Supabase Edge Function triggered hourly by `pg_cron` | Runs inside the same free project, no extra server |
| Email | Resend (free tier, 100 emails a day) | Simple API, works from an Edge Function |
| Push | Web Push (VAPID) sent from the Edge Function | Free, no third-party push service |
| Hosting | Vercel (free Hobby plan) | Push to GitHub and it deploys; preview link for every change |
| Code | One GitHub repo | Needed before thread 2 starts |

Everything above is free at single-user scale. A free Supabase project pauses after 7 days with no activity; daily use keeps it awake. Scheduling logic (section 3) lives in one small, tested TypeScript function shared by the app and the reminder job so they can't drift.

## 7. Screens (v1)

1. **Today**: Due today list (with rating buttons after each re-solve) and today's suggestions.
2. **Log a problem**: paste a LeetCode URL or pick from the catalog, rate it, add notes.
3. **All problems**: filter by topic, difficulty, status; see next review date.
4. **Progress**: topic strength bars and streak.
5. **Settings**: reminder time, daily targets.

## 8. How the next threads use this

- **Thread 2 (build the tracker)**: repo setup, Supabase schema and row-level security from section 2, scheduling from section 3, screens 1 to 3.
- **Thread 3 (suggestions)**: seed Blind 75 + NeetCode 150 and implement section 4 plus the Progress screen.
- **Thread 4 (reminders and deploy)**: section 5 (email and push) and hosting. The PWA shell can land earlier in thread 2.

## 9. Decisions (2026-10-08)

- **Repo**: yes, a new GitHub repo (`leetcode-tracker` suggested). GitHub is connected; waiting on B to create the empty repo.
- **Intervals**: 1, 3, 7, 14, 30 days.
- **Reminders**: email and browser push, in every version.
- **Lists**: Blind 75 first, then NeetCode 150.
- **Stack**: Supabase, Vercel, Resend and Web Push. Firebase was considered and dropped.
