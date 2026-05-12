/**
 * Persists a picker URI into the app's document directory.
 *
 * ImagePicker (camera or library) returns URIs under iOS's tmp/ or Caches/
 * which the OS may purge between launches. Storing those URIs means
 * scan thumbnails and closet item images can break after a cold restart.
 * This helper copies the asset into a dedicated subfolder under the app's
 * persistent document directory and returns the new URI.
 *
 * Falls back to the original URI on any error so the picker flow is never
 * blocked by a copy failure — the worst case becomes "image disappears
 * later" instead of "image never appears."
 */
import * as FileSystem from 'expo-file-system';

export async function persistPhoto(
  uri: string,
  folder: 'scans' | 'closet',
): Promise<string> {
  if (!uri) return uri;
  // Already inside documents/ — no-op.
  const docDir = (FileSystem as any).documentDirectory as string | null;
  if (!docDir) return uri;
  if (uri.startsWith(docDir)) return uri;

  try {
    const subdir = `${docDir}jiggo/${folder}/`;
    await FileSystem.makeDirectoryAsync(subdir, { intermediates: true }).catch(() => {});
    const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
    const safeExt = /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg';
    const fname = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${safeExt}`;
    const dest = subdir + fname;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}
