import { deleteAccount } from '../lib/account';

const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockRpc = jest.fn();
const mockList = jest.fn();
const mockRemove = jest.fn();
const mockAppleSignIn = jest.fn();
const mockFetch = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignIn(...args),
}));

global.fetch = mockFetch;

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      getSession: async () => ({ data: { session: { access_token: 'session-token' } } }),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        list: (...args: unknown[]) => mockList(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
      }),
    },
  },
}));

const file = (name: string) => ({ name, id: `id-${name}` });

/** Storage listings by folder, paged like the real API; anything not listed is an empty folder. */
function givenFolders(folders: Record<string, { name: string; id: string | null }[]>) {
  mockList.mockImplementation(async (path: string, opts?: { limit?: number; offset?: number }) => {
    const { limit = 100, offset = 0 } = opts ?? {};
    return { data: (folders[path] ?? []).slice(offset, offset + limit), error: null };
  });
}

const removedPaths = () => mockRemove.mock.calls.flatMap(([paths]) => paths).sort();

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  // Like the Storage API, removes at most 1000 paths per request
  mockRemove.mockImplementation(async (paths: string[]) =>
    paths.length > 1000 ? { data: null, error: new Error('too many paths') } : { data: [], error: null },
  );
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockSignOut.mockResolvedValue({ error: null });
});

describe('deleteAccount', () => {
  it("deletes the user's photos, then their account", async () => {
    givenFolders({ 'user-1': [file('1.jpg'), file('2.png')] });

    await expect(deleteAccount()).resolves.toBe(true);

    expect(mockRemove).toHaveBeenCalledWith(['user-1/1.jpg', 'user-1/2.png']);
    expect(mockRpc).toHaveBeenCalledWith('delete_account');
    expect(mockRemove.mock.invocationCallOrder[0]).toBeLessThan(mockRpc.mock.invocationCallOrder[0]);
  });

  it('signs out on this device once the account is gone', async () => {
    givenFolders({});

    await deleteAccount();

    // The server-side session went with the user, so only the local one is left to clear
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockRpc.mock.invocationCallOrder[0]).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
  });

  it('also deletes photos in nested folders', async () => {
    // Early iOS uploads landed at <user>/<timestamp>.app/<user>, which storage lists as a folder
    givenFolders({
      'user-1': [file('1.jpg'), { name: '1711.app', id: null }],
      'user-1/1711.app': [file('user-1')],
    });

    await deleteAccount();

    expect(removedPaths()).toEqual(['user-1/1.jpg', 'user-1/1711.app/user-1']);
  });

  it('deletes every photo when there are more than a listing page holds', async () => {
    const names = Array.from({ length: 2500 }, (_, i) => `${i}.jpg`);
    givenFolders({ 'user-1': names.map(file) });

    await deleteAccount();

    expect(removedPaths()).toEqual(names.map((n) => `user-1/${n}`).sort());
  });

  it("keeps the account when its photos can't be deleted", async () => {
    givenFolders({ 'user-1': [file('1.jpg')] });
    const storageError = new Error('storage unavailable');
    mockRemove.mockResolvedValue({ data: null, error: storageError });

    await expect(deleteAccount()).rejects.toBe(storageError);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("stays signed in when the account can't be deleted", async () => {
    givenFolders({});
    const dbError = new Error('connection failed');
    mockRpc.mockResolvedValue({ data: null, error: dbError });

    await expect(deleteAccount()).rejects.toBe(dbError);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('deleteAccount for someone who signed in with Apple', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', identities: [{ provider: 'apple' }] } },
    });
    givenFolders({ 'user-1': [file('1.jpg')] });
    mockAppleSignIn.mockResolvedValue({ authorizationCode: 'apple-code' });
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
  });

  it("has them confirm with Apple, and revokes BruLogger's access before deleting anything", async () => {
    await expect(deleteAccount()).resolves.toBe(true);

    expect(mockAppleSignIn).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('https://www.brulogger.com/api/apple/revoke', {
      method: 'POST',
      headers: { authorization: 'Bearer session-token', 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'apple-code' }),
    });
    expect(mockFetch.mock.invocationCallOrder[0]).toBeLessThan(mockRemove.mock.invocationCallOrder[0]);
    expect(mockRpc).toHaveBeenCalledWith('delete_account');
  });

  it('deletes nothing when they close the Apple sheet', async () => {
    mockAppleSignIn.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));

    await expect(deleteAccount()).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("keeps the account when Apple's access can't be revoked", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 502 }));

    await expect(deleteAccount()).rejects.toThrow();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("doesn't involve Apple for a Google account", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', identities: [{ provider: 'google' }] } },
    });

    await expect(deleteAccount()).resolves.toBe(true);
    expect(mockAppleSignIn).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
