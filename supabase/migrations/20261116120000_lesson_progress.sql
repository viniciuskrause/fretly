-- Learner progress saved in the account, so it follows the user across devices.
-- One row per finished lesson (a key variation), keyed by the app's stable
-- lesson key ("caged/major/C", "inversions/third/maj7/C").

create table if not exists public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_key text not null check (char_length(lesson_key) between 1 and 100),
  -- Tempo of the last run of the lesson's final exercise.
  bpm smallint not null check (bpm between 20 and 400),
  completed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);

comment on table public.lesson_progress is 'Finished lessons per user (Fretly). Written by the app with the publishable key; RLS limits every user to their own rows.';

-- Two devices may sync out of order: never replace a newer completion with an older one.
create or replace function public.lesson_progress_keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completed_at < old.completed_at then
    return old;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lesson_progress_keep_newest on public.lesson_progress;
create trigger lesson_progress_keep_newest
  before update on public.lesson_progress
  for each row execute function public.lesson_progress_keep_newest();

-- Row level security: each user reads and writes only their own progress.
alter table public.lesson_progress enable row level security;

drop policy if exists "Users read their own progress" on public.lesson_progress;
create policy "Users read their own progress" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own progress" on public.lesson_progress;
create policy "Users add their own progress" on public.lesson_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own progress" on public.lesson_progress;
create policy "Users update their own progress" on public.lesson_progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own progress" on public.lesson_progress;
create policy "Users delete their own progress" on public.lesson_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Only signed-in users touch this table; anonymous visitors get nothing.
revoke all on public.lesson_progress from anon;
grant select, insert, update, delete on public.lesson_progress to authenticated;
