import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { error, json, parsePhoto, readJsonObject, reportError, withErrorReports } from '../../server/api';
import { DEFAULT_BAG_SCAN_MODEL, ReadBagOptions, readBag } from '../../server/bagScan';
import { scanToCoffeeFields } from '../../lib/bagScan';
import type { Database } from '../../types';

// POST /api/coffees/scan { photo: { data, mime_type }, today }: snap the bag. Claude reads a photo
// of a coffee bag (server/bagScan.ts) and this answers with the coffee form fields it found, plus
// the scans left today. The photo isn't stored. The caller must be signed in (`Authorization:
// Bearer <Supabase access token>`), and each person gets DAILY_LIMIT scans in any 24 hours,
// counted in ai_usage through claim_ai_use() with their own session, so no service key is needed.
// The model is reached through Vercel's AI Gateway with the function's OIDC token, so there's no
// key either; the gateway's credits and budget cap the monthly spend.
// Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY; optionally BAG_SCAN_MODEL (an AI
// Gateway model id); VERCEL_OIDC_TOKEN only when running locally (`vercel env pull`).

export const DAILY_LIMIT = 10;
const FEATURE = 'bag_scan';
const SCAN_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** A YYYY-MM-DD date as local midnight. */
const localDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const POST = withErrorReports(async (request: Request) => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    await reportError('bag scan', new Error('missing env configuration'));
    return error(500, 'Server is not configured.');
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return error(401, 'Sign in first.');
  // Queries run as the caller, so their own row-level security applies
  const db = createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (!(await db.auth.getUser(token)).data.user) return error(401, 'Sign in first.');

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const errors: string[] = [];
  const photo = parsePhoto(body.photo, errors);
  if (photo && !SCAN_TYPES.includes(photo.mimeType)) errors.push(`photo.mime_type must be one of: ${SCAN_TYPES.join(', ')}.`);
  if (!photo || errors.length) return error(400, 'Invalid photo.', errors);
  // The person's own date, for roast dates printed without a year
  const today = typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);

  const gatewayToken = request.headers.get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN;
  if (!gatewayToken) {
    await reportError('bag scan', new Error('no OIDC token for the AI Gateway'));
    return error(500, 'Server is not configured.');
  }

  const claim = await db.rpc('claim_ai_use', { feature: FEATURE, daily_limit: DAILY_LIMIT });
  if (claim.error) {
    await reportError('bag scan: claim', claim.error);
    return error(500, 'Could not check your scans. Please try again.');
  }
  if (claim.data === null) {
    return error(429, `You've scanned ${DAILY_LIMIT} bags in the last 24 hours. Fill this one in by hand, or scan it tomorrow.`);
  }

  let reading;
  try {
    reading = await readBag({
      image: photo.bytes.toString('base64'),
      mimeType: photo.mimeType as ReadBagOptions['mimeType'],
      token: gatewayToken,
      today,
      model: process.env.BAG_SCAN_MODEL || DEFAULT_BAG_SCAN_MODEL,
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return error(503, 'Bag scanning is busy right now. Try again in a minute.');
    }
    if (e instanceof Anthropic.APIError && (e.status === 402 || e.status === 403)) {
      // Out of AI Gateway credits or over the budget (the monthly cap at work), or the team's
      // card is missing (403 customer_verification_required)
      await reportError('bag scan: spend cap', e);
      return error(503, 'Bag scanning is paused for now. Fill in the details by hand.');
    }
    await reportError('bag scan', e);
    return error(502, "Couldn't read the bag right now. Please try again.");
  }

  const finish = await db.rpc('finish_ai_use', {
    use_id: claim.data,
    model: reading.model,
    input_tokens: reading.inputTokens,
    output_tokens: reading.outputTokens,
  });
  if (finish.error) await reportError('bag scan: finish', finish.error);

  const { scan } = reading;
  if (!scan) return error(422, "Couldn't read that photo. Try another one.");
  if (!scan.is_coffee_bag) return error(422, "That doesn't look like a coffee bag. Try a photo of the bag's label.");
  const coffee = scanToCoffeeFields(scan, localDate(today));
  if (Object.keys(coffee).length === 0) return error(422, "Couldn't read the label. Try a closer, sharper photo.");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const used = await db.from('ai_usage').select('id', { count: 'exact', head: true })
    .eq('feature', FEATURE).gte('created_at', since);
  return json({ coffee, remaining: used.count == null ? null : Math.max(0, DAILY_LIMIT - used.count) });
});
