/**
 * @jest-environment node
 */
import { APIError } from '@anthropic-ai/sdk';
import { DAILY_LIMIT, POST } from '../api/coffees/scan';
import { BagScan } from '../lib/bagScan';

const mockGetUser = jest.fn();
const mockRpc = jest.fn();
const mockCount = jest.fn();
const mockReadBag = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({ select: () => ({ eq: () => ({ gte: () => mockCount() }) }) }),
  }),
}));

jest.mock('../server/bagScan', () => ({
  DEFAULT_BAG_SCAN_MODEL: 'anthropic/default-model',
  readBag: (...args: unknown[]) => mockReadBag(...args),
}));

const PHOTO = { data: Buffer.from('jpeg bytes').toString('base64'), mime_type: 'image/jpeg' };

const SCAN: BagScan = {
  is_coffee_bag: true, name: 'Guji Hambela', roaster: 'Onyx', origin: null, roast_level: null,
  varietal: null, process: 'Natural', tasting_notes: null, roast_date: '2026-10-03', bag_size: '10 oz',
};

function req({ token = 'session-token', oidc = 'oidc-token', body = { photo: PHOTO, today: '2026-10-14' } as unknown } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (oidc) headers['x-vercel-oidc-token'] = oidc;
  return new Request('https://brulogger.test/api/coffees/scan', { method: 'POST', headers, body: JSON.stringify(body) });
}

const reads = (scan: BagScan | null) =>
  mockReadBag.mockResolvedValue({ scan, model: 'anthropic/claude-test', inputTokens: 1500, outputTokens: 120 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  delete process.env.BAG_SCAN_MODEL;
  delete process.env.VERCEL_OIDC_TOKEN;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mockRpc.mockImplementation(async (name: string) => ({ data: name === 'claim_ai_use' ? 41 : null, error: null }));
  mockCount.mockResolvedValue({ count: 3, error: null });
  reads(SCAN);
});

describe('POST /api/coffees/scan', () => {
  it('reads the bag and answers with the coffee form fields and the scans left today', async () => {
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      coffee: { name: 'Guji Hambela', roaster: 'Onyx', processingMethod: 'Natural', roastDate: 'Oct 3, 2026', bagSize: '283' },
      remaining: DAILY_LIMIT - 3,
    });
    expect(mockGetUser).toHaveBeenCalledWith('session-token');
    expect(mockRpc).toHaveBeenCalledWith('claim_ai_use', { feature: 'bag_scan', daily_limit: DAILY_LIMIT });
    expect(mockReadBag).toHaveBeenCalledWith({
      image: PHOTO.data, mimeType: 'image/jpeg', token: 'oidc-token', today: '2026-10-14', model: 'anthropic/default-model',
    });
    expect(mockRpc).toHaveBeenCalledWith('finish_ai_use', {
      use_id: 41, model: 'anthropic/claude-test', input_tokens: 1500, output_tokens: 120,
    });
  });

  it('uses BAG_SCAN_MODEL, and the pulled OIDC token when running locally', async () => {
    process.env.BAG_SCAN_MODEL = 'anthropic/other-model';
    process.env.VERCEL_OIDC_TOKEN = 'local-oidc';
    await POST(req({ oidc: '' }));
    expect(mockReadBag).toHaveBeenCalledWith(expect.objectContaining({ model: 'anthropic/other-model', token: 'local-oidc' }));
  });

  it('needs a signed-in caller', async () => {
    expect((await POST(req({ token: '' }))).status).toBe(401);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    expect((await POST(req())).status).toBe(401);
    expect(mockReadBag).not.toHaveBeenCalled();
  });

  it('turns away a missing photo or one the model can\'t take', async () => {
    expect((await POST(req({ body: { today: '2026-10-14' } }))).status).toBe(400);
    expect((await POST(req({ body: { photo: { ...PHOTO, mime_type: 'image/heic' } } }))).status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('stops at the daily limit without asking the model', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/10 bags in the last 24 hours/);
    expect(mockReadBag).not.toHaveBeenCalled();
  });

  it('says so when the photo isn\'t a bag, nothing could be read, or the model declined', async () => {
    reads({ ...SCAN, is_coffee_bag: false });
    expect((await (await POST(req())).json()).error).toMatch(/doesn't look like a coffee bag/);
    reads({ ...SCAN, name: null, roaster: null, process: null, roast_date: null, bag_size: null });
    expect((await POST(req())).status).toBe(422);
    reads(null);
    expect((await POST(req())).status).toBe(422);
    // The model still ran, so the use is recorded
    expect(mockRpc).toHaveBeenCalledWith('finish_ai_use', expect.anything());
  });

  it('pauses when the AI Gateway is out of credits, over budget or has no card', async () => {
    mockReadBag.mockRejectedValue(APIError.generate(402, { error: { message: 'quota' } }, 'quota', new Headers()));
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/paused/);
    const noCard = { error: { message: 'requires a valid credit card', type: 'customer_verification_required' } };
    mockReadBag.mockRejectedValue(APIError.generate(403, noCard, 'no card', new Headers()));
    expect((await (await POST(req())).json()).error).toMatch(/paused/);
  });

  it('asks for a retry when the model is busy, and reports other failures', async () => {
    mockReadBag.mockRejectedValue(APIError.generate(429, { error: { message: 'slow down' } }, 'slow down', new Headers()));
    expect((await (await POST(req())).json()).error).toMatch(/busy/);
    mockReadBag.mockRejectedValue(new Error('socket hang up'));
    expect((await POST(req())).status).toBe(502);
    expect(console.error).toHaveBeenCalled();
  });

  it('fails cleanly without an OIDC token or when the limit can\'t be checked', async () => {
    expect((await POST(req({ oidc: '' }))).status).toBe(500);
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function missing' } });
    expect((await POST(req())).status).toBe(500);
    expect(mockReadBag).not.toHaveBeenCalled();
  });
});
