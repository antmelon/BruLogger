import { parseBrewPatch } from '../../lib/brewInput';
import {
  authorize, Context, error, json, parsePhoto, readJsonObject, removePhoto, uploadPhoto,
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
    console.error('api/brews/:id lookup:', dbError);
    return error(500, 'Failed to load brew.');
  }
  return data;
}

const notFound = () => error(404, 'Brew not found.');

export async function GET(request: Request) {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;
  const id = brewId(request);
  if (!id) return notFound();

  const brew = await findBrew(ctx, id);
  if (brew instanceof Response) return brew;
  return brew ? json({ brew }) : notFound();
}

export async function PATCH(request: Request) {
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
  if ('photo' in body && photo === null) changes.photo_url = null;
  if (Object.keys(changes).length === 0 && !newPhoto) return error(400, 'Nothing to update.');

  const existing = await findBrew(ctx, id);
  if (existing instanceof Response) return existing;
  if (!existing) return notFound();

  if (newPhoto) {
    const uploaded = await uploadPhoto(ctx, newPhoto);
    if (!uploaded) return error(500, 'Failed to upload photo.');
    changes.photo_url = uploaded.url;
  }

  const { data, error: dbError } = await ctx.db
    .from('brews').update(changes).eq('id', id).eq('user_id', ctx.userId).select().single();
  if (dbError) {
    console.error('api/brews/:id update:', dbError);
    if (newPhoto && changes.photo_url) await removePhoto(ctx, changes.photo_url);
    return error(500, 'Failed to update brew.');
  }
  // The old photo goes only once the row no longer points at it
  if (existing.photo_url && 'photo_url' in changes && changes.photo_url !== existing.photo_url) {
    await removePhoto(ctx, existing.photo_url);
  }
  return json({ brew: data });
}

export async function DELETE(request: Request) {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;
  const id = brewId(request);
  if (!id) return notFound();

  const existing = await findBrew(ctx, id);
  if (existing instanceof Response) return existing;
  if (!existing) return notFound();

  const { error: dbError } = await ctx.db.from('brews').delete().eq('id', id).eq('user_id', ctx.userId);
  if (dbError) {
    console.error('api/brews/:id delete:', dbError);
    return error(500, 'Failed to delete brew.');
  }
  if (existing.photo_url) await removePhoto(ctx, existing.photo_url);
  return json({ deleted: existing });
}
