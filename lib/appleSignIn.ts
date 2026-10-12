import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

// Sign in with Apple on iOS, through the system's Apple sheet (Face ID) rather than a browser.
// The website signs in with Apple through Supabase's OAuth redirect instead (login.tsx), like
// Google.

/**
 * Signs in with the Apple sheet. Resolves without signing in if the person closes the sheet, and
 * throws if Apple or Supabase refuses.
 */
export async function signInWithApple(): Promise<void> {
  // Apple puts the nonce's hash in its identity token, and Supabase checks it against the raw
  // value, so a stolen token can't be replayed by anyone who doesn't have the nonce
  const nonce = Crypto.randomUUID();
  const credential = await askApple({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
  });
  if (!credential) return;
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  if (error) throw error;

  // Apple shares the name only the first time someone signs in to BruLogger, and it isn't in the
  // identity token, so keep it now or never. Profile shows `name`, like Google's.
  const { givenName, middleName, familyName } = credential.fullName ?? {};
  const name = [givenName, middleName, familyName].filter(Boolean).join(' ');
  if (name) await supabase.auth.updateUser({ data: { name, full_name: name } });
}

/** The Apple sheet's result, or null if the person closed it. */
async function askApple(
  options: AppleAuthentication.AppleAuthenticationSignInOptions,
): Promise<AppleAuthentication.AppleAuthenticationCredential | null> {
  try {
    return await AppleAuthentication.signInAsync(options);
  } catch (e) {
    if ((e as { code?: unknown }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

/** Where the iOS app reaches the API. Native builds use production, like its Supabase project. */
const API_ORIGIN = 'https://www.brulogger.com';

/**
 * Revokes BruLogger's access to the signed-in person's Apple ID, which Apple asks apps to do when
 * an account is deleted. The person confirms with the Apple sheet, which gives a fresh
 * authorization code for the API (api/apple/revoke.ts) to revoke with Apple. Resolves false if
 * they close the sheet, and throws if the revocation fails.
 */
export async function revokeAppleSignIn(): Promise<boolean> {
  const credential = await askApple({});
  if (!credential) return false;
  if (!credential.authorizationCode) throw new Error('Apple did not return an authorization code.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const response = await fetch(`${API_ORIGIN}/api/apple/revoke`, {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.authorizationCode }),
  });
  if (!response.ok) throw new Error(`Revoking Sign in with Apple failed (${response.status})`);
  return true;
}
