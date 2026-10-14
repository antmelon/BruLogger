-- Uses of the AI features (snap the bag), one row each: what keeps each person to a daily
-- allowance, and a record of what they cost so a paid tier stays possible later. The server adds
-- rows through claim_ai_use() and finish_ai_use() below, with the caller's own session, so it
-- needs no service key. People can read their own rows but not add, change or delete them
-- directly. Deleting an account deletes its rows (on delete cascade).
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  feature text not null,
  created_at timestamptz not null default now(),
  model text,
  input_tokens integer,
  output_tokens integer
);

create index ai_usage_user_feature_created on public.ai_usage (user_id, feature, created_at);

alter table public.ai_usage enable row level security;

create policy "Users can view own AI usage" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Records one use of `feature` by the caller and returns its id, or returns null when they've
-- already used it `daily_limit` times in the last 24 hours. Every attempt counts, including ones
-- the AI then fails on. Calling it directly only uses up the caller's own allowance.
create function public.claim_ai_use(feature text, daily_limit integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
  use_id bigint;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  -- One claim at a time per person, so two at once can't both take the last one
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select count(*) into used from public.ai_usage
    where ai_usage.user_id = uid
      and ai_usage.feature = claim_ai_use.feature
      and ai_usage.created_at > now() - interval '24 hours';
  if used >= daily_limit then
    return null;
  end if;
  insert into public.ai_usage (user_id, feature) values (uid, claim_ai_use.feature)
    returning id into use_id;
  return use_id;
end;
$$;

-- Fills in the model and tokens a use cost, once the AI has answered. Only the caller's own rows.
create function public.finish_ai_use(use_id bigint, model text, input_tokens integer, output_tokens integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
    set model = finish_ai_use.model,
        input_tokens = finish_ai_use.input_tokens,
        output_tokens = finish_ai_use.output_tokens
    where id = finish_ai_use.use_id and user_id = auth.uid();
$$;

-- Supabase grants new functions to anon and authenticated by default; only signed-in users
-- should reach these.
revoke execute on function public.claim_ai_use(text, integer) from public, anon;
grant execute on function public.claim_ai_use(text, integer) to authenticated;
revoke execute on function public.finish_ai_use(bigint, text, integer, integer) from public, anon;
grant execute on function public.finish_ai_use(bigint, text, integer, integer) to authenticated;
