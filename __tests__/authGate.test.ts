import { authRedirect } from '../lib/authGate';

describe('authRedirect', () => {
  it('sends signed-out visitors on app screens to sign in', () => {
    expect(authRedirect(['(tabs)'], false)).toBe('/(auth)/login');
    expect(authRedirect(['brew', '[id]'], false)).toBe('/(auth)/login');
  });

  it('lets signed-out visitors see the landing page, sign-in and the sign-in callback', () => {
    expect(authRedirect([], false)).toBeNull();
    expect(authRedirect(['(auth)', 'login'], false)).toBeNull();
    expect(authRedirect(['auth', 'callback'], false)).toBeNull();
  });

  it('sends signed-in users from the landing page and sign-in to their brews', () => {
    expect(authRedirect([], true)).toBe('/(tabs)');
    expect(authRedirect(['(auth)', 'login'], true)).toBe('/(tabs)');
  });

  it('leaves signed-in users where they are in the app', () => {
    expect(authRedirect(['(tabs)', 'profile'], true)).toBeNull();
    expect(authRedirect(['brew', 'new'], true)).toBeNull();
  });

  it('lets anyone read the privacy policy and terms, signed in or not', () => {
    for (const signedIn of [false, true]) {
      expect(authRedirect(['(legal)', 'privacy'], signedIn)).toBeNull();
      expect(authRedirect(['(legal)', 'terms'], signedIn)).toBeNull();
    }
  });
});
