-- brew_method had no check constraint (roast_level did); the app and API already restrict it.
alter table public.brews
  add constraint brews_brew_method_check
  check (brew_method in ('Pour Over','French Press','Espresso','AeroPress','Cold Brew','Other'));

-- Every list query is "this user's brews, newest first".
create index brews_user_id_created_at_idx on public.brews (user_id, created_at desc);

-- RLS: scope policies to signed-in users and evaluate auth.uid() once per query instead of
-- once per row (Supabase's auth_rls_initplan advisor). Update also checks the new row, so a
-- brew can't be reassigned to another user_id.
drop policy "Users can view own brews" on public.brews;
drop policy "Users can insert own brews" on public.brews;
drop policy "Users can update own brews" on public.brews;
drop policy "Users can delete own brews" on public.brews;

create policy "Users can view own brews" on public.brews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own brews" on public.brews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own brews" on public.brews
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own brews" on public.brews
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Storage: public URLs of a public bucket bypass RLS, so this select policy only governs the
-- API (list, and the lookup that remove() does). It allowed anyone with the anon key to list
-- every user's photos; limit it to the owner's own folder.
drop policy "Brew photos are publicly viewable" on storage.objects;
create policy "Users can read their own brew photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'brew-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy "Users can upload their own brew photos" on storage.objects;
create policy "Users can upload their own brew photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brew-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy "Users can delete their own brew photos" on storage.objects;
create policy "Users can delete their own brew photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brew-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
