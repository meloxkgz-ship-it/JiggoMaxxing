/**
 * Tiny typed AsyncStorage wrapper.
 * All JIGGO MAXXING user data is local-first; nothing leaves the device
 * except explicit Coach chat turns (which the user opts into and which
 * carry no identity).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'jiggo.v1.';

/** Bump only when the on-disk shape changes in a way that requires migration. */
export const SCHEMA_VERSION = 1;
const SCHEMA_KEY = '__schema';

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

/**
 * Replace every key under the JIGGO namespace with the contents of a dump
 * produced by `exportAll()`. Validates the schema version *before* wiping —
 * an unknown payload (wrong app, old build, hand-edited JSON) must not be
 * able to destroy the user's data.
 */
export async function importAll(json: string): Promise<number> {
  let parsed: unknown;
  try { parsed = JSON.parse(json); }
  catch (e: any) { throw new Error('Invalid JSON: ' + (e?.message ?? '')); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object at the top level.');
  }
  const obj = parsed as Record<string, unknown>;
  const schema = obj[SCHEMA_KEY];
  if (typeof schema !== 'number') {
    throw new Error('Missing schema version — not a JIGGO export.');
  }
  if (schema !== SCHEMA_VERSION) {
    throw new Error(
      `Schema v${schema} is not compatible with this build (v${SCHEMA_VERSION}).`,
    );
  }
  // Validated — safe to wipe-and-replace.
  await wipeAll();
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== 'string' || k === SCHEMA_KEY) continue;
    try {
      await AsyncStorage.setItem(NS + k, JSON.stringify(v));
      count++;
    } catch {}
  }
  return count;
}

/**
 * Dump every key under the JIGGO namespace into a single JSON object.
 * Stamps `__schema: SCHEMA_VERSION` so re-imports can validate compatibility.
 */
export async function exportAll(): Promise<Record<string, unknown>> {
  try {
    const all = await AsyncStorage.getAllKeys();
    const ours = all.filter((k) => k.startsWith(NS));
    const out: Record<string, unknown> = { [SCHEMA_KEY]: SCHEMA_VERSION };
    for (const k of ours) {
      const v = await AsyncStorage.getItem(k);
      if (v == null) continue;
      try { out[k.slice(NS.length)] = JSON.parse(v); }
      catch { out[k.slice(NS.length)] = v; }
    }
    return out;
  } catch {
    return { [SCHEMA_KEY]: SCHEMA_VERSION };
  }
}
