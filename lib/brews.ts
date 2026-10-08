import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Brew, BrewInsert } from '../types';
import { PHOTO_BUCKET, photoPathFromUrl } from './storage';

export async function getBrews(): Promise<Brew[]> {
  const { data, error } = await supabase
    .from('brews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBrew(id: string): Promise<Brew> {
  const { data, error } = await supabase
    .from('brews')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createBrew(brew: BrewInsert): Promise<Brew> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('brews')
    .insert({ ...brew, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBrew(id: string, brew: Partial<BrewInsert>): Promise<Brew> {
  const { data, error } = await supabase
    .from('brews')
    .update(brew)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrew(id: string): Promise<void> {
  const { error } = await supabase
    .from('brews')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

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

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function deleteBrewPhoto(publicUrl: string): Promise<void> {
  const path = photoPathFromUrl(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}
