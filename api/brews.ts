import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseBrewInput } from '../lib/brewInput';
import type { Database } from '../types';

// HTTP API for logging brews without the app (used by the Hermes Telegram bot).
// Single-user: a bearer token maps to one Supabase user, and writes use the service
// role key, so this endpoint (not RLS) is what scopes access to that user's rows.
//
//   GET  /api/brews?limit=10&since=<ISO>   newest first, limit max 50
//   POST /api/brews[?dry_run=1]            JSON brew (see lib/brewInput.ts) + optional
//                                          photo: { data: <base64>, mime_type: "image/jpeg" }
//
// Env (Production): EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// BRULOGGER_API_TOKEN, BRULOGGER_USER_ID.

const BUCKET = 'brew-photos';
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // base64 inflates ~33%, keeping the body under Vercel's 4.5 MB cap
const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function error(status: number, message: string, details?: string[]) {
  return json(details ? { error: message, details } : { error: message }, status);
}

function digest(s: string) {
  return createHash('sha256').update(s).digest();
}

type Context = { db: SupabaseClient<Database>; userId: string };

/** Returns the request context, or an error Response if config or auth is missing. */
function authorize(request: Request): Context | Response {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.BRULOGGER_API_TOKEN;
  const userId = process.env.BRULOGGER_USER_ID;
  if (!url || !serviceKey || !token || !userId) {
    console.error('api/brews: missing env configuration');
    return error(500, 'Server is not configured.');
  }

  const presented = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  if (!timingSafeEqual(digest(presented), digest(token))) {
    return error(401, 'Missing or invalid bearer token.');
  }

  const db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db, userId };
}

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

  const { data, error: dbError } = await query;
  if (dbError) {
    console.error('api/brews GET:', dbError);
    return error(500, 'Failed to load brews.');
  }
  return json({ brews: data });
}

export async function POST(request: Request) {
  const ctx = authorize(request);
  if (ctx instanceof Response) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Body must be valid JSON.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return error(400, 'Body must be a JSON object.');
  }

  const { photo, ...fields } = body;
  const parsed = parseBrewInput(fields);
  const errors = parsed.ok ? [] : [...parsed.errors];

  let photoBytes: Buffer | null = null;
  let photoType: string | null = null;
  if (photo != null) {
    const p = photo as { data?: unknown; mime_type?: unknown };
    photoType = typeof p.mime_type === 'string' ? p.mime_type.toLowerCase() : null;
    if (!photoType || !PHOTO_TYPES[photoType]) {
      errors.push(`photo.mime_type must be one of: ${Object.keys(PHOTO_TYPES).join(', ')}.`);
    }
    if (typeof p.data !== 'string' || !p.data) {
      errors.push('photo.data must be a base64 string.');
    } else {
      photoBytes = Buffer.from(p.data.replace(/^data:[^,]*,/, ''), 'base64');
      if (photoBytes.length === 0) errors.push('photo.data is not valid base64.');
      else if (photoBytes.length > MAX_PHOTO_BYTES) errors.push('photo is larger than 3 MB; downscale it first.');
    }
  }

  if (!parsed.ok || errors.length) return error(400, 'Invalid brew.', errors);

  if (new URL(request.url).searchParams.get('dry_run')) {
    return json({ dry_run: true, brew: parsed.value, photo: photoBytes ? { bytes: photoBytes.length } : null });
  }

  let photoPath: string | null = null;
  let photoUrl: string | null = null;
  if (photoBytes && photoType) {
    photoPath = `${ctx.userId}/${Date.now()}.${PHOTO_TYPES[photoType]}`;
    const { error: uploadError } = await ctx.db.storage
      .from(BUCKET)
      .upload(photoPath, photoBytes, { contentType: photoType });
    if (uploadError) {
      console.error('api/brews photo upload:', uploadError);
      return error(500, 'Failed to upload photo.');
    }
    photoUrl = ctx.db.storage.from(BUCKET).getPublicUrl(photoPath).data.publicUrl;
  }

  const { data, error: dbError } = await ctx.db
    .from('brews')
    .insert({ ...parsed.value, user_id: ctx.userId, photo_url: photoUrl })
    .select()
    .single();

  if (dbError) {
    console.error('api/brews insert:', dbError);
    if (photoPath) await ctx.db.storage.from(BUCKET).remove([photoPath]);
    return error(500, 'Failed to save brew.');
  }
  return json({ brew: data }, 201);
}
