/**
 * @jest-environment node
 */
import { GET, POST } from '../api/brews';

const mockInsert = jest.fn();
const mockQuery = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), limit: jest.fn(), gte: jest.fn() };
// Awaiting the query builder resolves to whatever the test set here
let mockQueryResult: { data: unknown; error: unknown } = { data: [], error: null };
const mockBuilder = Object.assign(mockQuery, {
  then: (resolve: (v: unknown) => void) => resolve(mockQueryResult),
});
const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ ...mockBuilder, insert: mockInsert }),
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/brew-photos/${path}` } }),
      }),
    },
  }),
}));

const TOKEN = 'test-token';
const BASE = 'https://brulogger.test/api/brews';

function req(method: string, { token = TOKEN, body, query = '' }: { token?: string | null; body?: unknown; query?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(BASE + query, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.BRULOGGER_API_TOKEN = TOKEN;
  process.env.BRULOGGER_USER_ID = 'user-1';

  for (const fn of [mockQuery.select, mockQuery.eq, mockQuery.order, mockQuery.limit, mockQuery.gte]) {
    fn.mockReturnValue(mockBuilder);
  }
  mockQueryResult = { data: [], error: null };
  mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: 'b1' }, error: null }) }) });
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
});

function resolveQuery(result: { data: unknown; error: unknown }) {
  mockQueryResult = result;
}

describe('auth', () => {
  it('rejects a missing or wrong token', async () => {
    expect((await GET(req('GET', { token: null }))).status).toBe(401);
    expect((await GET(req('GET', { token: 'nope' }))).status).toBe(401);
    expect((await POST(req('POST', { token: 'nope', body: {} }))).status).toBe(401);
  });

  it('returns 500 without leaking details when env is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await GET(req('GET'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server is not configured.' });
  });
});

describe('GET /api/brews', () => {
  it("returns the user's brews, newest first, with a capped limit", async () => {
    resolveQuery({ data: [{ id: 'b1' }], error: null });
    const res = await GET(req('GET', { query: '?limit=500' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brews: [{ id: 'b1' }] });
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockQuery.limit).toHaveBeenCalledWith(50);
  });

  it('filters by since and validates it', async () => {
    resolveQuery({ data: [], error: null });
    await GET(req('GET', { query: '?since=2026-10-01T00:00:00Z' }));
    expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00.000Z');
    expect((await GET(req('GET', { query: '?since=nope' }))).status).toBe(400);
  });
});

describe('POST /api/brews', () => {
  const brew = { coffee_name: 'Guji', brew_method: 'pour over', dose_g: 15 };

  it('inserts a validated brew for the configured user', async () => {
    const res = await POST(req('POST', { body: brew }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      coffee_name: 'Guji', brew_method: 'Pour Over', dose_g: 15, user_id: 'user-1', photo_url: null,
    }));
  });

  it('returns validation errors as 400 with details', async () => {
    const res = await POST(req('POST', { body: { brew_method: 'Siphon' } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details.join(' ')).toMatch(/coffee_name.*brew_method/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    expect((await POST(req('POST', { body: '{nope' }))).status).toBe(400);
  });

  it('dry_run validates without writing', async () => {
    const res = await POST(req('POST', { body: brew, query: '?dry_run=1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).brew.brew_method).toBe('Pour Over');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads a photo into the user folder and links it', async () => {
    const data = Buffer.from('fake-jpeg').toString('base64');
    const res = await POST(req('POST', { body: { ...brew, photo: { data, mime_type: 'image/jpeg' } } }));
    expect(res.status).toBe(201);
    const [path, bytes, opts] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^user-1\/\d+\.jpg$/);
    expect(bytes.toString()).toBe('fake-jpeg');
    expect(opts).toEqual({ contentType: 'image/jpeg' });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      photo_url: `https://cdn.test/brew-photos/${path}`,
    }));
  });

  it('rejects unsupported photo types', async () => {
    const res = await POST(req('POST', { body: { ...brew, photo: { data: 'aGk=', mime_type: 'image/gif' } } }));
    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('removes the uploaded photo if the insert fails', async () => {
    mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) });
    const data = Buffer.from('x').toString('base64');
    const res = await POST(req('POST', { body: { ...brew, photo: { data, mime_type: 'image/png' } } }));
    expect(res.status).toBe(500);
    expect(mockRemove).toHaveBeenCalledWith([mockUpload.mock.calls[0][0]]);
  });
});
