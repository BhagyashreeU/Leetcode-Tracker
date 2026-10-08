-- Core schema for the LeetCode review tracker (docs/design.md, section 2).
-- Every user-owned table has row-level security so a signed-in user can only
-- see and change their own rows.

create type difficulty as enum ('easy', 'medium', 'hard');
create type problem_status as enum ('learning', 'reviewing', 'mastered');
create type review_rating as enum ('again', 'hard', 'good', 'easy');

-- The catalog: the curated lists (seeded later) plus problems users add.
create table problems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  url text not null,
  difficulty difficulty not null,
  topics text[] not null default '{}',
  in_blind75 boolean not null default false,
  in_neetcode150 boolean not null default false,
  list_order int,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table problems enable row level security;

create policy "Signed-in users can read the catalog"
  on problems for select to authenticated using (true);

-- Users may add problems that aren't in the catalog, but can't edit curated
-- rows or mark their own additions as part of a curated list.
create policy "Signed-in users can add their own problems"
  on problems for insert to authenticated
  with check (created_by = auth.uid() and not in_blind75 and not in_neetcode150 and list_order is null);

-- Progress on one problem.
create table user_problems (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  problem_id uuid not null references problems (id) on delete cascade,
  status problem_status not null default 'learning',
  step int not null default 0 check (step between 0 and 4),
  next_review_on date,
  last_reviewed_on date,
  times_reviewed int not null default 0,
  lapses int not null default 0,
  notes text not null default '',
  solution_url text,
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create index user_problems_due_idx on user_problems (user_id, next_review_on);

alter table user_problems enable row level security;

create policy "Users manage their own progress"
  on user_problems for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- One row per attempt, first solve included.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  problem_id uuid not null references problems (id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  rating review_rating not null,
  minutes int check (minutes is null or minutes >= 0),
  solved_without_help boolean not null default true
);

create index reviews_user_problem_idx on reviews (user_id, problem_id, reviewed_at);

alter table reviews enable row level security;

create policy "Users read their own reviews"
  on reviews for select to authenticated using (user_id = auth.uid());

create policy "Users add their own reviews"
  on reviews for insert to authenticated with check (user_id = auth.uid());

-- Per-user settings. Reminders (thread 4) read the reminder fields.
create table settings (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  reminder_email text,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  reminder_hour int not null default 8 check (reminder_hour between 0 and 23),
  time_zone text not null default 'UTC',
  daily_new_target int not null default 2 check (daily_new_target >= 0),
  daily_review_cap int not null default 10 check (daily_review_cap > 0),
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

create policy "Users manage their own settings"
  on settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
