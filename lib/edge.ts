/**
 * Edge Index — a single 0–100 number summarising the user's
 * holistic, controllable signal across the four pillars.
 *
 * Deliberately weighted toward what the user *does* (habits + journaling
 * + nudge consistency) rather than how a scan *looks*. The latest scan
 * is one input among many — not the only voice.
 */
import { getStreak } from './journal';
import { getActivePlan, getCompletion } from './plan';
import { getNudgeStreak } from './nudge';
import { listScans } from './scan';
import { todayKey } from './journal';

export type EdgeBreakdown = {
  total: number;          // 0..100
  scan: number;           // 0..100 — latest scan overall (or fallback)
  journal: number;        // 0..100 — streak normalised (cap 14)
  nudge: number;          // 0..100 — streak normalised (cap 14)
  plan: number;           // 0..100 — today's completion ratio
};

const WEIGHTS = {
  scan: 0.40,
  journal: 0.20,
  nudge: 0.20,
  plan: 0.20,
};

export async function computeEdge(): Promise<EdgeBreakdown> {
  const [scans, js, ns, plan, comp] = await Promise.all([
    listScans(),
    getStreak(),
    getNudgeStreak(),
    getActivePlan(),
    getCompletion(),
  ]);

  // Scan score: latest scan or 50 (neutral) when none yet
  const scanScore = scans[0]?.overall ?? 50;

  // Journal + nudge: normalise streak 0..14 → 0..100
  const journalScore = Math.min(100, (js / 14) * 100);
  const nudgeScore = Math.min(100, (ns / 14) * 100);

  // Plan: today's completion ratio × 100
  const today = comp[todayKey()] ?? [];
  const planScore = plan.length === 0
    ? 50
    : Math.round((today.length / plan.length) * 100);

  const total = Math.round(
    scanScore * WEIGHTS.scan +
    journalScore * WEIGHTS.journal +
    nudgeScore * WEIGHTS.nudge +
    planScore * WEIGHTS.plan,
  );

  return {
    total: Math.max(0, Math.min(100, total)),
    scan: scanScore,
    journal: Math.round(journalScore),
    nudge: Math.round(nudgeScore),
    plan: planScore,
  };
}
