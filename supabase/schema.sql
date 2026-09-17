create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table if not exists public.article_progress (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null, progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz not null default now(), last_read_at timestamptz not null default now(), completed boolean not null default false, completed_at timestamptz,
  unique(user_id, article_id)
);
create table if not exists public.article_read_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null, technology text, topic text, opened_at timestamptz not null default now(), time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0)
);
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id text not null, technology text, topic text, quiz_mode text check (quiz_mode in ('practice', 'exam')),
  question_count integer not null check (question_count > 0), score integer not null default 0, percentage numeric(5,2) not null default 0,
  correct_answers integer not null default 0, wrong_answers integer not null default 0, skipped_answers integer not null default 0, time_taken_seconds integer not null default 0,
  passed boolean not null default false, attempt_number integer not null default 1, started_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, question_id text not null, selected_answer text, correct_answer text, is_correct boolean not null default false, answered_at timestamptz not null default now()
);
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null, content_type text not null check (content_type in ('article','quiz','question','resource','topic')), title text, url text, created_at timestamptz not null default now(), unique(user_id, content_id, content_type)
);
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade, theme text not null default 'system' check (theme in ('light','dark','system')), sidebar_collapsed boolean not null default false, email_notifications boolean not null default true, updated_at timestamptz not null default now()
);

create index if not exists idx_article_progress_user on public.article_progress(user_id);
create index if not exists idx_article_history_user_date on public.article_read_history(user_id, opened_at desc);
create index if not exists idx_quiz_attempts_user_date on public.quiz_attempts(user_id, completed_at desc);
create index if not exists idx_quiz_answers_attempt on public.quiz_answers(attempt_id);
create index if not exists idx_bookmarks_user on public.bookmarks(user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Every policy is scoped to the authenticated owner.
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','article_progress','article_read_history','quiz_attempts','quiz_answers','bookmarks','user_preferences'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists "own profile select" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "own progress all" on public.article_progress;
drop policy if exists "own history all" on public.article_read_history;
drop policy if exists "own attempts all" on public.quiz_attempts;
drop policy if exists "own answers all" on public.quiz_answers;
drop policy if exists "own bookmarks all" on public.bookmarks;
drop policy if exists "own preferences all" on public.user_preferences;

create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress all" on public.article_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history all" on public.article_read_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts all" on public.quiz_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own answers all" on public.quiz_answers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bookmarks all" on public.bookmarks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own preferences all" on public.user_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
