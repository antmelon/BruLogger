import { supabase } from './supabase';
import { Brew, BrewInsert } from '../types';

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

  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const filename = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('brew-photos')
    .upload(filename, blob, { contentType: blob.type || `image/${ext}` });
  if (error) throw error;

  const { data } = supabase.storage.from('brew-photos').getPublicUrl(filename);
  return data.publicUrl;
}
