/**
 * Tiny typed AsyncStorage wrapper.
 * All JIGGO MAXXING user data is local-first; nothing leaves the device
 * except explicit Coach chat turns (which the user opts into and which
 * carry no identity).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'jiggo.v1.';

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(NS + key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(NS + key, JSON.stringify(value));
  } catch {}
}

export async function removeKey(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(NS + key); } catch {}
}

export async function listKeys(prefix = ''): Promise<string[]> {
  try {
    const all = await AsyncStorage.getAllKeys();
    return all
      .filter((k) => k.startsWith(NS + prefix))
      .map((k) => k.slice(NS.length));
  } catch {
    return [];
  }
}

/** Wipe every key under the JIGGO namespace. */
export async function wipeAll(): Promise<void> {
  try {
    const all = await AsyncStorage.getAllKeys();
    const ours = all.filter((k) => k.startsWith(NS));
    await AsyncStorage.multiRemove(ours);
  } catch {}
}

/** Dump every key under the JIGGO namespace into a single JSON object. */
export async function exportAll(): Promise<Record<string, unknown>> {
  try {
    const all = await AsyncStorage.getAllKeys();
    const ours = all.filter((k) => k.startsWith(NS));
    const out: Record<string, unknown> = {};
    for (const k of ours) {
      const v = await AsyncStorage.getItem(k);
      if (v == null) continue;
      try { out[k.slice(NS.length)] = JSON.parse(v); }
      catch { out[k.slice(NS.length)] = v; }
    }
    return out;
  } catch {
    return {};
  }
}
