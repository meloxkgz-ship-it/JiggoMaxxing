/**
 * Curated rituals library.
 *
 * Rituals are deliberately distinct from plan items. The plan is what you
 * *do* across the week. Rituals are short, contextual sequences (2–4
 * micro-actions) you *enter* — morning to claim the day, midday to reset,
 * evening to release it.
 *
 * Inspired by the stoic morning/work/evening tradition (Marcus Aurelius'
 * "Meditations" was structured this way) and modern apps like Stoa and
 * Daily Ritual — but framed without gamification, scores, or streaks. A
 * ritual either lands on you or it doesn't; we don't track completion.
 *
 * Content is editorial: the *body* matters more than the list. Each
 * ritual has one intention sentence + 2–4 anchor actions.
 */
import { Lang } from './i18n';

export type RitualContext = 'morning' | 'reset' | 'evening';

export type Ritual = {
  id: string;
  context: RitualContext;
  title: string;
  /** One-sentence intention, sets the frame before the actions. */
  intention: string;
  /** 2–4 anchor actions, ≤ 6 words each. */
  steps: string[];
  /** Suggested duration, plain string ('5m', '10–15m', etc). */
  duration: string;
};

const RITUALS: Record<Lang, Ritual[]> = {
  en: [
    // ── Morning ──
    {
      id: 'm1',
      context: 'morning',
      title: 'First light',
      intention: 'Claim the day before the day claims you.',
      steps: [
        'Make the bed',
        'Cold water on the face',
        'Three breaths at the window',
        'Set one priority',
      ],
      duration: '5m',
    },
    {
      id: 'm2',
      context: 'morning',
      title: 'Stoic premeditation',
      intention: 'Imagine what could go wrong. Strip the surprise out of it.',
      steps: [
        'Name one likely friction today',
        'Decide your response in advance',
        'Recite: I will meet it calmly',
      ],
      duration: '3m',
    },
    {
      id: 'm3',
      context: 'morning',
      title: 'Body before mind',
      intention: 'Move first. Thinking is easier in a moved body.',
      steps: [
        'Twenty squats',
        'Twenty push-ups',
        'Hold a 30s plank',
        'Walk to a window',
      ],
      duration: '6m',
    },
    // ── Reset (midday) ──
    {
      id: 'r1',
      context: 'reset',
      title: 'Phone-down reset',
      intention: 'A short interruption protects a long focus.',
      steps: [
        'Phone face-down across the room',
        'Drink a full glass of water',
        'Walk three minutes outside',
        'Return to one thing',
      ],
      duration: '5–8m',
    },
    {
      id: 'r2',
      context: 'reset',
      title: 'Posture audit',
      intention: 'You forget your spine. Your spine remembers.',
      steps: [
        'Stand against a wall',
        'Heels, hips, shoulders, head touching',
        'Hold 30 seconds',
        'Walk away keeping the line',
      ],
      duration: '2m',
    },
    {
      id: 'r3',
      context: 'reset',
      title: 'Frame check',
      intention: 'When the day pulls you, gather yourself back.',
      steps: [
        'Three slow breaths through the nose',
        'Drop the shoulders',
        'Soften the jaw',
        'Look up, not down',
      ],
      duration: '1m',
    },
    // ── Evening ──
    {
      id: 'e1',
      context: 'evening',
      title: 'Review the day',
      intention: 'No judgement. Just honesty. What did this day teach you?',
      steps: [
        'Name one thing that went well',
        'Name one thing that didn\'t',
        'Name one thing you\'ll do tomorrow',
      ],
      duration: '5m',
    },
    {
      id: 'e2',
      context: 'evening',
      title: 'Wind-down',
      intention: 'The body needs a runway, not a cliff.',
      steps: [
        'Lights to half',
        'Phone in another room',
        'Tomorrow\'s fit laid out',
        'Three slow breaths in bed',
      ],
      duration: '10m',
    },
    {
      id: 'e3',
      context: 'evening',
      title: 'Gratitude trio',
      intention: 'Three is enough. More is a performance.',
      steps: [
        'One person you\'re grateful for',
        'One privilege you carry',
        'One small thing today gave you',
      ],
      duration: '3m',
    },
  ],
  de: [
    // ── Morgen ──
    {
      id: 'm1',
      context: 'morning',
      title: 'Erstes Licht',
      intention: 'Beanspruche den Tag, bevor der Tag dich beansprucht.',
      steps: [
        'Bett machen',
        'Kaltes Wasser ins Gesicht',
        'Drei Atemzüge am Fenster',
        'Eine Priorität setzen',
      ],
      duration: '5 Min',
    },
    {
      id: 'm2',
      context: 'morning',
      title: 'Stoische Vorausschau',
      intention: 'Stell dir vor, was schiefgehen könnte. Nimm der Überraschung den Schrecken.',
      steps: [
        'Nenn eine wahrscheinliche Reibung heute',
        'Entscheide deine Reaktion im Voraus',
        'Sag: Ich begegne ihr ruhig',
      ],
      duration: '3 Min',
    },
    {
      id: 'm3',
      context: 'morning',
      title: 'Körper vor Geist',
      intention: 'Bewege dich zuerst. Denken fällt im bewegten Körper leichter.',
      steps: [
        'Zwanzig Kniebeugen',
        'Zwanzig Liegestütze',
        '30 Sekunden Plank',
        'Geh ans Fenster',
      ],
      duration: '6 Min',
    },
    // ── Reset (Mittag) ──
    {
      id: 'r1',
      context: 'reset',
      title: 'Handy-Aus-Reset',
      intention: 'Eine kurze Unterbrechung schützt einen langen Fokus.',
      steps: [
        'Handy mit Display nach unten weg',
        'Ein volles Glas Wasser trinken',
        'Drei Minuten nach draußen',
        'Zurück zu einer Sache',
      ],
      duration: '5–8 Min',
    },
    {
      id: 'r2',
      context: 'reset',
      title: 'Haltungs-Check',
      intention: 'Du vergisst deine Wirbelsäule. Sie nicht dich.',
      steps: [
        'Stell dich an die Wand',
        'Fersen, Po, Schultern, Hinterkopf an die Wand',
        'Halt 30 Sekunden',
        'Geh weiter, halt die Linie',
      ],
      duration: '2 Min',
    },
    {
      id: 'r3',
      context: 'reset',
      title: 'Frame-Check',
      intention: 'Wenn der Tag dich zieht, sammle dich.',
      steps: [
        'Drei langsame Atemzüge durch die Nase',
        'Schultern fallen lassen',
        'Kiefer entspannen',
        'Blick nach oben, nicht nach unten',
      ],
      duration: '1 Min',
    },
    // ── Abend ──
    {
      id: 'e1',
      context: 'evening',
      title: 'Tagesrückblick',
      intention: 'Kein Urteil. Nur Ehrlichkeit. Was hat dich der Tag gelehrt?',
      steps: [
        'Nenn eine Sache, die gut lief',
        'Nenn eine, die nicht lief',
        'Nenn eine Sache, die du morgen tust',
      ],
      duration: '5 Min',
    },
    {
      id: 'e2',
      context: 'evening',
      title: 'Runterfahren',
      intention: 'Der Körper braucht eine Landebahn, keine Klippe.',
      steps: [
        'Licht auf halb',
        'Handy in einen anderen Raum',
        'Morgen-Outfit auslegen',
        'Drei langsame Atemzüge im Bett',
      ],
      duration: '10 Min',
    },
    {
      id: 'e3',
      context: 'evening',
      title: 'Dankbarkeits-Trio',
      intention: 'Drei reichen. Mehr ist eine Performance.',
      steps: [
        'Ein Mensch, für den du dankbar bist',
        'Ein Privileg, das du trägst',
        'Eine kleine Sache, die der Tag dir gegeben hat',
      ],
      duration: '3 Min',
    },
  ],
};

export function listRituals(lang: Lang): Ritual[] {
  return RITUALS[lang] ?? RITUALS.en;
}

export function getRitual(lang: Lang, id: string): Ritual | null {
  return listRituals(lang).find((r) => r.id === id) ?? null;
}

/**
 * Returns the ritual most appropriate for the current local time:
 *  - Morning if hour < 11
 *  - Reset if 11 ≤ hour < 18
 *  - Evening otherwise
 * Within the selected context, rotates by day-of-year so the user sees
 * variety without losing the through-line of the context they're in.
 */
export function getRitualForNow(lang: Lang): Ritual {
  const d = new Date();
  const hour = d.getHours();
  const ctx: RitualContext = hour < 11 ? 'morning' : hour < 18 ? 'reset' : 'evening';
  const all = listRituals(lang);
  const pool = all.filter((r) => r.context === ctx);
  // Fallback: if a context ever has zero entries (future content edit),
  // hand back the first ritual of any context instead of a `pool[NaN]`
  // undefined that would red-screen the Home card.
  if (pool.length === 0) {
    return all[0];
  }
  const day = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000,
  );
  return pool[Math.abs(day) % pool.length];
}
