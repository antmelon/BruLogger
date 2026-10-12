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
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table);
      return { ...mockBuilder, insert: mockInsert };
    },
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
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

/** What consecutive inserts return (the coffee, then the brew), in order. */
function insertsReturn(...results: Result[]) {
  for (const result of results) {
    mockInsert.mockReturnValueOnce({ select: () => ({ single: () => Promise.resolve(result) }) });
  }
}

const COFFEE_ID = 'c0ffee00-0000-4000-8000-000000000001';
const GUJI = {
  id: COFFEE_ID, user_id: 'user-1', created_at: '2026-10-01T00:00:00Z', name: 'Guji', roaster: 'Onyx',
  origin: null, roast_level: null, varietal: null, processing_method: null, roaster_notes: null,
  roast_date: null, bag_size_g: null, finished_at: null,
};

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
    expect(mockQuery.select).toHaveBeenCalledWith('*, coffee:coffees!inner(*)');
  });

  it('filters by since and validates it', async () => {
    resolveQuery({ data: [], error: null });
    await GET(req('GET', { query: '?since=2026-10-01T00:00:00Z' }));
    expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00.000Z');
    expect((await GET(req('GET', { query: '?since=nope' }))).status).toBe(400);
  });

  it("searches the coffee's name, roaster and origin with q, case-insensitively", async () => {
    await GET(req('GET', { query: `?q=${encodeURIComponent('  Guji, "Hambela" (x)* ')}` }));
    // PostgREST filter syntax characters are stripped so the search can't change the query
    expect(mockQuery.or).toHaveBeenCalledWith(
      'name.ilike."%Guji Hambela x%",roaster.ilike."%Guji Hambela x%",origin.ilike."%Guji Hambela x%"',
      { referencedTable: 'coffee' },
    );
    mockQuery.or.mockClear();
    await GET(req('GET', { query: '?q=%20' }));
    expect(mockQuery.or).not.toHaveBeenCalled();
  });
});

describe('POST /api/brews', () => {
  const brew = { coffee_name: 'Guji', roaster: 'Onyx', brew_method: 'pour over', dose_g: 15 };

  it("saves a brew of a new coffee, made from the details sent, for the configured user", async () => {
    resolveQuery({ data: [], error: null }); // the user's coffees: none match
    insertsReturn({ data: { ...GUJI, id: 'c-new' }, error: null }, { data: { id: 'b1' }, error: null });
    const res = await POST(req('POST', { body: brew }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenNthCalledWith(1, { name: 'Guji', roaster: 'Onyx', user_id: 'user-1' });
    expect(mockInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      brew_method: 'Pour Over', dose_g: 15, coffee_id: 'c-new', user_id: 'user-1', photo_path: null,
    }));
    expect(mockFrom.mock.calls.map(([t]) => t)).toEqual(['coffees', 'coffees', 'brews']);
  });

  it("uses the user's matching coffee, filling in details it didn't have", async () => {
    queueResults(
      { data: [{ ...GUJI, name: 'guji', roaster: 'ONYX' }], error: null }, // the user's coffees
      { data: null, error: null }, // the fill-in update
    );
    const res = await POST(req('POST', { body: { ...brew, origin: 'Ethiopia' } }));
    expect(res.status).toBe(201);
    expect(mockQuery.update).toHaveBeenCalledWith({ origin: 'Ethiopia' });
    expect(mockQuery.eq).toHaveBeenCalledWith('id', COFFEE_ID);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ coffee_id: COFFEE_ID }));
  });

  it("takes a coffee_id, which has to be one of the user's coffees", async () => {
    resolveQuery({ data: GUJI, error: null });
    const res = await POST(req('POST', { body: { coffee_id: COFFEE_ID, brew_method: 'Espresso' } }));
    expect(res.status).toBe(201);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ coffee_id: COFFEE_ID }));

    mockInsert.mockClear();
    resolveQuery({ data: null, error: null });
    const unknown = await POST(req('POST', { body: { coffee_id: COFFEE_ID, brew_method: 'Espresso' } }));
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).details).toEqual(['No coffee with that coffee_id.']);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns validation errors as 400 with details', async () => {
    const res = await POST(req('POST', { body: { brew_method: 'Siphon' } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details.join(' ')).toMatch(/coffee_name/);
    expect(body.details.join(' ')).toMatch(/brew_method/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    expect((await POST(req('POST', { body: '{nope' }))).status).toBe(400);
  });

  it('dry_run validates without writing, showing the coffee it would use or create', async () => {
    resolveQuery({ data: [GUJI], error: null });
    const res = await POST(req('POST', { body: brew, query: '?dry_run=1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brew.brew_method).toBe('Pour Over');
    expect(body.brew.coffee).toEqual(GUJI);

    resolveQuery({ data: [], error: null });
    const fresh = await (await POST(req('POST', { body: { ...brew, roast_date: '2026-10-05' }, query: '?dry_run=1' }))).json();
    expect(fresh.brew.coffee).toEqual({ id: null, name: 'Guji', roaster: 'Onyx', roast_date: '2026-10-05' });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockQuery.update).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('uploads a photo into the user folder and stores its path', async () => {
    resolveQuery({ data: [GUJI], error: null });
    const data = Buffer.from('fake-jpeg').toString('base64');
    const res = await POST(req('POST', { body: { ...brew, photo: { data, mime_type: 'image/jpeg' } } }));
    expect(res.status).toBe(201);
    const [path, bytes, opts] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^user-1\/\d+\.jpg$/);
    expect(bytes.toString()).toBe('fake-jpeg');
    expect(opts).toEqual({ contentType: 'image/jpeg' });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      photo_path: path,
    }));
  });

  it('rejects unsupported photo types', async () => {
    const res = await POST(req('POST', { body: { ...brew, photo: { data: 'aGk=', mime_type: 'image/gif' } } }));
    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('removes the uploaded photo and the coffee it just created if the brew fails to save', async () => {
    resolveQuery({ data: [], error: null });
    insertsReturn({ data: { ...GUJI, id: 'c-new' }, error: null }, { data: null, error: { message: 'boom' } });
    const data = Buffer.from('x').toString('base64');
    const res = await POST(req('POST', { body: { ...brew, photo: { data, mime_type: 'image/png' } } }));
    expect(res.status).toBe(500);
    expect(mockRemove).toHaveBeenCalledWith([mockUpload.mock.calls[0][0]]);
    expect(mockQuery.delete).toHaveBeenCalled();
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'c-new');
  });

  it("keeps an existing coffee when the brew fails to save", async () => {
    resolveQuery({ data: [GUJI], error: null });
    insertsReturn({ data: null, error: { message: 'boom' } });
    expect((await POST(req('POST', { body: brew }))).status).toBe(500);
    expect(mockQuery.delete).not.toHaveBeenCalled();
  });
});

describe('POST /api/brews with an Idempotency-Key', () => {
  const brew = { coffee_name: 'Guji', roaster: 'Onyx', brew_method: 'Pour Over' };
  const photo = { data: Buffer.from('x').toString('base64'), mime_type: 'image/jpeg' };

  it('returns the brew already saved under that key instead of saving it again', async () => {
    queueResults(
      { data: [], error: null }, // the user's coffees
      { data: { id: 'b1', coffee: GUJI }, error: null }, // the brew saved under the key
    );
    const res = await POST(req('POST', { body: { ...brew, photo }, headers: { 'idempotency-key': 'draft-42' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: 'b1', coffee: GUJI }, replayed: true });
    expect(mockQuery.eq).toHaveBeenCalledWith('idempotency_key', 'draft-42');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('stores the key with a new brew, and rejects a blank or overlong key', async () => {
    queueResults({ data: [GUJI], error: null }, { data: null, error: null }); // no brew under this key yet
    const res = await POST(req('POST', { body: brew, headers: { 'idempotency-key': 'draft-43' } }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: 'draft-43' }));

    for (const key of [' ', 'k'.repeat(256)]) {
      const bad = await POST(req('POST', { body: brew, headers: { 'idempotency-key': key } }));
      expect(bad.status).toBe(400);
    }
  });

  it('returns the brew from a concurrent save with the same key, cleaning up its own photo and coffee', async () => {
    queueResults(
      { data: [], error: null }, // the user's coffees
      { data: null, error: null }, // lookup: not saved yet
      { data: null, error: null }, // discarding the coffee it created
      { data: { id: 'b1' }, error: null }, // lookup after the unique-index conflict
    );
    insertsReturn(
      { data: { ...GUJI, id: 'c-new' }, error: null },
      { data: null, error: { code: '23505', message: 'duplicate key' } },
    );
    const res = await POST(req('POST', { body: { ...brew, photo }, headers: { 'idempotency-key': 'draft-44' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: 'b1' }, replayed: true });
    expect(mockRemove).toHaveBeenCalledWith([mockUpload.mock.calls[0][0]]);
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'c-new');
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
      { data: { id: ID, photo_path: null, coffee: GUJI }, error: null }, // lookup
      { data: { id: ID, dose_g: 16, grind_size: null }, error: null }, // update
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { dose_g: '16', grind_size: null } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: { id: ID, dose_g: 16, grind_size: null } });
    expect(mockQuery.update).toHaveBeenCalledWith({ dose_g: 16, grind_size: null });
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockFrom).not.toHaveBeenCalledWith('coffees');
  });

  it("edits the brew's coffee when other coffee details change, so every brew of it changes", async () => {
    const edited = { id: ID, coffee: { ...GUJI, origin: 'Ethiopia' } };
    queueResults(
      { data: { id: ID, photo_path: null, coffee: GUJI }, error: null }, // lookup
      { data: null, error: null }, // the coffee update
      { data: edited, error: null }, // the brew, read back
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { origin: 'Ethiopia', roast_level: 'light', roaster: 'onyx' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ brew: edited });
    expect(mockQuery.update).toHaveBeenCalledTimes(1);
    expect(mockQuery.update).toHaveBeenCalledWith({ origin: 'Ethiopia', roast_level: 'Light', roaster: 'onyx' });
    expect(mockQuery.eq).toHaveBeenCalledWith('id', COFFEE_ID);
  });

  it('moves the brew to the coffee a new name or roaster describes, creating it if needed', async () => {
    queueResults(
      { data: { id: ID, photo_path: null, coffee: GUJI }, error: null }, // lookup
      { data: [GUJI], error: null }, // the user's coffees: no Kenya AA from Onyx
      { data: { id: ID }, error: null }, // the brew update
    );
    insertsReturn({ data: { ...GUJI, id: 'c-new', name: 'Kenya AA' }, error: null });
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { coffee_name: 'Kenya AA', origin: 'Kenya' } }));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Kenya AA', roaster: 'Onyx', origin: 'Kenya', user_id: 'user-1' });
    expect(mockQuery.update).toHaveBeenCalledWith({ coffee_id: 'c-new' });
  });

  it("moves the brew to another of the user's coffees by coffee_id", async () => {
    queueResults(
      { data: { id: ID, photo_path: null, coffee: GUJI }, error: null }, // lookup
      { data: { ...GUJI, id: COFFEE_ID }, error: null }, // the coffee is the user's
      { data: { id: ID }, error: null }, // the brew update
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { coffee_id: COFFEE_ID } }));
    expect(res.status).toBe(200);
    expect(mockQuery.update).toHaveBeenCalledWith({ coffee_id: COFFEE_ID });
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
      { data: { id: ID, photo_path: 'user-1/old.jpg' }, error: null },
      { data: { id: ID }, error: null },
    );
    const data = Buffer.from('new').toString('base64');
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { photo: { data, mime_type: 'image/png' } } }));
    expect(res.status).toBe(200);
    const [path] = mockUpload.mock.calls[0];
    expect(path).toMatch(/^user-1\/\d+\.png$/);
    expect(mockQuery.update).toHaveBeenCalledWith({ photo_path: path });
    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
  });

  it('removes the photo with photo: null', async () => {
    queueResults(
      { data: { id: ID, photo_path: 'user-1/old.jpg' }, error: null },
      { data: { id: ID, photo_path: null }, error: null },
    );
    const res = await PATCH(req('PATCH', { path: `/${ID}`, body: { photo: null } }));
    expect(res.status).toBe(200);
    expect(mockQuery.update).toHaveBeenCalledWith({ photo_path: null });
    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('removes the newly uploaded photo and keeps the old one if the update fails', async () => {
    queueResults(
      { data: { id: ID, photo_path: 'user-1/old.jpg' }, error: null },
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
    const brew = { id: ID, coffee_name: 'Guji', photo_path: 'user-1/p.jpg' };
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

describe('unexpected errors', () => {
  it('answers 500 instead of crashing when a handler throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockQuery.order.mockImplementation(() => {
      throw new TypeError('boom');
    });

    const res = await GET(req('GET'));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong.' });
  });
});
