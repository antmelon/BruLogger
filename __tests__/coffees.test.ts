import { createCoffee, deleteCoffee, getCoffees, updateCoffee } from '../lib/coffees';

const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  },
}));

const mockCoffee = { id: 'coffee-1', user_id: 'user-1', name: 'Kenya AA', roaster: 'Sey' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockReturnValue({ order: mockOrder, single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete });
});

describe('getCoffees', () => {
  it("returns the user's coffees, newest first", async () => {
    mockOrder.mockResolvedValue({ data: [mockCoffee], error: null });
    await expect(getCoffees()).resolves.toEqual([mockCoffee]);
    expect(mockFrom).toHaveBeenCalledWith('coffees');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = new Error('connection failed');
    mockOrder.mockResolvedValue({ data: null, error: dbError });
    await expect(getCoffees()).rejects.toEqual(dbError);
  });
});

describe('createCoffee', () => {
  it('saves the coffee for the signed-in user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: mockCoffee, error: null });
    await expect(createCoffee({ name: 'Kenya AA', roaster: 'Sey' })).resolves.toEqual(mockCoffee);
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Kenya AA', roaster: 'Sey', user_id: 'user-1' });
  });

  it('throws when the user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(createCoffee({ name: 'Kenya AA' })).rejects.toThrow('Not authenticated');
  });
});

describe('updateCoffee', () => {
  it('sends null fields through so cleared values are persisted', async () => {
    mockSingle.mockResolvedValue({ data: mockCoffee, error: null });
    await updateCoffee('coffee-1', { roaster: null, finished_at: '2026-10-12T00:00:00Z' });
    expect(mockUpdate).toHaveBeenCalledWith({ roaster: null, finished_at: '2026-10-12T00:00:00Z' });
    expect(mockEq).toHaveBeenCalledWith('id', 'coffee-1');
  });
});

describe('deleteCoffee', () => {
  it('deletes the coffee by id', async () => {
    mockEq.mockResolvedValue({ error: null });
    await deleteCoffee('coffee-1');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'coffee-1');
  });

  it('explains why a coffee that still has brews was not deleted', async () => {
    mockEq.mockResolvedValue({ error: { code: '23503', message: 'violates foreign key constraint' } });
    await expect(deleteCoffee('coffee-1')).rejects.toThrow(
      'This coffee has brews, so it can’t be deleted. Mark it as finished instead.',
    );
  });
});
