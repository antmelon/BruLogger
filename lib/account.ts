import { supabase } from './supabase';
import { PHOTO_BUCKET } from './storage';

/**
 * Permanently deletes the signed-in user's photos and account; their brews go with the account.
 * Photos go first: if that fails the account is untouched and the user can try again, whereas
 * deleting the account first could strand photos nobody can reach.
 */
export async function deleteAccount(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const paths = await listPhotos(user.id);
  for (let i = 0; i < paths.length; i += STORAGE_BATCH) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + STORAGE_BATCH));
    if (error) throw error;
  }

  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;

  // The server-side session was deleted with the user, so only this device's copy is left
  await supabase.auth.signOut({ scope: 'local' });
}

/** The Storage API lists, and removes, at most this many objects per request. */
const STORAGE_BATCH = 1000;

/** Every file under a folder of the photo bucket, including nested folders (listed with a null id). */
async function listPhotos(folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_BATCH) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(folder, { limit: STORAGE_BATCH, offset });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = `${folder}/${entry.name}`;
      if (entry.id === null) paths.push(...(await listPhotos(path)));
      else paths.push(path);
    }
    if (!data || data.length < STORAGE_BATCH) return paths;
  }
}
