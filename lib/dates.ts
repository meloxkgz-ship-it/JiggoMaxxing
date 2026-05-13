/**
 * Shared date helpers.
 *
 * `dateKey(d)` lives in `lib/journal.ts` for legacy reasons — re-exported
 * here so new code can pull all date utilities from one place without an
 * unrelated journal import. Eventually new callers should prefer this module.
 */
import { dateKey } from './journal';

export { dateKey };

/**
 * The last `n` local-time date keys, oldest → newest, ending today.
 * Previously duplicated in insights.tsx and (tabs)/plan.tsx — factor out so
 * the formula and timezone treatment stay in lockstep.
 */
export function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

/**
 * The last seven date keys including today, where today is the trailing day.
 * Used by the weekly recap card.
 */
export function lastWeekDates(): string[] {
  return lastNDates(7);
}
