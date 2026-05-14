/**
 * Achievements — a quiet ledger of the user's own milestones.
 *
 * Brand-coherent by design: never a comparison, never a leaderboard, never a
 * score. Each achievement is a fact about *your* trajectory. Computed live
 * from current data — no separate history table to keep in sync, no streak
 * to lose. An achievement, once true, reads as earned.
 *
 * `tier` drives the icon accent: 'start' = first steps, 'build' = consistency,
 * 'depth' = long-haul. Purely cosmetic grouping.
 */
import { listEntries, getStreak } from './journal';
import { getNudgeStreak } from './nudge';
import { listScans } from './scan';
import { listSavedOutfits, listItems } from './closet';
import { getCompletion } from './plan';
import { lastNDates } from './dates';

export type AchievementTier = 'start' | 'build' | 'depth';

export type Achievement = {
  id: string;
  tier: AchievementTier;
  /** i18n key suffix under `achievements.items.<id>` → { title, body }. */
  earned: boolean;
  /** Optional "3 / 7" style progress hint for unearned items. */
  progress?: string;
};

export async function computeAchievements(): Promise<Achievement[]> {
  const [entries, scans, outfits, items, comp, journalStreak, nudgeStreak] = await Promise.all([
    listEntries(),
    listScans(),
    listSavedOutfits(),
    listItems(),
    getCompletion(),
    getStreak(),
    getNudgeStreak(),
  ]);

  // Total plan items completed across the recorded history.
  let planCompletions = 0;
  for (const ids of Object.values(comp)) planCompletions += ids.length;

  // Days with any plan completion in the last 28.
  const planDays = lastNDates(28).filter((d) => (comp[d]?.length ?? 0) > 0).length;

  const mk = (
    id: string,
    tier: AchievementTier,
    earned: boolean,
    progress?: string,
  ): Achievement => ({ id, tier, earned, progress });

  return [
    // ── Start ──
    mk('firstScan', 'start', scans.length >= 1),
    mk('firstJournal', 'start', entries.length >= 1),
    mk('firstPlanItem', 'start', planCompletions >= 1),
    mk('firstOutfit', 'start', outfits.length >= 1),
    mk('closetFive', 'start', items.length >= 5, items.length < 5 ? `${items.length} / 5` : undefined),
    // ── Build ──
    mk('nudgeWeek', 'build', nudgeStreak >= 7, nudgeStreak < 7 ? `${nudgeStreak} / 7` : undefined),
    mk('journalWeek', 'build', journalStreak >= 7, journalStreak < 7 ? `${journalStreak} / 7` : undefined),
    mk('scanFive', 'build', scans.length >= 5, scans.length < 5 ? `${scans.length} / 5` : undefined),
    mk('planConsistent', 'build', planDays >= 14, planDays < 14 ? `${planDays} / 14` : undefined),
    mk('journalTen', 'build', entries.length >= 10, entries.length < 10 ? `${entries.length} / 10` : undefined),
    // ── Depth ──
    mk('nudgeMonth', 'depth', nudgeStreak >= 30, nudgeStreak < 30 ? `${nudgeStreak} / 30` : undefined),
    mk('journalMonth', 'depth', journalStreak >= 30, journalStreak < 30 ? `${journalStreak} / 30` : undefined),
    mk('scanTwenty', 'depth', scans.length >= 20, scans.length < 20 ? `${scans.length} / 20` : undefined),
    mk('nudgeHundred', 'depth', nudgeStreak >= 100, nudgeStreak < 100 ? `${nudgeStreak} / 100` : undefined),
  ];
}
