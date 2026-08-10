-- Run this in the Supabase SQL Editor (or via the CLI) to create the users table.

-- Drop existing tables and triggers for a clean slate
drop trigger if exists trg_users_updated_at on public.users;
drop function if exists public.set_updated_at();
drop table if exists public.tracked_repositories cascade;
drop table if exists public.users cascade;

create table public.users (
  id          bigint generated always as identity primary key,
  github_id   text unique not null,
  username    text not null,
  avatar_url  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fast lookup by github_id (used on every authenticated request)
create index idx_users_github_id on public.users (github_id);

-- Create a table for tracked repositories (Implementation of PK/FK for relational design)
create table public.tracked_repositories (
  id          bigint generated always as identity primary key,
  user_id     bigint not null references public.users(id) on delete cascade,
  repo_name   text not null,
  added_at    timestamptz not null default now(),
  unique (user_id, repo_name)
);

-- Index to optimize querying a user's watchlist (JOIN optimization)
create index idx_tracked_repositories_user_id on public.tracked_repositories(user_id);

-- Auto-update the updated_at timestamp on row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Enable Row Level Security (tables are locked by default on Supabase).
alter table public.users enable row level security;
alter table public.tracked_repositories enable row level security;

-- Allow the server (using the publishable/anon key) full access.
-- Auth is handled by the Express app's own JWT middleware, not Supabase Auth.
create policy "Allow all select" on public.users for select using (true);
create policy "Allow all insert" on public.users for insert with check (true);
create policy "Allow all update" on public.users for update using (true);
create policy "Allow all delete" on public.users for delete using (true);

create policy "Allow all select tracked" on public.tracked_repositories for select using (true);
create policy "Allow all insert tracked" on public.tracked_repositories for insert with check (true);
create policy "Allow all update tracked" on public.tracked_repositories for update using (true);
create policy "Allow all delete tracked" on public.tracked_repositories for delete using (true);
