-- Skipped suggestions (docs/design.md, section 4). A skipped problem drops to
-- the back of its topic for a week; one row per problem, updated on each skip.

create table suggestion_skips (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  problem_id uuid not null references problems (id) on delete cascade,
  skipped_on date not null,
  primary key (user_id, problem_id)
);

alter table suggestion_skips enable row level security;

create policy "Users manage their own skips"
  on suggestion_skips for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
