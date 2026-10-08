// Brew photos live in a public bucket under <user_id>/<timestamp>.<ext>; brews.photo_url holds the
// public URL. Shared by the app (lib/brews.ts) and the HTTP API (server/api.ts).

export const PHOTO_BUCKET = 'brew-photos';

/** The storage path of a photo from its public URL, or null if the URL isn't in our bucket. */
export function photoPathFromUrl(publicUrl: string): string | null {
  const marker = `/${PHOTO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? null : publicUrl.slice(idx + marker.length);
}
