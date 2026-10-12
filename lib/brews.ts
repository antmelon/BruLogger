import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Brew, BrewInsert } from '../types';
import { PHOTO_BUCKET } from './storage';

// Every brew is read with its coffee. The generated types still allow a brew without one, but the
// database links every brew to a coffee (step 1 of the coffees migration), hence the casts; step 2
// makes coffee_id required. The coffee details copied onto brews for app 1.0.0 come back too, and
// the Brew type leaves them out so nothing reads them.
const WITH_COFFEE = '*, coffee:coffees(*)';

export async function getBrews(): Promise<Brew[]> {
  const { data, error } = await supabase
    .from('brews')
    .select(WITH_COFFEE)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Brew[];
}

export async function getBrew(id: string): Promise<Brew> {
  const { data, error } = await supabase
    .from('brews')
    .select(WITH_COFFEE)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Brew;
}

export async function createBrew(brew: BrewInsert): Promise<Brew> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('brews')
    .insert({ ...brew, user_id: user.id })
    .select(WITH_COFFEE)
    .single();

  if (error) throw error;
  return data as Brew;
}

export async function updateBrew(id: string, brew: Partial<BrewInsert>): Promise<Brew> {
  const { data, error } = await supabase
    .from('brews')
    .update(brew)
    .eq('id', id)
    .select(WITH_COFFEE)
    .single();

  if (error) throw error;
  return data as Brew;
}

export async function deleteBrew(id: string): Promise<void> {
  const { error } = await supabase
    .from('brews')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Uploads a photo into the user's folder and returns its storage path (brews.photo_path). */
export async function uploadBrewPhoto(localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let body: Blob | FormData;
  let filename: string;

  if (Platform.OS === 'web') {
    // Web picker URIs are data:/blob: URLs with no file extension; derive it from the blob type
    const blob = await (await fetch(localUri)).blob();
    const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    filename = `${user.id}/${Date.now()}.${ext}`;
    body = blob;
  } else {
    // Native: upload via FormData so RN streams the file (fetch().blob() broke iOS uploads, see a1fbb5d)
    const ext = localUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    filename = `${user.id}/${Date.now()}.${ext}`;
    body = new FormData();
    body.append('file', {
      uri: localUri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    } as unknown as Blob);
  }

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(filename, body);
  if (error) throw error;
  return filename;
}

/** A temporary link to a photo; the bucket is private. */
export async function getPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBrewPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}
