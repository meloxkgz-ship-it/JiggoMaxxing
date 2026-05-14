import { getJSON, setJSON } from './storage';
import { tFor } from './i18n';
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

/**
 * YYYY-MM-DD in the user's local time. Using ISO/UTC here causes an
 * off-by-one for any user east or west of UTC: a journal saved at 23:30
 * local would otherwise land on tomorrow's heat cell (or yesterday's) and
 * break streak math at the day boundary.
 */
export function todayKey(): string {
  return dateKey(new Date());
}

/** Format a Date as local YYYY-MM-DD. Exported for date-walk callers. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compute consecutive-day streak ending today. */
export async function getStreak(): Promise<number> {
  const list = await listEntries();
  if (list.length === 0) return 0;
  const dates = new Set(list.map((e) => e.date));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = dateKey(d);
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function relativeDate(iso: string, lang: 'en' | 'de' = 'en'): string {
  const t = new Date(iso + 'T00:00:00').getTime();
  const today = new Date(todayKey() + 'T00:00:00').getTime();
  const diff = Math.round((today - t) / 86400000);
  if (diff === 0) return tFor(lang, 'common.today');
  if (diff === 1) return tFor(lang, 'common.yesterday');
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  if (diff < 7) return new Date(iso).toLocaleDateString(locale, { weekday: 'short' });
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
