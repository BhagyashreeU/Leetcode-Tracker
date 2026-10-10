-- Reminders (docs/design.md, section 5): one push subscription per browser or
-- phone, and a marker so the reminder job sends at most once a day.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Written only by the reminder job (service role); the local day it last sent.
alter table settings add column last_reminded_on date;
