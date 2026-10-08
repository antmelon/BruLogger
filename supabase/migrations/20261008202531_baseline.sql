-- Baseline: production schema as of 2026-10-08, taken with pg_dump. Already applied in
-- production (recorded with `supabase migration repair`), so `db push` skips it. It replaces
-- the old hand-run supabase-schema.sql.

create table public.brews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),

  -- Coffee
  coffee_name       text not null,
  roaster           text,
  origin            text,
  roast_level       text check (roast_level in ('Light','Medium-Light','Medium','Medium-Dark','Dark')),
  varietal          text,
  processing_method text,

  -- Brew parameters
  brew_method       text not null,
  grind_size        text,
  water_temp_c      numeric,
  dose_g            numeric,
  yield_g           numeric,
  brew_time_s       integer,

  -- Notes
  flavor_notes      text,
  general_notes     text,
  rating            numeric(3,1) constraint brews_rating_check
                      check (rating between 1 and 5 and rating * 2 = floor(rating * 2)),
  flavor_profile    jsonb,
  photo_url         text
);

alter table public.brews enable row level security;

create policy "Users can view own brews" on public.brews
  for select using (auth.uid() = user_id);
create policy "Users can insert own brews" on public.brews
  for insert with check (auth.uid() = user_id);
create policy "Users can update own brews" on public.brews
  for update using (auth.uid() = user_id);
create policy "Users can delete own brews" on public.brews
  for delete using (auth.uid() = user_id);

-- Photos: public bucket, objects stored under <user_id>/<timestamp>.<ext>
insert into storage.buckets (id, name, public)
  values ('brew-photos', 'brew-photos', true)
  on conflict (id) do nothing;

create policy "Users can upload their own brew photos" on storage.objects
  for insert with check (bucket_id = 'brew-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Brew photos are publicly viewable" on storage.objects
  for select using (bucket_id = 'brew-photos');
create policy "Users can delete their own brew photos" on storage.objects
  for delete using (bucket_id = 'brew-photos' and auth.uid()::text = (storage.foldername(name))[1]);
