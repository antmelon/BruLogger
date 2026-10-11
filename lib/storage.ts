// Brew photos live in a private bucket under <user_id>/<timestamp>.<ext>; brews.photo_path holds
// that path, and the app shows a photo through a short-lived signed link (getPhotoUrl in
// lib/brews.ts). Shared by the app and the HTTP API (server/api.ts).

export const PHOTO_BUCKET = 'brew-photos';
