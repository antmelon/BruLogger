-- Coffees, step 1 of 2. Safe to run while app 1.0.0 is live.
--
-- A coffee is a bag of beans: its name, roaster and the other details printed on it, plus its
-- roast date and size. Every brew links to one through coffee_id, filled in here for existing
-- brews: one coffee per user per name and roaster.
--
-- App 1.0.0 reads and writes the coffee details on the brew itself (coffee_name, roaster,
-- origin, roast_level, varietal, processing_method), and new installs run it on their first
-- launch until a newer build is in the App Store. So until then those columns stay, as copies
-- of the brew's coffee that the triggers below keep current. Step 2 makes coffee_id required
-- and drops the copies and the triggers.

create table public.coffees (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  name              text not null,
  roaster           text,
  origin            text,
  roast_level       text constraint coffees_roast_level_check
                      check (roast_level in ('Light','Medium-Light','Medium','Medium-Dark','Dark')),
  varietal          text,
  processing_method text,
  roaster_notes     text, -- tasting notes printed on the bag, not what the user tasted
  roast_date        date,
  bag_size_g        numeric constraint coffees_bag_size_g_check check (bag_size_g > 0),
  finished_at       timestamptz, -- null while the bag is still in use
  -- Brews reference (id, user_id) together, so a brew can only use its owner's coffee
  constraint coffees_id_user_id_key unique (id, user_id)
);

create index coffees_user_id_created_at_idx on public.coffees (user_id, created_at desc);

alter table public.coffees enable row level security;

create policy "Users can view own coffees" on public.coffees
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own coffees" on public.coffees
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own coffees" on public.coffees
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own coffees" on public.coffees
  for delete to authenticated using ((select auth.uid()) = user_id);

-- No action (not restrict): a coffee with brews can't be deleted, but deleting an account
-- removes both in one statement, and this is only checked at its end.
alter table public.brews add column coffee_id uuid;
alter table public.brews add constraint brews_coffee_id_fkey
  foreign key (coffee_id, user_id) references public.coffees (id, user_id);
create index brews_coffee_id_idx on public.brews (coffee_id);

-- Existing brews: one coffee per user per name and roaster, ignoring case and surrounding
-- spaces. It takes the name as most recently written and each detail from the most recent
-- brew that has it, and its brews' copies are brought in line with it.
insert into public.coffees
  (user_id, created_at, name, roaster, origin, roast_level, varietal, processing_method)
select
  user_id,
  min(created_at),
  (array_agg(trim(coffee_name) order by created_at desc))[1],
  (array_agg(nullif(trim(roaster), '') order by created_at desc)
    filter (where nullif(trim(roaster), '') is not null))[1],
  (array_agg(nullif(trim(origin), '') order by created_at desc)
    filter (where nullif(trim(origin), '') is not null))[1],
  (array_agg(roast_level order by created_at desc) filter (where roast_level is not null))[1],
  (array_agg(nullif(trim(varietal), '') order by created_at desc)
    filter (where nullif(trim(varietal), '') is not null))[1],
  (array_agg(nullif(trim(processing_method), '') order by created_at desc)
    filter (where nullif(trim(processing_method), '') is not null))[1]
from public.brews
group by user_id, lower(trim(coffee_name)), lower(coalesce(trim(roaster), ''));

update public.brews b
set coffee_id = c.id,
    coffee_name = c.name,
    roaster = c.roaster,
    origin = c.origin,
    roast_level = c.roast_level,
    varietal = c.varietal,
    processing_method = c.processing_method
from public.coffees c
where c.user_id = b.user_id
  and lower(c.name) = lower(trim(b.coffee_name))
  and lower(coalesce(c.roaster, '')) = lower(coalesce(trim(b.roaster), ''));

-- A brew saved without a coffee (by app 1.0.0), or whose coffee name or roaster it changed, is
-- linked to the user's coffee with that name and roaster, preferring one still in use, or to a
-- new coffee made from the brew's details. Then the brew's copies are set from its coffee. So
-- 1.0.0 edits to the other details of an existing brew don't stick: they belong to the coffee.
create function public.brews_link_coffee()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c public.coffees;
begin
  -- Copies being written by coffees_copy_to_brews
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.coffee_id is null
     or (tg_op = 'UPDATE'
         and new.coffee_id = old.coffee_id
         and (lower(trim(new.coffee_name)), lower(coalesce(trim(new.roaster), '')))
             is distinct from
             (lower(trim(old.coffee_name)), lower(coalesce(trim(old.roaster), ''))))
  then
    select * into c
    from public.coffees
    where user_id = new.user_id
      and lower(name) = lower(trim(new.coffee_name))
      and lower(coalesce(roaster, '')) = lower(coalesce(trim(new.roaster), ''))
    order by finished_at is not null, created_at desc
    limit 1;

    if not found then
      insert into public.coffees
        (user_id, name, roaster, origin, roast_level, varietal, processing_method)
      values (
        new.user_id, trim(new.coffee_name), nullif(trim(new.roaster), ''),
        nullif(trim(new.origin), ''), new.roast_level, nullif(trim(new.varietal), ''),
        nullif(trim(new.processing_method), '')
      )
      returning * into c;
    end if;
    new.coffee_id := c.id;
  else
    select * into c from public.coffees where id = new.coffee_id and user_id = new.user_id;
    if not found then
      return new; -- not this user's coffee: the foreign key rejects the row
    end if;
  end if;

  new.coffee_name := c.name;
  new.roaster := c.roaster;
  new.origin := c.origin;
  new.roast_level := c.roast_level;
  new.varietal := c.varietal;
  new.processing_method := c.processing_method;
  return new;
end;
$$;

create trigger brews_link_coffee
  before insert or update of
    coffee_id, coffee_name, roaster, origin, roast_level, varietal, processing_method
  on public.brews
  for each row execute function public.brews_link_coffee();

-- Editing a coffee updates its brews' copies.
create function public.coffees_copy_to_brews()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.brews
  set coffee_name = new.name,
      roaster = new.roaster,
      origin = new.origin,
      roast_level = new.roast_level,
      varietal = new.varietal,
      processing_method = new.processing_method
  where coffee_id = new.id;
  return null;
end;
$$;

create trigger coffees_copy_to_brews
  after update of name, roaster, origin, roast_level, varietal, processing_method
  on public.coffees
  for each row execute function public.coffees_copy_to_brews();
