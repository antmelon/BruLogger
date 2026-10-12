import { createClient } from '@supabase/supabase-js';
import { error, readJsonObject, reportError, withErrorReports } from '../../server/api';
import { APP_BUNDLE_ID, appleKeyFromEnv, revokeAppleAuthorization } from '../../server/apple';

// POST /api/apple/revoke { code }: called by the iOS app when someone who signed in with Apple
// deletes their account (lib/account.ts), before anything is deleted. `code` is a fresh
// authorization code from Sign in with Apple; this revokes BruLogger's access to their Apple ID.
// The caller must be signed in (`Authorization: Bearer <Supabase access token>`).
// Env (Production): EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and Apple's signing
// key: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 file's contents).

export const POST = withErrorReports(async (request: Request) => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const key = appleKeyFromEnv();
  if (!url || !anonKey || !key) {
    await reportError('apple revoke', new Error('missing env configuration'));
    return error(500, 'Server is not configured.');
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const user = token ? (await supabase.auth.getUser(token)).data.user : null;
  if (!user) return error(401, 'Sign in first.');

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (typeof body.code !== 'string' || !body.code) {
    return error(400, 'code must be an authorization code from Sign in with Apple.');
  }

  try {
    await revokeAppleAuthorization(key, APP_BUNDLE_ID, body.code);
  } catch (e) {
    await reportError('apple revoke', e);
    return error(502, 'Apple did not accept the request.');
  }
  return new Response(null, { status: 204 });
});
