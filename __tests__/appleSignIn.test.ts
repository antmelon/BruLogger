import { signInWithApple } from '../lib/appleSignIn';

const mockAppleSignIn = jest.fn();
const mockSignInWithIdToken = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignIn(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: async (algorithm: string, text: string) => `${algorithm}(${text})`,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: (...args: unknown[]) => mockSignInWithIdToken(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

const NO_NAME = {
  namePrefix: null, givenName: null, middleName: null, familyName: null, nameSuffix: null, nickname: null,
};

function appleReturns(credential: object) {
  mockAppleSignIn.mockResolvedValue({
    identityToken: 'apple-id-token',
    authorizationCode: 'apple-code',
    fullName: NO_NAME,
    email: null,
    ...credential,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithIdToken.mockResolvedValue({ data: {}, error: null });
  mockUpdateUser.mockResolvedValue({ data: {}, error: null });
});

describe('signInWithApple', () => {
  it("signs in with Apple's identity token, giving Apple the hashed nonce and Supabase the raw one", async () => {
    appleReturns({});

    await signInWithApple();

    expect(mockAppleSignIn).toHaveBeenCalledWith({
      requestedScopes: [0, 1],
      nonce: 'SHA-256(raw-nonce)',
    });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
      nonce: 'raw-nonce',
    });
  });

  it('saves the name Apple shares the first time someone signs in', async () => {
    appleReturns({ fullName: { ...NO_NAME, givenName: 'Ada', familyName: 'Lovelace' } });

    await signInWithApple();

    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { name: 'Ada Lovelace', full_name: 'Ada Lovelace' } });
  });

  it('leaves the saved name alone on later sign-ins, when Apple shares none', async () => {
    appleReturns({ fullName: NO_NAME });

    await signInWithApple();

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('does nothing when the person closes the Apple sheet', async () => {
    mockAppleSignIn.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));

    await expect(signInWithApple()).resolves.toBeUndefined();
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it("passes on Supabase's refusal", async () => {
    appleReturns({});
    const refused = new Error('Unacceptable audience in id_token');
    mockSignInWithIdToken.mockResolvedValue({ data: {}, error: refused });

    await expect(signInWithApple()).rejects.toBe(refused);
  });
});
