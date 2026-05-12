/**
 * Daily Edge Nudge — one small, controllable win per day.
 * Deterministic per (day-of-year × language) so the same calm prompt
 * lands across the day, but rotates 365×5 unique.
 */
import { getJSON, setJSON } from './storage';
import { todayKey } from './journal';
import { tFor, Lang } from './i18n';

const KEY = 'nudges.completion';

type Theme = 'grooming' | 'physique' | 'style' | 'confidence' | 'discipline';

const THEMES: Theme[] = ['grooming', 'physique', 'style', 'confidence', 'discipline'];

export type Nudge = {
  theme: Theme;
  title: string;
  body: string;
  date: string;
};

function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

/**
 * Get the localised nudge for today.
 * NUDGES is a small bilingual list (15 per theme × 5 themes = 75 total)
 * rotated by day-of-year.
 */
const NUDGES: Record<Lang, Record<Theme, { title: string; body: string }[]>> = {
  en: {
    grooming: [
      { title: 'Cold-water rinse, 30 seconds', body: 'End your shower cold. The friction wakes the skin, the discipline wakes the rest.' },
      { title: 'Trim the edges', body: 'Two minutes around the ear, neck, jawline. Even between cuts it sharpens the silhouette.' },
      { title: 'SPF on the days you don\'t need it', body: 'The cumulative day is the point. Cloudy counts.' },
      { title: 'Floss before brushing', body: 'It reorders the routine, which makes it harder to skip.' },
      { title: 'Hands off the face', body: 'Notice every time you touch it today. That awareness alone moves the score.' },
      { title: 'Hot towel + balm', body: 'One time. After dinner. Like a small ceremony.' },
      { title: 'Switch to fragrance-free for a week', body: 'Reset your baseline. You learn what your skin actually wants.' },
      { title: 'Cuticle care · 60 seconds', body: 'Hands read first. Push, never cut.' },
      { title: 'New toothbrush', body: 'If it\'s been three months, replace it today.' },
      { title: 'Dry-brush before the shower', body: 'Two minutes. Towards the heart.' },
      { title: 'Clean your phone screen', body: 'Pressed against your cheek every day. It belongs in this routine.' },
      { title: 'Lip care, AM + PM', body: 'A small win that compounds visually.' },
      { title: 'Wash the pillowcase', body: 'Today, not Sunday. Your skin will tell you the difference.' },
      { title: 'Trim the brow flyaways', body: 'Two snips, no shaping. Subtraction only.' },
      { title: 'Hair: lukewarm rinse final', body: 'Closes the cuticle. Shine reads as health.' },
    ],
    physique: [
      { title: 'Ten-minute walk after lunch', body: 'Eyes up. Phone in pocket. The mood lift outlasts the walk.' },
      { title: 'Sixty seconds of dead-hang', body: 'Splits over the day if you need. Decompresses the spine.' },
      { title: 'Drink your first liter before noon', body: 'Hydration is upstream of clarity, posture, and focus.' },
      { title: 'Stretch the hip flexors · 3 minutes', body: 'You sit too much. Everyone does.' },
      { title: 'Push-ups · one set to discomfort', body: 'Not failure. Just where it stops being easy.' },
      { title: 'Walk a new street', body: 'Even five minutes. Novel routes wake up the brain.' },
      { title: 'Sleep window: 30 min earlier', body: 'Anchor it to a sound, not a feeling. Music dimming, phone away.' },
      { title: 'Posture reset every hour', body: 'Tall through the crown. Three breaths. Continue.' },
      { title: 'Cold finish in the shower', body: 'You\'ve done this before. Do it again today.' },
      { title: 'No alcohol tonight', body: 'One night is data. Notice tomorrow\'s skin.' },
      { title: 'Walk before screen', body: 'Before your phone gets you, take the air.' },
      { title: 'Glute bridges · two sets of 15', body: 'The lower half does most of the silhouette work.' },
      { title: 'Add one vegetable to dinner', body: 'Color count, not calorie count.' },
      { title: 'No caffeine after 2pm', body: 'For one day. Then decide.' },
      { title: 'Floor sit for 10 minutes tonight', body: 'No phone. Cross-legged, then change.' },
    ],
    style: [
      { title: 'Lay out tomorrow\'s fit tonight', body: 'You decide once, well. The morning becomes free.' },
      { title: 'Pick the watch with intention', body: 'One piece carries the look. Choose it deliberately.' },
      { title: 'Iron one shirt', body: 'The one you keep skipping because it\'s wrinkled.' },
      { title: 'Re-fold the knits', body: 'Stacking restores the wardrobe. Five minutes.' },
      { title: 'Polish one pair of shoes', body: 'Cream first, brush second. Mirror finish optional.' },
      { title: 'Bin one item you don\'t wear', body: 'You know which. The closet rewards subtraction.' },
      { title: 'Belt-shoe tone match', body: 'Today\'s small luxury. Same family.' },
      { title: 'Cuff the pant cleanly', body: 'One precise roll. It reads as care.' },
      { title: 'Try a tonal stack', body: 'Three shades of the same warmth. No contrast.' },
      { title: 'No logos today', body: 'Notice how much your eye stops searching.' },
      { title: 'One personal piece', body: 'Ring, bracelet, scarf — pick one. Wear it for a month.' },
      { title: 'Lint roll the wool coat', body: 'Five minutes. Pre-flight.' },
      { title: 'Try the colour you avoid', body: 'Cream, olive, rust — the one you keep skipping.' },
      { title: 'Reset the dresser surface', body: 'Two trays. Watch, wallet, keys. Nothing else.' },
      { title: 'Watch on the right wrist tonight', body: 'Small disruption — re-sees the look.' },
    ],
    confidence: [
      { title: 'Say less, mean it more', body: 'Replace one filler word today. Notice the gravity it returns.' },
      { title: 'Eye-contact length: +1 second', body: 'In every greeting. Just one second longer.' },
      { title: 'Open the door for someone', body: 'Small initiated act resets the day\'s posture.' },
      { title: 'Compliment one stranger', body: 'On something they chose, not something they are.' },
      { title: 'Refuse one thing today', body: 'Polite, clear, no apology. Practice the muscle.' },
      { title: 'Walk in slower', body: 'Three percent slower into every room.' },
      { title: 'Stand for the first ten minutes', body: 'At the next meeting. Or while reading the next chapter.' },
      { title: 'No phone at the table', body: 'One meal. Eyes up.' },
      { title: 'Ask one harder question', body: 'In a conversation that mattered. Today.' },
      { title: 'Drop the volume', body: 'Speak at 70%. Watch them lean in.' },
      { title: 'Posture: ribs over hips', body: 'Don\'t puff the chest. Stack the ribcage.' },
      { title: 'Hands quiet', body: 'Out of pockets. Off the face. Resting.' },
      { title: 'Make a slow phone call', body: 'No texts today for one thing. Voice instead.' },
      { title: 'Three breaths before reacting', body: 'Just three. Once. See what changes.' },
      { title: 'Write down the win', body: 'One sentence. Tonight. Read it tomorrow.' },
    ],
    discipline: [
      { title: 'Phone in another room · one hour', body: 'Just one. The slowness comes back fast.' },
      { title: 'Wake without snooze', body: 'Once. Earn the morning.' },
      { title: 'Make the bed', body: 'It is the first finished thing of the day.' },
      { title: 'Inbox to zero before lunch', body: 'Archive without reading anything below the fold.' },
      { title: 'Read for ten minutes', body: 'Paper if possible. One chapter.' },
      { title: 'No new tabs for one hour', body: 'Finish what is open. Then add.' },
      { title: 'Plan tomorrow tonight', body: 'Three things. Top of the list before sleep.' },
      { title: 'No second alarm', body: 'Treat your own deadlines like other people\'s.' },
      { title: 'Walk into the cold task first', body: 'Before coffee. Before email.' },
      { title: 'No phone in the bathroom', body: 'For one full day. Notice the difference.' },
      { title: 'Reply faster, decide slower', body: 'Acknowledge in under an hour. Decide overnight.' },
      { title: 'Clean one drawer', body: 'Any one. Five minutes. Visible reset.' },
      { title: 'Eat the same lunch for three days', body: 'Take decision-cost out of the day.' },
      { title: 'Lights down by 22:30', body: 'One night. The whole next day is different.' },
      { title: 'Notebook beats note app today', body: 'Slow it down. Write less, weigh more.' },
    ],
  },
  de: {
    grooming: [
      { title: 'Kalt abduschen, 30 Sekunden', body: 'Beende die Dusche kalt. Die Reibung weckt die Haut, die Disziplin den Rest.' },
      { title: 'Konturen schneiden', body: 'Zwei Minuten an Ohr, Nacken, Kiefer. Auch zwischen Schnitten schärft das die Silhouette.' },
      { title: 'SPF auch bei Bewölkung', body: 'Der kumulative Tag zählt. Wolken zählen.' },
      { title: 'Erst Zahnseide, dann bürsten', body: 'Reordnung der Routine — schwerer zu skippen.' },
      { title: 'Hände weg vom Gesicht', body: 'Achte heute auf jeden Griff. Die Wahrnehmung allein verbessert den Score.' },
      { title: 'Warmes Tuch + Balm', body: 'Einmal. Nach dem Abendessen. Wie eine kleine Zeremonie.' },
      { title: 'Eine Woche parfümfrei', body: 'Reset der Baseline. Du lernst, was deine Haut wirklich will.' },
      { title: 'Nagelhaut, 60 Sekunden', body: 'Hände werden zuerst gelesen. Zurückschieben, nicht schneiden.' },
      { title: 'Neue Zahnbürste', body: 'Wenn drei Monate um sind, heute wechseln.' },
      { title: 'Trockenbürsten vor der Dusche', body: 'Zwei Minuten. Richtung Herz.' },
      { title: 'Putze deinen Handy-Bildschirm', body: 'Jeden Tag an deiner Wange. Gehört in diese Routine.' },
      { title: 'Lippenpflege morgens + abends', body: 'Kleiner Gewinn, der sich visuell summiert.' },
      { title: 'Kissenbezug waschen', body: 'Heute, nicht Sonntag. Deine Haut wird dir den Unterschied sagen.' },
      { title: 'Brauen-Ausreißer kürzen', body: 'Zwei Schnitte, kein Shaping. Nur Subtraktion.' },
      { title: 'Haar: lauwarme Schlussspülung', body: 'Schließt die Cuticula. Glanz liest sich als Gesundheit.' },
    ],
    physique: [
      { title: 'Zehn Minuten Gehen nach dem Mittag', body: 'Blick nach oben. Handy in der Tasche. Der Stimmungslift hält länger als der Spaziergang.' },
      { title: 'Sechzig Sekunden Dead-Hang', body: 'Über den Tag splitten, wenn nötig. Dekomprimiert die Wirbelsäule.' },
      { title: 'Ersten Liter vor Mittag trinken', body: 'Hydration steht vor Klarheit, Haltung, Fokus.' },
      { title: 'Hüftbeuger dehnen · 3 Minuten', body: 'Du sitzt zu viel. Jeder sitzt zu viel.' },
      { title: 'Push-ups · ein Satz bis unbequem', body: 'Kein Versagen. Nur dort, wo es aufhört, leicht zu sein.' },
      { title: 'Eine neue Straße gehen', body: 'Auch fünf Minuten. Neue Wege wecken das Gehirn.' },
      { title: 'Schlaf-Fenster: 30 Min früher', body: 'An ein Geräusch verankern, nicht ans Gefühl. Musik dimmen, Handy weg.' },
      { title: 'Stündlicher Posture-Reset', body: 'Lang durch den Scheitel. Drei Atemzüge. Weiter.' },
      { title: 'Dusche kalt beenden', body: 'Du hast das schon gemacht. Heute wieder.' },
      { title: 'Heute kein Alkohol', body: 'Eine Nacht ist Datenpunkt. Beobachte die Haut morgen.' },
      { title: 'Gehen vor Bildschirm', body: 'Bevor das Handy dich kriegt — geh in die Luft.' },
      { title: 'Brücken · 2×15', body: 'Die untere Hälfte trägt die Silhouette.' },
      { title: 'Ein Gemüse mehr zum Abend', body: 'Farben zählen, nicht Kalorien.' },
      { title: 'Kein Koffein nach 14 Uhr', body: 'Für einen Tag. Dann entscheiden.' },
      { title: 'Heute Abend 10 Min auf dem Boden', body: 'Kein Handy. Im Schneidersitz, dann wechseln.' },
    ],
    style: [
      { title: 'Outfit für morgen heute Abend rauslegen', body: 'Einmal gut entscheiden. Der Morgen ist frei.' },
      { title: 'Uhr bewusst wählen', body: 'Ein Teil trägt den Look. Wähl es absichtlich.' },
      { title: 'Ein Hemd bügeln', body: 'Das, das du immer skippst, weil es zerknittert ist.' },
      { title: 'Strick neu falten', body: 'Stapeln stellt die Garderobe wieder her. Fünf Minuten.' },
      { title: 'Ein Paar Schuhe pflegen', body: 'Erst Creme, dann Bürste. Spiegelglanz optional.' },
      { title: 'Ein ungetragenes Teil aussortieren', body: 'Du weißt, welches. Der Schrank belohnt Subtraktion.' },
      { title: 'Gürtel-Schuh-Ton-Match', body: 'Heutiger kleiner Luxus. Gleiche Familie.' },
      { title: 'Hosenbund sauber krempeln', body: 'Ein präziser Roll. Liest sich als Sorgfalt.' },
      { title: 'Tonal stapeln', body: 'Drei Schattierungen derselben Wärme. Kein Kontrast.' },
      { title: 'Heute keine Logos', body: 'Achte darauf, wie viel weniger dein Auge sucht.' },
      { title: 'Ein persönliches Teil', body: 'Ring, Armband, Schal — eines. Trag\'s einen Monat.' },
      { title: 'Wollmantel fusseln', body: 'Fünf Minuten. Pre-Flight.' },
      { title: 'Die Farbe versuchen, die du meidest', body: 'Creme, Oliv, Rost — die, die du skippst.' },
      { title: 'Kommodenfläche reset', body: 'Zwei Schalen. Uhr, Geldbeutel, Schlüssel. Sonst nichts.' },
      { title: 'Uhr heute Abend rechts', body: 'Kleine Störung — Look neu sehen.' },
    ],
    confidence: [
      { title: 'Weniger sagen, mehr meinen', body: 'Ein Füllwort weglassen heute. Spür das Gewicht, das zurückkommt.' },
      { title: 'Augenkontakt +1 Sekunde', body: 'In jeder Begrüßung. Nur eine Sekunde länger.' },
      { title: 'Halt jemandem die Tür auf', body: 'Kleiner initiierter Akt setzt die Haltung zurück.' },
      { title: 'Komplimentier einen Fremden', body: 'Auf etwas, das er gewählt hat — nicht auf etwas, das er ist.' },
      { title: 'Sag heute einmal nein', body: 'Höflich, klar, ohne Entschuldigung. Trainiere den Muskel.' },
      { title: 'Drei Prozent langsamer reinkommen', body: 'In jeden Raum heute.' },
      { title: 'Steh die ersten zehn Minuten', body: 'Beim nächsten Meeting. Oder beim nächsten Kapitel.' },
      { title: 'Kein Handy am Tisch', body: 'Eine Mahlzeit. Blick hoch.' },
      { title: 'Eine schwerere Frage stellen', body: 'In einem Gespräch, das zählt. Heute.' },
      { title: 'Lautstärke runter', body: 'Sprich bei 70%. Beobachte, wie sie sich nach vorn lehnen.' },
      { title: 'Haltung: Rippen über Hüfte', body: 'Brust nicht rauspressen. Brustkorb stapeln.' },
      { title: 'Hände ruhig', body: 'Aus den Taschen. Weg vom Gesicht. Ruhend.' },
      { title: 'Mach einen langsamen Anruf', body: 'Heute keine Texte für eine Sache. Stimme statt Tippen.' },
      { title: 'Drei Atemzüge vor der Reaktion', body: 'Nur drei. Einmal. Schau, was sich ändert.' },
      { title: 'Schreib den Win auf', body: 'Ein Satz. Heute Abend. Morgen lesen.' },
    ],
    discipline: [
      { title: 'Handy in einen anderen Raum · 1 h', body: 'Nur eine. Die Langsamkeit kommt schnell zurück.' },
      { title: 'Ohne Snooze aufwachen', body: 'Einmal. Verdien den Morgen.' },
      { title: 'Bett machen', body: 'Das erste fertige Ding des Tages.' },
      { title: 'Inbox auf Null vor dem Mittag', body: 'Archivieren ohne unter den Fold zu lesen.' },
      { title: 'Zehn Minuten lesen', body: 'Papier, wenn möglich. Ein Kapitel.' },
      { title: 'Eine Stunde keine neuen Tabs', body: 'Schließ erst, was offen ist. Dann öffne.' },
      { title: 'Morgen heute Abend planen', body: 'Drei Dinge. Top of List vor dem Schlaf.' },
      { title: 'Kein zweiter Wecker', body: 'Behandle deine Deadlines wie fremde.' },
      { title: 'In die unangenehme Aufgabe zuerst', body: 'Vor dem Kaffee. Vor E-Mail.' },
      { title: 'Kein Handy im Bad', body: 'Einen ganzen Tag. Spür den Unterschied.' },
      { title: 'Schneller antworten, langsamer entscheiden', body: 'Bestätigen in unter einer Stunde. Entscheiden über Nacht.' },
      { title: 'Eine Schublade aufräumen', body: 'Irgendeine. Fünf Minuten. Sichtbarer Reset.' },
      { title: 'Drei Tage gleiches Mittag', body: 'Entscheidungskosten aus dem Tag rauslassen.' },
      { title: 'Lichter runter bis 22:30', body: 'Eine Nacht. Der ganze Folgetag ist anders.' },
      { title: 'Heute Notizbuch statt App', body: 'Verlangsame. Schreib weniger, gewichte mehr.' },
    ],
  },
};

export function getTodayNudge(lang: Lang): Nudge {
  const today = todayKey();
  const day = dayOfYear();
  const themeIdx = day % THEMES.length;
  const theme = THEMES[themeIdx];
  const list = NUDGES[lang][theme];
  const item = list[day % list.length];
  return {
    theme,
    title: item.title,
    body: item.body,
    date: today,
  };
}

export async function isNudgeDone(): Promise<boolean> {
  const map = await getJSON<Record<string, boolean>>(KEY, {});
  return !!map[todayKey()];
}

export async function setNudgeDone(done: boolean): Promise<void> {
  const map = await getJSON<Record<string, boolean>>(KEY, {});
  map[todayKey()] = done;
  await setJSON(KEY, map);
}

const GRACE_KEY = 'nudges.grace';
type GraceMap = Record<string, true>; // dates marked as "graced"

export async function getGraceDays(): Promise<GraceMap> {
  return getJSON<GraceMap>(GRACE_KEY, {});
}

/** Are we allowed to grace today? Limit: one per ISO week. */
export async function canGraceToday(): Promise<boolean> {
  const map = await getGraceDays();
  const d = new Date();
  // ISO week: subtract day-of-week offset (Mon=0) and walk back 7 days
  const offset = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - offset);
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    if (map[day.toISOString().slice(0, 10)]) return false;
  }
  return true;
}

export async function graceToday(): Promise<boolean> {
  const can = await canGraceToday();
  if (!can) return false;
  const map = await getGraceDays();
  map[todayKey()] = true;
  await setJSON(GRACE_KEY, map);
  return true;
}

/** Streak of consecutive completed daily nudges. Graced days count as completed. */
export async function getNudgeStreak(): Promise<number> {
  const map = await getJSON<Record<string, boolean>>(KEY, {});
  const grace = await getGraceDays();
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (map[key] || grace[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

const MILESTONE_KEY = 'nudges.celebrated';
export const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

/**
 * If the current streak hit a milestone we haven't celebrated yet,
 * return that milestone number and record it. Otherwise null.
 */
export async function consumeMilestone(streak: number): Promise<number | null> {
  if (streak <= 0) return null;
  const lastCelebrated = await getJSON<number>(MILESTONE_KEY, 0);
  // Find the highest reached milestone that's also > lastCelebrated
  const reached = MILESTONES.filter((m) => m <= streak);
  if (reached.length === 0) return null;
  const top = reached[reached.length - 1];
  if (top <= lastCelebrated) return null;
  await setJSON<number>(MILESTONE_KEY, top);
  return top;
}
