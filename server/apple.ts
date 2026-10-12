import { createPrivateKey, sign } from 'node:crypto';

// Sign in with Apple, server side. Apple authenticates BruLogger with a "client secret": a JWT
// signed by a Sign in with Apple key (the .p8 file from the Apple Developer portal). The API makes
// a short-lived one for each request; scripts/apple-client-secret.mjs makes the long-lived one
// that Supabase needs for the website's sign-in. Plain TypeScript with no imports beyond Node, so
// that script can run this file directly.

export type AppleKey = { teamId: string; keyId: string; privateKey: string };

/** Apple rejects client secrets that live longer than this (15777000 seconds, about 6 months). */
const MAX_LIFETIME_SECONDS = 15777000;

/**
 * A client secret for `clientId` (the app's bundle ID, or the website's Services ID), valid from
 * `now` for `days`.
 */
export function appleClientSecret(
  key: AppleKey,
  clientId: string,
  { now = new Date(), days = 1 }: { now?: Date; days?: number } = {},
): string {
  const lifetime = Math.round(days * 24 * 60 * 60);
  if (lifetime > MAX_LIFETIME_SECONDS) {
    throw new Error('Apple client secrets can last at most 6 months (182 days).');
  }
  const iat = Math.floor(now.getTime() / 1000);
  const header = base64url({ alg: 'ES256', kid: key.keyId });
  const payload = base64url({
    iss: key.teamId,
    sub: clientId,
    aud: 'https://appleid.apple.com',
    iat,
    exp: iat + lifetime,
  });
  // JWTs carry ES256 signatures as the raw r||s pair, not Node's default DER encoding
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(key.privateKey),
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${payload}.${signature.toString('base64url')}`;
}

function base64url(json: object): string {
  return Buffer.from(JSON.stringify(json)).toString('base64url');
}

/** The iOS app's bundle ID (app.json `ios.bundleIdentifier`): the client ID its sign-ins are for. */
export const APP_BUNDLE_ID = 'com.antmelon.brulogger';

/** The signing key from the environment (Vercel Production), or null if it isn't configured. */
export function appleKeyFromEnv(): AppleKey | null {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const pem = process.env.APPLE_PRIVATE_KEY;
  if (!teamId || !keyId || !pem) return null;
  // Pasted on one line, the PEM's line breaks may arrive as a literal "\n"
  return { teamId, keyId, privateKey: pem.replace(/\\n/g, '\n') };
}

/**
 * Revokes BruLogger's access to someone's Apple ID, which Apple asks apps to do when an account
 * is deleted. `code` is a fresh authorization code from signing in with Apple on the device:
 * it's traded for Apple's refresh token, and the token is revoked. Throws if Apple refuses.
 */
export async function revokeAppleAuthorization(key: AppleKey, clientId: string, code: string) {
  const client_secret = appleClientSecret(key, clientId);
  const tokens = await postToApple('token', {
    client_id: clientId,
    client_secret,
    code,
    grant_type: 'authorization_code',
  });
  const { refresh_token } = (await tokens.json()) as { refresh_token?: string };
  if (!refresh_token) throw new Error('Apple returned no refresh token');
  await postToApple('revoke', {
    client_id: clientId,
    client_secret,
    token: refresh_token,
    token_type_hint: 'refresh_token',
  });
}

async function postToApple(endpoint: 'token' | 'revoke', form: Record<string, string>) {
  const response = await fetch(`https://appleid.apple.com/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  if (!response.ok) {
    // Apple's errors are short codes such as "invalid_grant", never anything secret
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(`Apple /auth/${endpoint} answered ${response.status} ${error ?? ''}`.trim());
  }
  return response;
}
