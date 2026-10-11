// Which screens need a signed-in user, used by the root layout (app/_layout.tsx) on every route
// change. `segments` is Expo Router's useSegments(): route groups included, e.g. ['(tabs)', 'profile'].

export type AuthRedirect = '/(auth)/login' | '/(tabs)' | null;

/** Where to send the user, or null to stay on this screen. */
export function authRedirect(segments: string[], signedIn: boolean): AuthRedirect {
  const landing = segments.length === 0;
  const signIn = segments[0] === '(auth)';
  const callback = segments[0] === 'auth'; // /auth/callback finishes a web sign-in
  const legal = segments[0] === '(legal)'; // privacy policy and terms: public, and linked from both stores

  if (legal) return null;
  if (!signedIn) return landing || signIn || callback ? null : '/(auth)/login';
  return landing || signIn ? '/(tabs)' : null;
}
