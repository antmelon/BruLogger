import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE = 1600; // px, longest edge
const JPEG_QUALITY = 0.8;

/** The resize that brings a photo's longest edge down to maxEdge, keeping its aspect ratio. */
export function resizeAction(width: number, height: number, maxEdge: number): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= maxEdge) return null;
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

/**
 * Shrinks a picked photo for upload: at most MAX_EDGE px on its longest edge, re-encoded as JPEG
 * (which also converts HEIC/PNG). Phone photos are several MB at full size and the detail screen
 * downloads them whole. Falls back to the original if processing fails, so it never blocks a save.
 */
export async function prepareForUpload(photo: { uri: string; width: number; height: number }): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(photo.uri);
    const resize = resizeAction(photo.width, photo.height, MAX_EDGE);
    if (resize) context.resize(resize);
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return result.uri;
  } catch (e) {
    console.warn('Could not resize photo, uploading the original:', e);
    return photo.uri;
  }
}
