import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { Brew, BrewInsert } from '../types';
import { PHOTO_BUCKET } from './storage';

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

/** Uploads a photo into the user's folder and returns its storage path (brews.photo_path). */
export async function uploadBrewPhoto(localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let body: Blob | ArrayBuffer;
  let filename: string;
  let contentType: string | undefined;

  if (Platform.OS === 'web') {
    // Web picker URIs are data:/blob: URLs with no file extension; derive it from the blob type
    const blob = await (await fetch(localUri)).blob();
    const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    filename = `${user.id}/${Date.now()}.${ext}`;
    body = blob;
  } else {
    // Native: the file's bytes. Since SDK 57 the global fetch is Expo's, which rejects React
    // Native's FormData {uri} parts ("Unsupported FormDataPart implementation"), and RN's Blobs
    // never uploaded from iOS (a1fbb5d). Photos are resized first, so reading one whole is fine.
    const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
    filename = `${user.id}/${Date.now()}.${ext}`;
    body = await new File(localUri).arrayBuffer();
    contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filename, body, contentType ? { contentType } : undefined);
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
