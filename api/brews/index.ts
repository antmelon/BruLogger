import { parseBrewInput } from '../../lib/brewInput';
import {
  authorize, Context, error, isDryRun, json, parsePhoto, Photo, readJsonObject, removePhoto, uploadPhoto,
} from '../../server/api';

// HTTP API for logging brews without the app (used by the Hermes Telegram bot). Auth and shared
// helpers: server/api.ts. One brew by id (GET/PATCH/DELETE): ./[id].ts.
//
//   GET  /api/brews?limit=10&since=<ISO>&q=guji   newest first, limit max 50; q searches
//                                          coffee name, roaster and origin
//   POST /api/brews[?dry_run=1]            JSON brew (see lib/brewInput.ts) + optional
//                                          photo: { data: <base64>, mime_type: "image/jpeg" }.
//                                          Idempotency-Key header: a repeat of the same key
//                                          returns the brew already saved (200, replayed: true)

export async function GET(request: Request) {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get('limit')) || 10, 1), 50);
  const since = params.get('since');

  let query = ctx.db
    .from('brews')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (since) {
    const d = new Date(since);
    if (Number.isNaN(d.getTime())) return error(400, 'since must be an ISO 8601 date-time.');
    query = query.gte('created_at', d.toISOString());
  }
  // Strip PostgREST filter syntax (and wildcards) so q is only ever a substring to match
  const q = (params.get('q') ?? '').replace(/[,()"\\%*]/g, ' ').replace(/\s+/g, ' ').trim();
  if (q) {
    query = query.or(['coffee_name', 'roaster', 'origin'].map((col) => `${col}.ilike."%${q}%"`).join(','));
  }

  const { data, error: dbError } = await query;
  if (dbError) {
    console.error('api/brews GET:', dbError);
    return error(500, 'Failed to load brews.');
  }
  return json({ brews: data });
}

/** The user's brew saved under this idempotency key, null if none, or an error Response. */
async function findByIdempotencyKey(ctx: Context, key: string) {
  const { data, error: dbError } = await ctx.db
    .from('brews').select('*').eq('user_id', ctx.userId).eq('idempotency_key', key).maybeSingle();
  if (dbError) {
    console.error('api/brews idempotency lookup:', dbError);
    return error(500, 'Failed to save brew.');
  }
  return data;
}

export async function POST(request: Request) {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const { photo, ...fields } = body;
  const parsed = parseBrewInput(fields);
  const errors = parsed.ok ? [] : [...parsed.errors];
  const photoInput: Photo | null = photo != null ? parsePhoto(photo, errors) : null;
  const keyHeader = request.headers.get('idempotency-key');
  const idempotencyKey = keyHeader?.trim() || null;
  if (keyHeader !== null && (!idempotencyKey || idempotencyKey.length > 255)) {
    errors.push('Idempotency-Key must be 1–255 characters.');
  }
  if (!parsed.ok || errors.length) return error(400, 'Invalid brew.', errors);

  if (isDryRun(request)) {
    return json({ dry_run: true, brew: parsed.value, photo: photoInput ? { bytes: photoInput.bytes.length } : null });
  }

  if (idempotencyKey) {
    const saved = await findByIdempotencyKey(ctx, idempotencyKey);
    if (saved instanceof Response) return saved;
    if (saved) return json({ brew: saved, replayed: true });
  }

  let photoUrl: string | null = null;
  if (photoInput) {
    const uploaded = await uploadPhoto(ctx, photoInput);
    if (!uploaded) return error(500, 'Failed to upload photo.');
    photoUrl = uploaded.url;
  }

  const { data, error: dbError } = await ctx.db
    .from('brews')
    .insert({
      ...parsed.value,
      user_id: ctx.userId,
      photo_url: photoUrl,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    })
    .select()
    .single();

  if (dbError) {
    if (photoUrl) await removePhoto(ctx, photoUrl);
    // A concurrent save with the same key won the unique index: return what it saved
    if (idempotencyKey && dbError.code === '23505') {
      const saved = await findByIdempotencyKey(ctx, idempotencyKey);
      if (saved && !(saved instanceof Response)) return json({ brew: saved, replayed: true });
    }
    console.error('api/brews insert:', dbError);
    return error(500, 'Failed to save brew.');
  }
  return json({ brew: data }, 201);
}
