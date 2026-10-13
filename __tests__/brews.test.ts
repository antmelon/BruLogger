import { Platform } from 'react-native';
import {
  getBrews, getBrew, createBrew, updateBrew, deleteBrew, deleteBrewPhoto, getPhotoUrl, uploadBrewPhoto,
} from '../lib/brews';

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
const mockCreateSignedUrl = jest.fn();
const mockUpload = jest.fn();
const mockReadFile = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ arrayBuffer: () => mockReadFile(uri) })),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
    storage: {
      from: () => ({
        remove: (...args: unknown[]) => mockRemove(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
        upload: (...args: unknown[]) => mockUpload(...args),
      }),
    },
  },
}));

const mockBrew = {
  id: 'brew-1',
  user_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  coffee_id: 'coffee-1',
  coffee: { id: 'coffee-1', name: 'Ethiopia Yirgacheffe' },
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

  it('reads each brew with its coffee', async () => {
    mockOrder.mockResolvedValue({ data: [mockBrew], error: null });
    await getBrews();
    expect(mockSelect).toHaveBeenCalledWith('*, coffee:coffees(*)');
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
    expect(mockSelect).toHaveBeenCalledWith('*, coffee:coffees(*)');
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
    await expect(createBrew({ coffee_id: 'coffee-1', brew_method: 'Espresso' })).rejects.toThrow('Not authenticated');
  });

  it('inserts brew with user_id and returns created brew', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: mockBrew, error: null });

    const insertSelect = { single: mockSingle };
    const insertChain = { select: jest.fn().mockReturnValue(insertSelect) };
    mockInsert.mockReturnValue(insertChain);

    const result = await createBrew({ coffee_id: 'coffee-1', brew_method: 'Pour Over' });
    expect(result).toEqual(mockBrew);
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-1', coffee_id: 'coffee-1', brew_method: 'Pour Over' });
    expect(insertChain.select).toHaveBeenCalledWith('*, coffee:coffees(*)');
  });

  it('throws when Supabase insert returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const dbError = new Error('insert failed');
    const insertChain = { select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: dbError }) }) };
    mockInsert.mockReturnValue(insertChain);

    await expect(createBrew({ coffee_id: 'coffee-1', brew_method: 'Espresso' })).rejects.toEqual(dbError);
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
    await updateBrew('brew-1', { coffee_id: 'coffee-2', brew_method: 'Espresso', grind_size: null, dose_g: null });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ coffee_id: 'coffee-2', grind_size: null, dose_g: null }));
    expect(mockEq).toHaveBeenCalledWith('id', 'brew-1');
    expect(mockSelect).toHaveBeenCalledWith('*, coffee:coffees(*)');
  });
});

describe('deleteBrewPhoto', () => {
  it('removes the photo at its storage path', async () => {
    mockRemove.mockResolvedValue({ error: null });
    await deleteBrewPhoto('user-1/123.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['user-1/123.jpg']);
  });
});

describe('uploadBrewPhoto', () => {
  it('uploads a native photo file as bytes into the user\'s folder', async () => {
    // SDK 57's fetch (expo/fetch) rejects React Native's FormData {uri} parts
    expect(Platform.OS).toBe('ios');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const bytes = new ArrayBuffer(8);
    mockReadFile.mockResolvedValue(bytes);
    mockUpload.mockResolvedValue({ error: null });

    const path = await uploadBrewPhoto('file:///cache/ImageManipulator/abc.jpg');

    expect(mockReadFile).toHaveBeenCalledWith('file:///cache/ImageManipulator/abc.jpg');
    expect(path).toMatch(/^user-1\/\d+\.jpg$/);
    expect(mockUpload).toHaveBeenCalledWith(path, bytes, { contentType: 'image/jpeg' });
  });

  it('names the content type from the file extension', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockReadFile.mockResolvedValue(new ArrayBuffer(8));
    mockUpload.mockResolvedValue({ error: null });

    const path = await uploadBrewPhoto('file:///photos/IMG_1.HEIC');

    expect(path).toMatch(/^user-1\/\d+\.heic$/);
    expect(mockUpload).toHaveBeenCalledWith(path, expect.any(ArrayBuffer), { contentType: 'image/heic' });
  });

  it('throws when the upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockReadFile.mockResolvedValue(new ArrayBuffer(8));
    mockUpload.mockResolvedValue({ error: new Error('Payload too large') });
    await expect(uploadBrewPhoto('file:///cache/abc.jpg')).rejects.toThrow('Payload too large');
  });
});

describe('getPhotoUrl', () => {
  it('returns a signed link to the private photo, valid for an hour', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x.supabase.co/signed/abc' }, error: null });
    await expect(getPhotoUrl('user-1/123.jpg')).resolves.toBe('https://x.supabase.co/signed/abc');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/123.jpg', 3600);
  });

  it('throws when the link cannot be created', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: new Error('Object not found') });
    await expect(getPhotoUrl('user-1/missing.jpg')).rejects.toThrow('Object not found');
  });
});
