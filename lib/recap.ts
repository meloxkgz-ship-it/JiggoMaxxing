/**
 * Weekly recap — computed once for the past 7 local days and surfaced as a
 * Sunday card on Home. Editorial, never punishing: counts wins, never
 * misses. The framing is "what you did" not "what you missed".
 */
import { lastWeekDates } from './dates';
import { listEntries } from './journal';
import { getCompletion, getActivePlan } from './plan';
import { getJSON } from './storage';
import { listScans } from './scan';
import { JournalEntry, ScanResult } from './types';

export type WeeklyRecap = {
  /** Number of plan items completed across the last 7 days. */
  planItemsDone: number;
  /** Adherence ratio 0..1 — items done over items × 7 (with safety floor). */
  planAdherence: number;
  /** Days the user logged any journal entry, 0..7. */
  journalDays: number;
  /** Days the user marked the daily nudge done, 0..7. */
  nudgeDays: number;
  /** Most frequent mood across the week, or null. */
  topMood: string | null;
  /** Latest scan score, or null. */
  latestScan: number | null;
  /** Scan score delta vs one week ago (positive = up), or null. */
  scanDelta: number | null;
};

const NUDGE_KEY = 'nudges.completion';
const GRACE_KEY = 'nudges.grace';

export async function computeWeeklyRecap(): Promise<WeeklyRecap> {
  const week = lastWeekDates();
  const [journal, comp, plan, scans, nudgeMap, graceMap] = await Promise.all([
    listEntries(),
    getCompletion(),
    getActivePlan(),
    listScans(),
    getJSON<Record<string, boolean>>(NUDGE_KEY, {}),
    getJSON<Record<string, boolean>>(GRACE_KEY, {}),
  ]);

  let planItemsDone = 0;
  for (const d of week) {
    planItemsDone += (comp[d] ?? []).length;
  }
  const planAdherence = plan.length === 0
    ? 0
    : Math.min(1, planItemsDone / (plan.length * 7));

  const weekSet = new Set(week);
  const journalDays = new Set(
    journal.filter((e) => weekSet.has(e.date)).map((e) => e.date),
  ).size;

  let nudgeDays = 0;
  for (const d of week) {
    if (nudgeMap[d] || graceMap[d]) nudgeDays++;
  }

  // Top mood: count moods on entries within the week.
  const moodCounts: Record<string, number> = {};
  for (const e of journal) {
    if (!weekSet.has(e.date) || !e.mood) continue;
    moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  }
  const topMood =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Latest scan + delta against the scan closest to 7 days ago.
  const latestScan = scans[0]?.overall ?? null;
  let scanDelta: number | null = null;
  if (latestScan != null && scans.length >= 2) {
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    // The scan closest in time to (now - 7d).
    const prior = scans.reduce<ScanResult | null>((best, s) => {
      if (s.id === scans[0].id) return best;
      if (!best) return s;
      const diffBest = Math.abs(best.createdAt - sevenDaysAgo);
      const diffS = Math.abs(s.createdAt - sevenDaysAgo);
      return diffS < diffBest ? s : best;
    }, null);
    if (prior) scanDelta = latestScan - prior.overall;
  }

  return {
    planItemsDone,
    planAdherence,
    journalDays,
    nudgeDays,
    topMood,
    latestScan,
    scanDelta,
  };
}

/** True iff today (local) is Sunday — Home uses this to gate the recap card. */
export function isSunday(d: Date = new Date()): boolean {
  return d.getDay() === 0;
}
