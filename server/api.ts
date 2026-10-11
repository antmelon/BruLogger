import { createHash, timingSafeEqual } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import { PHOTO_BUCKET } from '../lib/storage';
import { scrubReport } from '../lib/crashReports';

// Shared by the HTTP API functions in api/ (used by the Hermes Telegram bot). Kept outside api/
// so Vercel doesn't deploy it as a function of its own.
//
// Single-user: a bearer token maps to one Supabase user, and writes use the service role key,
// so these handlers (not RLS) are what scope access to that user's rows.
// Env (Production): EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// BRULOGGER_API_TOKEN, BRULOGGER_USER_ID, and SENTRY_DSN for error reports.

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // base64 inflates ~33%, keeping the body under Vercel's 4.5 MB cap
const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
};

export type Context = { db: SupabaseClient<Database>; userId: string };

// Error reports to Sentry, only where SENTRY_DSN is set (Vercel Production). Same limits as the
// app's (lib/sentry.ts): errors only, no personal data, secrets scrubbed.
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => scrubReport(event),
    beforeBreadcrumb: (breadcrumb) => scrubReport(breadcrumb),
  });
}

/** Logs a server-side failure and reports it to Sentry. `where` names the step that failed. */
export async function reportError(where: string, err: unknown): Promise<void> {
  console.error(`${where}:`, err);
  if (!sentryDsn) return;
  // Supabase errors are plain objects ({ message, code, details, hint }), not Errors
  const exception = err instanceof Error
    ? err
    : new Error(`${where}: ${(err as { message?: unknown } | null)?.message ?? String(err)}`);
  Sentry.captureException(exception, { tags: { where }, extra: { detail: err } });
  // The function may be frozen once it responds, so send the report first
  await Sentry.flush(2000);
}

type Handler = (request: Request) => Promise<Response>;

/** A handler that answers 500 (and reports the error) instead of crashing when something throws. */
export function withErrorReports(handler: Handler): Handler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (e) {
      await reportError(`${request.method} ${new URL(request.url).pathname}`, e);
      return error(500, 'Something went wrong.');
    }
  };
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export function error(status: number, message: string, details?: string[]) {
  return json(details ? { error: message, details } : { error: message }, status);
}

function digest(s: string) {
  return createHash('sha256').update(s).digest();
}

/** Returns the request context, or an error Response if config or auth is missing. */
export function authorize(request: Request): Context | Response {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.BRULOGGER_API_TOKEN;
  const userId = process.env.BRULOGGER_USER_ID;
  if (!url || !serviceKey || !token || !userId) {
    void reportError('api', new Error('missing env configuration'));
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

/** The request body as a JSON object, or an error Response. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Body must be valid JSON.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return error(400, 'Body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

export function isDryRun(request: Request) {
  return Boolean(new URL(request.url).searchParams.get('dry_run'));
}

export type Photo = { bytes: Buffer; mimeType: string };

/** Validates a `{ data: <base64>, mime_type }` photo, adding any problems to `errors`. */
export function parsePhoto(photo: unknown, errors: string[]): Photo | null {
  const p = (photo ?? {}) as { data?: unknown; mime_type?: unknown };
  const mimeType = typeof p.mime_type === 'string' ? p.mime_type.toLowerCase() : null;
  const before = errors.length;
  if (!mimeType || !PHOTO_TYPES[mimeType]) {
    errors.push(`photo.mime_type must be one of: ${Object.keys(PHOTO_TYPES).join(', ')}.`);
  }
  let bytes: Buffer | null = null;
  if (typeof p.data !== 'string' || !p.data) {
    errors.push('photo.data must be a base64 string.');
  } else {
    bytes = Buffer.from(p.data.replace(/^data:[^,]*,/, ''), 'base64');
    if (bytes.length === 0) errors.push('photo.data is not valid base64.');
    else if (bytes.length > MAX_PHOTO_BYTES) errors.push('photo is larger than 3 MB; downscale it first.');
  }
  return errors.length === before && bytes && mimeType ? { bytes, mimeType } : null;
}

/** Uploads into the user's folder. Returns the storage path (brews.photo_path), or null on failure. */
export async function uploadPhoto(ctx: Context, photo: Photo): Promise<string | null> {
  const path = `${ctx.userId}/${Date.now()}.${PHOTO_TYPES[photo.mimeType]}`;
  const { error: uploadError } = await ctx.db.storage
    .from(PHOTO_BUCKET)
    .upload(path, photo.bytes, { contentType: photo.mimeType });
  if (uploadError) {
    await reportError('api photo upload', uploadError);
    return null;
  }
  return path;
}

/** Best-effort removal of a stored photo (the DB write already succeeded). */
export async function removePhoto(ctx: Context, path: string): Promise<void> {
  const { error: removeError } = await ctx.db.storage.from(PHOTO_BUCKET).remove([path]);
  if (removeError) await reportError('api photo remove', removeError);
}
