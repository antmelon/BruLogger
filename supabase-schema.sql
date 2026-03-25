-- Run this in the Supabase SQL editor to set up your database

create table if not exists public.brews (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),

  -- Coffee info
  coffee_name   text not null,
  roaster       text,
  origin        text,
  roast_level        text check (roast_level in ('Light','Medium-Light','Medium','Medium-Dark','Dark')),
  varietal           text,
  processing_method  text,

  -- Brew parameters
  brew_method   text not null,
  grind_size    text,
  water_temp_c  numeric,
  dose_g        numeric,
  yield_g       numeric,
  brew_time_s   integer,

  -- Notes
  flavor_notes  text,
  general_notes text,
  rating        integer check (rating between 1 and 5),

  -- Flavor profile (stored as JSONB)
  flavor_profile jsonb
);

-- Row Level Security: users can only see/edit their own brews
alter table public.brews enable row level security;

create policy "Users can view own brews"
  on public.brews for select
  using (auth.uid() = user_id);

create policy "Users can insert own brews"
  on public.brews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brews"
  on public.brews for update
  using (auth.uid() = user_id);

create policy "Users can delete own brews"
  on public.brews for delete
  using (auth.uid() = user_id);

-- Allow half-step ratings (run this if updating an existing table)
alter table public.brews
  alter column rating type numeric(3,1),
  drop constraint if exists brews_rating_check,
  add constraint brews_rating_check check (rating between 1 and 5 and rating * 2 = floor(rating * 2));

-- Photo URL column (run this if adding to an existing table)
alter table public.brews add column if not exists photo_url text;

-- Storage bucket for brew photos
insert into storage.buckets (id, name, public)
  values ('brew-photos', 'brew-photos', true)
  on conflict (id) do nothing;

create policy "Users can upload their own brew photos"
  on storage.objects for insert
  with check (bucket_id = 'brew-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Brew photos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'brew-photos');

create policy "Users can delete their own brew photos"
  on storage.objects for delete
  using (bucket_id = 'brew-photos' and auth.uid()::text = (storage.foldername(name))[1]);
