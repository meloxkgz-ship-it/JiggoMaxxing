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

/** BCP-47 tag for the app's two languages, for Intl date formatting. */
export function localeTag(lang: 'en' | 'de'): string {
  return lang === 'de' ? 'de-DE' : 'en-US';
}

/**
 * Locale-aware date formatting. `toLocaleDateString(undefined, …)` follows the
 * *device* locale, not the in-app language override — so dates rendered in
 * English even when the app had been switched to German. Always route
 * user-visible dates through this helper with the app's current `lang`.
 */
export function formatDate(
  d: Date | number | string,
  lang: 'en' | 'de',
  opts: Intl.DateTimeFormatOptions,
): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(localeTag(lang), opts);
}

/** Localised short weekday labels, Monday-first — for the plan week grid. */
export function weekDayLabels(lang: 'en' | 'de'): string[] {
  // 2024-01-01 is a Monday; walk seven days from it.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(localeTag(lang), { weekday: 'short' }),
  );
}
