import { getJSON, setJSON } from './storage';
import { JournalEntry } from './types';

const KEY = 'journal';

export async function listEntries(): Promise<JournalEntry[]> {
  const list = await getJSON<JournalEntry[]>(KEY, []);
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addEntry(
  partial: Omit<JournalEntry, 'id' | 'createdAt'>,
): Promise<JournalEntry> {
  const list = await getJSON<JournalEntry[]>(KEY, []);
  const entry: JournalEntry = {
    ...partial,
    id: `je_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  list.unshift(entry);
  await setJSON(KEY, list);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<JournalEntry>): Promise<void> {
  const list = await getJSON<JournalEntry[]>(KEY, []);
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    await setJSON(KEY, list);
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const list = await getJSON<JournalEntry[]>(KEY, []);
  await setJSON(KEY, list.filter((e) => e.id !== id));
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function relativeDate(iso: string): string {
  const t = new Date(iso + 'T00:00:00').getTime();
  const today = new Date(todayKey() + 'T00:00:00').getTime();
  const diff = Math.round((today - t) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
