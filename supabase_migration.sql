-- Run this in the Supabase SQL Editor (or via the CLI) to create the users table.

create table if not exists public.users (
  id          bigint generated always as identity primary key,
  github_id   text unique not null,
  username    text not null,
  avatar_url  text not null default '',
  watchlist   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fast lookup by github_id (used on every authenticated request)
create index if not exists idx_users_github_id on public.users (github_id);

-- Auto-update the updated_at timestamp on row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (tables are locked by default on Supabase).
alter table public.users enable row level security;

-- Allow the server (using the publishable/anon key) full access.
-- Auth is handled by the Express app's own JWT middleware, not Supabase Auth.
create policy "Allow all select" on public.users for select using (true);
create policy "Allow all insert" on public.users for insert with check (true);
create policy "Allow all update" on public.users for update using (true);
create policy "Allow all delete" on public.users for delete using (true);
