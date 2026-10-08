-- Lets the Telegram bot retry a save safely: POST /api/brews with an Idempotency-Key header
-- stores the key, and a repeat of the same key returns the brew already saved instead of
-- inserting a duplicate. Unique per user; brews logged in the app leave it null.
alter table public.brews add column idempotency_key text;
create unique index brews_user_id_idempotency_key_key on public.brews (user_id, idempotency_key);
