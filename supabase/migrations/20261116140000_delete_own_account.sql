-- Lets a signed-in user delete their own account from the profile page.
-- Deleting the auth user also removes their progress (lesson_progress has
-- "on delete cascade") and their sessions. The function runs as its owner
-- (security definer) because users cannot touch auth.users directly; it only
-- ever deletes the caller (auth.uid()).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

comment on function public.delete_own_account() is 'Fretly: deletes the calling user (and, by cascade, their progress).';

-- Only signed-in users may call it; anonymous visitors get nothing.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
