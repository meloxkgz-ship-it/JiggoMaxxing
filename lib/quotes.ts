/**
 * Curated daily quotes shown in the Coach empty state and elsewhere.
 *
 * Selection criteria — must align with the JIGGO brand:
 *  - Discipline, frame, presence, recovery, self-respect.
 *  - Never about beating someone else.
 *  - Never about an aesthetic ceiling.
 *  - Attribution must be real (or clearly framed as anonymous proverb).
 *
 * Rotates deterministically by local day-of-year so it feels alive without
 * being noisy. 21 entries → roughly one repeat per three weeks per language.
 */
import { Lang } from './i18n';

export type Quote = { text: string; author: string };

const QUOTES: Record<Lang, Quote[]> = {
  en: [
    { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
    { text: 'The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation.', author: 'Henry David Thoreau' },
    { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
    { text: 'It is not the man who has too little, but the man who craves more, that is poor.', author: 'Seneca' },
    { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
    { text: 'The first and greatest victory is to conquer yourself.', author: 'Plato' },
    { text: 'Do every act of your life as though it were the very last act of your life.', author: 'Marcus Aurelius' },
    { text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
    { text: 'Take care of your body. It is the only place you have to live.', author: 'Jim Rohn' },
    { text: 'A man who masters himself becomes the master of any situation.', author: 'Anonymous' },
    { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
    { text: 'You have power over your mind, not outside events. Realise this, and you will find strength.', author: 'Marcus Aurelius' },
    { text: 'The cave you fear to enter holds the treasure you seek.', author: 'Joseph Campbell' },
    { text: 'It is better to conquer yourself than to win a thousand battles.', author: 'Buddha' },
    { text: 'A river cuts through rock not because of its power but its persistence.', author: 'James N. Watkins' },
    { text: 'You are what you do, not what you say you’ll do.', author: 'Carl Jung' },
    { text: 'The privilege of a lifetime is to become who you truly are.', author: 'Carl Jung' },
    { text: 'Care about what other people think and you will always be their prisoner.', author: 'Lao Tzu' },
    { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
    { text: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche' },
    { text: 'The obstacle is the way.', author: 'Marcus Aurelius' },
    { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
    { text: 'A society grows great when old men plant trees whose shade they know they shall never sit in.', author: 'Greek proverb' },
    { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  ],
  de: [
    { text: 'Disziplin ist die Brücke zwischen Zielen und Erfolg.', author: 'Jim Rohn' },
    { text: 'Du steigst nicht auf das Niveau deiner Ziele. Du fällst auf das Niveau deiner Systeme.', author: 'James Clear' },
    { text: 'Die Masse der Menschen führt ein Leben in stiller Verzweiflung.', author: 'Henry David Thoreau' },
    { text: 'Frei ist nur, wer sich selbst beherrscht.', author: 'Epiktet' },
    { text: 'Verschwende keine Zeit mehr damit, zu streiten, wie ein guter Mensch sein soll. Sei einer.', author: 'Mark Aurel' },
    { text: 'Arm ist nicht, wer zu wenig hat, sondern wer mehr will.', author: 'Seneca' },
    { text: 'Wir leiden öfter in der Vorstellung als in der Wirklichkeit.', author: 'Seneca' },
    { text: 'Der erste und größte Sieg ist, sich selbst zu besiegen.', author: 'Platon' },
    { text: 'Tu jede Handlung deines Lebens so, als wäre es die letzte.', author: 'Mark Aurel' },
    { text: 'Qualität ist keine Handlung, sondern eine Gewohnheit.', author: 'Aristoteles' },
    { text: 'Achte auf deinen Körper. Er ist der einzige Ort, an dem du leben kannst.', author: 'Jim Rohn' },
    { text: 'Wer sich selbst meistert, meistert jede Situation.', author: 'Unbekannt' },
    { text: 'Disziplin ist Freiheit.', author: 'Jocko Willink' },
    { text: 'Du hast Macht über deinen Geist, nicht über äußere Ereignisse. Erkenne das, und du wirst Stärke finden.', author: 'Mark Aurel' },
    { text: 'Die Höhle, die du fürchtest, birgt den Schatz, den du suchst.', author: 'Joseph Campbell' },
    { text: 'Besser sich selbst besiegen als tausend Schlachten gewinnen.', author: 'Buddha' },
    { text: 'Ein Fluss durchbricht den Fels nicht durch Kraft, sondern durch Beharrlichkeit.', author: 'James N. Watkins' },
    { text: 'Du bist, was du tust, nicht was du sagst, dass du tun wirst.', author: 'C. G. Jung' },
    { text: 'Das Privileg eines Lebens ist, der zu werden, der man wirklich ist.', author: 'C. G. Jung' },
    { text: 'Wer sich um die Meinung anderer sorgt, wird ihr Gefangener bleiben.', author: 'Laozi' },
    { text: 'Energie und Beharrlichkeit besiegen alles.', author: 'Benjamin Franklin' },
    { text: 'Wer ein Warum zu leben hat, erträgt fast jedes Wie.', author: 'Friedrich Nietzsche' },
    { text: 'Das Hindernis ist der Weg.', author: 'Mark Aurel' },
    { text: 'Gerade in den dunkelsten Momenten müssen wir uns konzentrieren, um das Licht zu sehen.', author: 'Aristoteles' },
    { text: 'Eine Gesellschaft wächst, wenn alte Männer Bäume pflanzen, deren Schatten sie nie kennen werden.', author: 'Griechisches Sprichwort' },
    { text: 'Handeln ist der Grundstein jedes Erfolgs.', author: 'Pablo Picasso' },
  ],
};

/** Returns today's quote in the user's language, rotating by local day-of-year. */
export function getDailyQuote(lang: Lang): Quote {
  const list = QUOTES[lang] ?? QUOTES.en;
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000,
  );
  return list[Math.abs(dayOfYear) % list.length];
}
