import { getBrews, getBrew, createBrew, updateBrew, deleteBrew, deleteBrewPhoto } from '../lib/brews';

const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockRemove = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
    storage: {
      from: () => ({ remove: (...args: unknown[]) => mockRemove(...args) }),
    },
  },
}));

const mockBrew = {
  id: 'brew-1',
  user_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  coffee_name: 'Ethiopia Yirgacheffe',
  brew_method: 'Pour Over',
};

beforeEach(() => {
  jest.clearAllMocks();

  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });
  mockEq.mockReturnValue({ select: mockSelect, single: mockSingle });
});

describe('getBrews', () => {
  it('returns brews on success', async () => {
    mockOrder.mockResolvedValue({ data: [mockBrew], error: null });
    const result = await getBrews();
    expect(result).toEqual([mockBrew]);
    expect(mockFrom).toHaveBeenCalledWith('brews');
  });

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });
    const result = await getBrews();
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = new Error('connection failed');
    mockOrder.mockResolvedValue({ data: null, error: dbError });
    await expect(getBrews()).rejects.toEqual(dbError);
  });
});

describe('getBrew', () => {
  it('returns a single brew by id', async () => {
    mockSingle.mockResolvedValue({ data: mockBrew, error: null });
    const result = await getBrew('brew-1');
    expect(result).toEqual(mockBrew);
    expect(mockEq).toHaveBeenCalledWith('id', 'brew-1');
  });

  it('throws when brew is not found', async () => {
    const notFoundError = { code: 'PGRST116', message: 'Row not found' };
    mockSingle.mockResolvedValue({ data: null, error: notFoundError });
    await expect(getBrew('missing')).rejects.toEqual(notFoundError);
  });
});

describe('createBrew', () => {
  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(createBrew({ coffee_name: 'Test', brew_method: 'Espresso' })).rejects.toThrow('Not authenticated');
  });

  it('inserts brew with user_id and returns created brew', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: mockBrew, error: null });

    const insertSelect = { single: mockSingle };
    const insertChain = { select: jest.fn().mockReturnValue(insertSelect) };
    mockInsert.mockReturnValue(insertChain);

    const result = await createBrew({ coffee_name: 'Ethiopia Yirgacheffe', brew_method: 'Pour Over' });
    expect(result).toEqual(mockBrew);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', coffee_name: 'Ethiopia Yirgacheffe' }),
    );
  });

  it('throws when Supabase insert returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const dbError = new Error('insert failed');
    const insertChain = { select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: dbError }) }) };
    mockInsert.mockReturnValue(insertChain);

    await expect(createBrew({ coffee_name: 'Test', brew_method: 'Espresso' })).rejects.toEqual(dbError);
  });
});

describe('deleteBrew', () => {
  it('calls delete with the correct id', async () => {
    mockEq.mockResolvedValue({ error: null });
    await deleteBrew('brew-1');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'brew-1');
  });

  it('throws when Supabase delete returns an error', async () => {
    const dbError = new Error('delete failed');
    mockEq.mockResolvedValue({ error: dbError });
    await expect(deleteBrew('brew-1')).rejects.toEqual(dbError);
  });
});

describe('updateBrew', () => {
  it('sends null fields through so cleared values are persisted', async () => {
    mockSingle.mockResolvedValue({ data: mockBrew, error: null });
    await updateBrew('brew-1', { coffee_name: 'Test', brew_method: 'Espresso', roaster: null, dose_g: null });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ roaster: null, dose_g: null }));
    expect(mockEq).toHaveBeenCalledWith('id', 'brew-1');
  });
});

describe('deleteBrewPhoto', () => {
  it('removes the storage path parsed from the public URL', async () => {
    mockRemove.mockResolvedValue({ error: null });
    await deleteBrewPhoto('https://x.supabase.co/storage/v1/object/public/brew-photos/user-1/123.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['user-1/123.jpg']);
  });

  it('does nothing for URLs outside the brew-photos bucket', async () => {
    await deleteBrewPhoto('https://example.com/other.jpg');
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
