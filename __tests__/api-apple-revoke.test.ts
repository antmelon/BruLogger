/**
 * @jest-environment node
 */
import { generateKeyPairSync } from 'node:crypto';
import { POST } from '../api/apple/revoke';

const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: (...args: unknown[]) => mockGetUser(...args) } }),
}));

const PEM = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  .privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

const fetchMock = jest.spyOn(global, 'fetch');

/** Apple's answers, in order: the code exchange, then the revocation. */
function appleResponds(...responses: Response[]) {
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
}

const appleCalls = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    form: Object.fromEntries(new URLSearchParams(String(init?.body))),
  }));

function req({ token = 'session-token', body = { code: 'apple-code' } as unknown } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://brulogger.test/api/apple/revoke', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  mockGetUser.mockReset();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  process.env.APPLE_TEAM_ID = 'TEAM123456';
  process.env.APPLE_KEY_ID = 'KEY7890ABC';
  process.env.APPLE_PRIVATE_KEY = PEM;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
});

describe('POST /api/apple/revoke', () => {
  it("trades the app's sign-in code for Apple's token, then revokes it", async () => {
    appleResponds(
      Response.json({ access_token: 'a1', refresh_token: 'r1', id_token: 'i1' }),
      new Response(null, { status: 200 }),
    );

    const res = await POST(req());

    expect(res.status).toBe(204);
    expect(mockGetUser).toHaveBeenCalledWith('session-token');
    const [exchange, revoke] = appleCalls();
    expect(exchange.url).toBe('https://appleid.apple.com/auth/token');
    expect(exchange.form).toMatchObject({
      client_id: 'com.antmelon.brulogger',
      code: 'apple-code',
      grant_type: 'authorization_code',
    });
    expect(exchange.form.client_secret.split('.')).toHaveLength(3);
    expect(revoke.url).toBe('https://appleid.apple.com/auth/revoke');
    expect(revoke.form).toMatchObject({
      client_id: 'com.antmelon.brulogger',
      token: 'r1',
      token_type_hint: 'refresh_token',
    });
    expect(revoke.form.client_secret.split('.')).toHaveLength(3);
  });

  it('works with the key stored on one line, its line breaks written as \\n', async () => {
    process.env.APPLE_PRIVATE_KEY = PEM.replace(/\n/g, '\\n');
    appleResponds(Response.json({ refresh_token: 'r1' }), new Response(null, { status: 200 }));

    expect((await POST(req())).status).toBe(204);
  });

  it('turns away callers who are not signed in, without contacting Apple', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid JWT') });

    expect((await POST(req({ token: 'expired' }))).status).toBe(401);
    expect((await POST(req({ token: '' }))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs the code', async () => {
    const res = await POST(req({ body: {} }));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 502 when Apple won't accept the code", async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    appleResponds(Response.json({ error: 'invalid_grant' }, { status: 400 }));

    const res = await POST(req());

    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1); // nothing to revoke
  });

  it("answers 502 when Apple won't revoke the token", async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    appleResponds(
      Response.json({ refresh_token: 'r1' }),
      Response.json({ error: 'invalid_client' }, { status: 400 }),
    );

    expect((await POST(req())).status).toBe(502);
  });

  it("answers 500 when Apple's key isn't configured", async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.APPLE_PRIVATE_KEY;

    expect((await POST(req())).status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
