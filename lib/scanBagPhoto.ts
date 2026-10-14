import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { CoffeeFormValues } from './form';

// Snap the bag, the app's side: sends a bag photo (shrunk by prepareForUpload first) to
// api/coffees/scan.ts and returns the coffee form fields read off it.

/** The website calls its own API (so a preview uses its own); the iPhone app calls production. */
const API_ORIGIN = Platform.OS === 'web' ? '' : 'https://www.brulogger.com';

export interface BagScanResult {
  coffee: Partial<CoffeeFormValues>;
  /** Scans left in the last 24 hours, when known */
  remaining: number | null;
}

/** A local photo's bytes as base64, with its type. */
async function readPhoto(uri: string): Promise<{ data: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { data: dataUrl.replace(/^data:[^,]*,/, ''), mimeType: blob.type || 'image/jpeg' };
  }
  return { data: await new File(uri).base64(), mimeType: 'image/jpeg' };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Reads a coffee bag photo. Throws with a message to show when the scan doesn't work. */
export async function scanBagPhoto(uri: string): Promise<BagScanResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in first.');
  const photo = await readPhoto(uri);
  const now = new Date();
  const response = await fetch(`${API_ORIGIN}/api/coffees/scan`, {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      photo: { data: photo.data, mime_type: photo.mimeType },
      // Roast dates printed without a year are read against the person's own date
      today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Couldn't scan the bag. Please try again.");
  return body as BagScanResult;
}
