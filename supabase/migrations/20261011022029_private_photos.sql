-- Private photos, step 2 of 2. Run only after the app version that reads photo_path is live.

-- Catch any photo saved by the old version between step 1 and the deploy
update public.brews
set photo_path = substring(photo_url from '/brew-photos/(.+)$')
where photo_path is null and photo_url is not null;

alter table public.brews drop column photo_url;

-- Photos are now only reachable through signed links, which the existing storage policies
-- allow for each user's own folder. Also cap uploads at 5 MB and to the image types the app and
-- API accept.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'brew-photos';
