-- Private photos, step 1 of 2. Safe to run while the previous app version is live.
--
-- Brews will point at their photo by storage path (`<user_id>/<file>` in the brew-photos
-- bucket) instead of a public URL, so the bucket can be made private and photos served through
-- short-lived signed links. This adds the new column and fills it from the existing URLs; the
-- old column stays until step 2, after the new app version is deployed.
alter table public.brews add column photo_path text;

update public.brews
set photo_path = substring(photo_url from '/brew-photos/(.+)$')
where photo_url is not null;
