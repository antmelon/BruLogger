/**
 * @jest-environment node
 */
import { GET, POST } from '../api/brews';
import { DELETE, GET as GET_ONE, PATCH } from '../api/brews/[id]';

const mockInsert = jest.fn();
const mockQuery = {
  select: jest.fn(), eq: jest.fn(), order: jest.fn(), limit: jest.fn(), gte: jest.fn(), or: jest.fn(),
  update: jest.fn(), delete: jest.fn(), single: jest.fn(), maybeSingle: jest.fn(),
};
// Awaiting the query builder resolves to the next queued result, else to mockQueryResult
type Result = { data: unknown; error: unknown };
let mockQueryResult: Result = { data: [], error: null };
let mockQueuedResults: Result[] = [];
const mockBuilder = Object.assign(mockQuery, {
  then: (resolve: (v: unknown) => void) => resolve(mockQueuedResults.shift() ?? mockQueryResult),
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

function req(
  method: string,
  { token = TOKEN, body, query = '', path = '', headers: extra = {} }:
    { token?: string | null; body?: unknown; query?: string; path?: string; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  Object.assign(headers, extra);
  return new Request(BASE + path + query, {
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

  for (const fn of Object.values(mockQuery).filter(jest.isMockFunction)) {
    fn.mockReturnValue(mockBuilder);
  }
  mockQueryResult = { data: [], error: null };
  mockQueuedResults = [];
  mockInsert.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: 'b1' }, error: null }) }) });
  mockUpload.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
});

function resolveQuery(result: Result) {
  mockQueryResult = result;
}

/** Results for consecutive queries, in order (e.g. the lookup, then the update). */
function queueResults(...results: Result[]) {
  mockQueuedResults = results;
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

  it('searches coffee name, roaster and origin with q, case-insensitively', async () => {
    await GET(req('GET', { query: `?q=${encodeURIComponent('  Guji, "Hambela" (x)* ')}` }));
    // PostgREST filter syntax characters are stripped so the search can't change the query
    expect(mockQuery.or).toHaveBeenCalledWith(
      'coffee_name.ilike."%Guji Hambela x%",roaster.ilike."%Guji Hambela x%",origin.ilike."%Guji Hambela x%"',
    );
    mockQuery.or.mockClear();
    await GET(req('GET', { query: '?q=%20' }));
    expect(mockQuery.or).not.toHaveBeenCalled();
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

describe('POST /api/brews with an Idempotency-Key', () => {
  const brew = { coffee_name: 'Guji', brew_method: 'Pour Over' };
  const photo = { data: Buffer.from('x').toString('base64'), mime_type: 'image/jpeg' };

  it('returns the brew already saved under that key instead of saving it again', async () => {
    resolveQuery({ data: { id: 'b1', coffee_name: 'Guji' }, error: null });
    const res = await POST(req('POST', { body: { ...brew, photo }, headers: { 'idempotency-key': 'draft-42' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: 'b1', coffee_name: 'Guji' }, replayed: true });
    expect(mockQuery.eq).toHaveBeenCalledWith('idempotency_key', 'draft-42');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('stores the key with a new brew, and rejects a blank or overlong key', async () => {
    resolveQuery({ data: null, error: null }); // no brew saved under this key yet
    const res = await POST(req('POST', { body: brew, headers: { 'idempotency-key': 'draft-43' } }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: 'draft-43' }));

    for (const key of [' ', 'k'.repeat(256)]) {
      const bad = await POST(req('POST', { body: brew, headers: { 'idempotency-key': key } }));
      expect(bad.status).toBe(400);
    }
  });

  it('returns the brew from a concurrent save with the same key, cleaning up its own photo', async () => {
    queueResults(
      { data: null, error: null }, // lookup: not saved yet
      { data: { id: 'b1' }, error: null }, // lookup after the unique-index conflict
    );
    mockInsert.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) }),
    });
    const res = await POST(req('POST', { body: { ...brew, photo }, headers: { 'idempotency-key': 'draft-44' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: 'b1' }, replayed: true });
    expect(mockRemove).toHaveBeenCalledWith([mockUpload.mock.calls[0][0]]);
  });
});

const ID = '6f1c2b0e-8a4d-4c3e-9b7a-2d5e8f1a3c4b';

describe('GET /api/brews/:id', () => {
  it("returns one of the user's brews, or 404", async () => {
    resolveQuery({ data: { id: ID, coffee_name: 'Guji' }, error: null });
    const res = await GET_ONE(req('GET', { path: `/${ID}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: ID, coffee_name: 'Guji' } });
    expect(mockQuery.eq).toHaveBeenCalledWith('id', ID);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');

    resolveQuery({ data: null, error: null });
    expect((await GET_ONE(req('GET', { path: `/${ID}` }))).status).toBe(404);
    mockQuery.select.mockClear();
    expect((await GET_ONE(req('GET', { path: '/not-a-uuid' }))).status).toBe(404);
    expect(mockQuery.select).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/brews/:id', () => {
  it("updates only the fields sent, on the user's brew", async () => {
    queueResults(
      { data: { id: ID, photo_url: null }, error: null }, // lookup
      { data: { id: ID, dose_g: 16, roaster: null }, error: null }, // update
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { dose_g: '16', roaster: null } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: ID, dose_g: 16, roaster: null } });
    expect(mockQuery.update).toHaveBeenCalledWith({ dose_g: 16, roaster: null });
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it("rejects invalid or empty changes, and 404s for a brew that isn't the user's", async () => {
    expect((await PATCH(req('PATCH', { path: `/${ID}`, body: { coffee_name: null } }))).status).toBe(400);
    const empty = await PATCH(req('PATCH', { path: `/${ID}`, body: {} }));
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe('Nothing to update.');
    resolveQuery({ data: null, error: null });
    expect((await PATCH(req('PATCH', { path: `/${ID}`, body: { dose_g: 16 } }))).status).toBe(404);
    expect(mockQuery.update).not.toHaveBeenCalled();
  });

  it('replaces the photo, deleting the old file only after the update succeeds', async () => {
    queueResults(
      { data: { id: ID, photo_url: 'https://cdn.test/brew-photos/user-1/old.jpg' }, error: null },
      { data: { id: ID }, error: null },
    );
    const data = Buffer.from('new').toString('base64');
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { photo: { data, mime_type: 'image/png' } } }));
    expect(res.status).toBe(200);
    const [path] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^user-1\/\d+\.png$/);
    expect(mockQuery.update).toHaveBeenCalledWith({ photo_url: `https://cdn.test/brew-photos/${path}` });
    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
  });

  it('removes the photo with photo: null', async () => {
    queueResults(
      { data: { id: ID, photo_url: 'https://cdn.test/brew-photos/user-1/old.jpg' }, error: null },
      { data: { id: ID, photo_url: null }, error: null },
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { photo: null } }));
    expect(res.status).toBe(200);
    expect(mockQuery.update).toHaveBeenCalledWith({ photo_url: null });
    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('removes the newly uploaded photo and keeps the old one if the update fails', async () => {
    queueResults(
      { data: { id: ID, photo_url: 'https://cdn.test/brew-photos/user-1/old.jpg' }, error: null },
      { data: null, error: { message: 'boom' } },
    );
    const data = Buffer.from('new').toString('base64');
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { photo: { data, mime_type: 'image/jpeg' } } }));
    expect(res.status).toBe(500);
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith([mockUpload.mock.calls[0][0]]);
  });
});

describe('DELETE /api/brews/:id', () => {
  it("deletes the user's brew, then its photo, and returns what was deleted", async () => {
    const brew = { id: ID, coffee_name: 'Guji', photo_url: 'https://cdn.test/brew-photos/user-1/p.jpg' };
    queueResults({ data: brew, error: null }, { data: null, error: null });
    const res = await DELETE(req('DELETE', { path: `/${ID}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: brew });
    expect(mockQuery.delete).toHaveBeenCalled();
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockRemove).toHaveBeenCalledWith(['user-1/p.jpg']);

    resolveQuery({ data: null, error: null });
    expect((await DELETE(req('DELETE', { path: `/${ID}` }))).status).toBe(404);
  });
});
