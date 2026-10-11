import { parseBrewPatch } from '../../lib/brewInput';
import {
  authorize, Context, error, json, parsePhoto, readJsonObject, removePhoto, uploadPhoto,
  reportError, withErrorReports,
} from '../../server/api';

// One brew by id, for the Hermes Telegram bot. See ./index.ts for listing and creating.
//
//   GET    /api/brews/:id
//   PATCH  /api/brews/:id   only the fields sent change; null clears one. photo: {data, mime_type}
//                           replaces the photo, photo: null removes it
//   DELETE /api/brews/:id   deletes the brew and its photo; returns the deleted brew

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function brewId(request: Request): string | null {
  const id = decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '');
  return UUID.test(id) ? id : null;
}

/** The user's brew, null if there's no such brew, or an error Response. */
async function findBrew(ctx: Context, id: string) {
  const { data, error: dbError } = await ctx.db
    .from('brews').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle();
  if (dbError) {
    await reportError('api/brews/:id lookup', dbError);
    return error(500, 'Failed to load brew.');
  }
  return data;
}

const notFound = () => error(404, 'Brew not found.');

export const GET = withErrorReports(async (request: Request) => {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;
  const id = brewId(request);
  if (!id) return notFound();

  const brew = await findBrew(ctx, id);
  if (brew instanceof Response) return brew;
  return brew ? json({ brew }) : notFound();
});

export const PATCH = withErrorReports(async (request: Request) => {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;
  const id = brewId(request);
  if (!id) return notFound();

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const { photo, ...fields } = body;
  const parsed = parseBrewPatch(fields);
  const errors = parsed.ok ? [] : [...parsed.errors];
  const newPhoto = photo != null ? parsePhoto(photo, errors) : null;
  if (!parsed.ok || errors.length) return error(400, 'Invalid changes.', errors);
  const changes = { ...parsed.value };
  if ('photo' in body && photo === null) changes.photo_path = null;
  if (Object.keys(changes).length === 0 && !newPhoto) return error(400, 'Nothing to update.');

  const existing = await findBrew(ctx, id);
  if (existing instanceof Response) return existing;
  if (!existing) return notFound();

  if (newPhoto) {
    const uploaded = await uploadPhoto(ctx, newPhoto);
    if (!uploaded) return error(500, 'Failed to upload photo.');
    changes.photo_path = uploaded;
  }

  const { data, error: dbError } = await ctx.db
    .from('brews').update(changes).eq('id', id).eq('user_id', ctx.userId).select().single();
  if (dbError) {
    await reportError('api/brews/:id update', dbError);
    if (newPhoto && changes.photo_path) await removePhoto(ctx, changes.photo_path);
    return error(500, 'Failed to update brew.');
  }
  // The old photo goes only once the row no longer points at it
  if (existing.photo_path && 'photo_path' in changes && changes.photo_path !== existing.photo_path) {
    await removePhoto(ctx, existing.photo_path);
  }
  return json({ brew: data });
});

export const DELETE = withErrorReports(async (request: Request) => {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;
  const id = brewId(request);
  if (!id) return notFound();

  const existing = await findBrew(ctx, id);
  if (existing instanceof Response) return existing;
  if (!existing) return notFound();

  const { error: dbError } = await ctx.db.from('brews').delete().eq('id', id).eq('user_id', ctx.userId);
  if (dbError) {
    await reportError('api/brews/:id delete', dbError);
    return error(500, 'Failed to delete brew.');
  }
  if (existing.photo_path) await removePhoto(ctx, existing.photo_path);
  return json({ deleted: existing });
});
