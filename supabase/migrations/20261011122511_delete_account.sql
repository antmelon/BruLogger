-- Lets a signed-in user delete their own account, as the App Store requires for apps with sign-in.
-- Deleting the auth user cascades to their brews. Photos can't be deleted with SQL
-- (storage.protect_delete), so the app removes them through the Storage API first
-- (deleteAccount in lib/account.ts).
create function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Supabase grants new functions to anon and authenticated by default; only a signed-in user
-- should reach this one, and it only ever deletes the caller.
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
