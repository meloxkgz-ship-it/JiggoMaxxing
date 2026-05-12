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

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await setJSON(KEY, next);
  return next;
}

export async function getApiKey(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync(SECURE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function setApiKey(key: string | null): Promise<void> {
  try {
    if (!key) {
      await SecureStore.deleteItemAsync(SECURE_KEY);
      await saveSettings({ apiKey: undefined });
    } else {
      await SecureStore.setItemAsync(SECURE_KEY, key.trim(), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await saveSettings({ apiKey: 'set' });
    }
  } catch {}
}
