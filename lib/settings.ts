import * as SecureStore from 'expo-secure-store';
import { getJSON, setJSON } from './storage';
import { Settings } from './types';

const KEY = 'settings';
const SECURE_KEY = 'jiggo_anthropic_key';

const DEFAULTS: Settings = {
  units: 'metric',
  hasOnboarded: false,
};

export async function getSettings(): Promise<Settings> {
  return getJSON<Settings>(KEY, DEFAULTS);
}

/**
 * Settings writes are serialised through a single in-memory promise chain.
 * Without this, two concurrent callers (e.g. Home's warm-push `pushAsked`
 * write firing while Settings panel commits a `name` change) both read the
 * same snapshot, both spread their patch over it, and the second write
 * silently clobbers the first patch's field.
 */
let settingsWriteChain: Promise<unknown> = Promise.resolve();

export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const run = async (): Promise<Settings> => {
    const cur = await getSettings();
    const next = { ...cur, ...patch };
    await setJSON(KEY, next);
    return next;
  };
  const queued = settingsWriteChain.then(run, run);
  // Swallow errors on the chain so one rejection doesn't poison later writes.
  settingsWriteChain = queued.catch(() => undefined);
  return queued;
}

export async function getApiKey(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(SECURE_KEY)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Surfaces SecureStore failures to the caller instead of silently swallowing
 * them. Some Android builds and rooted devices don't have a Keychain backend
 * — silently failing leaves the Coach gate locked with no clue why.
 */
export async function setApiKey(key: string | null): Promise<void> {
  if (!key) {
    try { await SecureStore.deleteItemAsync(SECURE_KEY); } catch {}
    await saveSettings({ apiKey: undefined });
    return;
  }
  try {
    await SecureStore.setItemAsync(SECURE_KEY, key.trim(), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (e: any) {
    throw new Error(
      `Couldn't save your key to the Keychain (${e?.message ?? 'unknown'}). ` +
      'Try again, or contact support if your device is restricted.',
    );
  }
  await saveSettings({ apiKey: 'set' });
}
