/**
 * Closet + Outfit Builder — the JIGGO take on Aesty's wardrobe.
 *
 * Local-first. Photos optional. Each ClosetItem is a category (Top, Bottom,
 * Outerwear, Shoes, Accessories) plus a dominant color and a tonal warmth
 * marker. The builder composes items into Looks and scores them across
 * color harmony, silhouette balance, and occasion fit — never against
 * "other people."
 */
import { getJSON, setJSON } from './storage';

export type Category = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessories';
export type Tone = 'cool' | 'warm' | 'neutral';
export type Archetype =
  | 'tailored'
  | 'workwear'
  | 'street'
  | 'tonal'
  | 'athleisure'
  | 'bold';

export type Occasion = 'work' | 'date' | 'weekend' | 'travel' | 'formal' | 'training';

export type ClosetItem = {
  id: string;
  name: string;
  category: Category;
  // hex color (e.g. "#7A6A52")
  color: string;
  tone: Tone;
  // archetypes this item fits cleanly
  archetypes: Archetype[];
  // occasions this item fits cleanly
  occasions: Occasion[];
  photoUri?: string;
  createdAt: number;
};

export type Outfit = {
  id: string;
  items: ClosetItem[];
  occasion: Occasion;
  archetype: Archetype;
  matchColor: number;        // 0–100
  matchSilhouette: number;   // 0–100
  matchOccasion: number;     // 0–100
  overall: number;
  rationale: string;
};

const KEY = 'closet';

// ───────── Storage ─────────

/**
 * All closet mutations are serialised through a single in-memory promise
 * chain. Without this, two concurrent callers (e.g. a fast double-tap on
 * Save in the closet-add modal, or seedStarterCloset running while the user
 * adds something manually) both read the same snapshot, both unshift their
 * own item, and the second write silently drops the first.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function queueWrite<T>(run: () => Promise<T>): Promise<T> {
  const next = writeChain.then(run, run);
  writeChain = next.catch(() => undefined);
  return next;
}

export async function listItems(): Promise<ClosetItem[]> {
  const list = await getJSON<ClosetItem[]>(KEY, []);
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export function addItem(item: Omit<ClosetItem, 'id' | 'createdAt'>): Promise<ClosetItem> {
  return queueWrite(async () => {
    const list = await getJSON<ClosetItem[]>(KEY, []);
    const next: ClosetItem = {
      ...item,
      id: `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    list.unshift(next);
    await setJSON(KEY, list);
    return next;
  });
}

export function deleteItem(id: string): Promise<void> {
  return queueWrite(async () => {
    const list = await getJSON<ClosetItem[]>(KEY, []);
    await setJSON(KEY, list.filter((i) => i.id !== id));
  });
}

export function updateItem(id: string, patch: Partial<ClosetItem>): Promise<void> {
  return queueWrite(async () => {
    const list = await getJSON<ClosetItem[]>(KEY, []);
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      await setJSON(KEY, list);
    }
  });
}

export async function getItem(id: string): Promise<ClosetItem | null> {
  const list = await getJSON<ClosetItem[]>(KEY, []);
  return list.find((i) => i.id === id) ?? null;
}

// ───────── Curated palettes & looks ─────────

/** Color palette: editorial, masculine, archive-grade. */
export const COLORS: { hex: string; name: string; tone: Tone }[] = [
  { hex: '#0A0A0A', name: 'Jet',         tone: 'neutral' },
  { hex: '#1C1C1C', name: 'Onyx',        tone: 'neutral' },
  { hex: '#2E2A24', name: 'Espresso',    tone: 'warm' },
  { hex: '#3B3A36', name: 'Slate',       tone: 'cool' },
  { hex: '#5C4A38', name: 'Walnut',      tone: 'warm' },
  { hex: '#7A6A52', name: 'Khaki',       tone: 'warm' },
  { hex: '#8E8174', name: 'Stone',       tone: 'warm' },
  { hex: '#A89F8B', name: 'Sand',        tone: 'warm' },
  { hex: '#C7BDA7', name: 'Bone',        tone: 'warm' },
  { hex: '#E7DFCC', name: 'Cream',       tone: 'warm' },
  { hex: '#F2EDE4', name: 'Ivory',       tone: 'warm' },
  { hex: '#FFFFFF', name: 'White',       tone: 'neutral' },
  { hex: '#26312B', name: 'Forest',      tone: 'cool' },
  { hex: '#3B5347', name: 'Pine',        tone: 'cool' },
  { hex: '#22354C', name: 'Indigo',      tone: 'cool' },
  { hex: '#1F2A36', name: 'Navy',        tone: 'cool' },
  { hex: '#5C2D24', name: 'Cognac',      tone: 'warm' },
  { hex: '#7A3527', name: 'Rust',        tone: 'warm' },
  { hex: '#B08A5A', name: 'Bronze',      tone: 'warm' },
];

export const ARCHETYPE_TONE: Record<Archetype, Tone> = {
  tailored: 'cool',
  workwear: 'warm',
  street:   'neutral',
  tonal:    'warm',
  athleisure: 'neutral',
  bold:     'warm',
};

// ───────── Curated looks (Aesty-style copy-the-look feed) ─────────

export type Look = {
  id: string;
  title: string;
  archetype: Archetype;
  occasion: Occasion;
  palette: string[]; // hex
  description: string;
  copy: string;
  cover?: any; // require() handle (bundled PNG)
};

/** Map of look id → bundled cover image. */
export const LOOK_COVERS: Record<string, any> = {
  l1:  require('../assets/looks/l1.png'),
  l2:  require('../assets/looks/l2.png'),
  l3:  require('../assets/looks/l3.png'),
  l4:  require('../assets/looks/l4.png'),
  l5:  require('../assets/looks/l5.png'),
  l6:  require('../assets/looks/l6.png'),
  l7:  require('../assets/looks/l7.png'),
  l8:  require('../assets/looks/l8.png'),
  l9:  require('../assets/looks/l9.png'),
  l10: require('../assets/looks/l10.png'),
  l11: require('../assets/looks/l11.png'),
  l12: require('../assets/looks/l12.png'),
  l13: require('../assets/looks/l13.png'),
  l14: require('../assets/looks/l14.png'),
  l15: require('../assets/looks/l15.png'),
  l16: require('../assets/looks/l16.png'),
  l17: require('../assets/looks/l17.png'),
  l18: require('../assets/looks/l18.png'),
  l19: require('../assets/looks/l19.png'),
  l20: require('../assets/looks/l20.png'),
  l21: require('../assets/looks/l21.png'),
  l22: require('../assets/looks/l22.png'),
  l23: require('../assets/looks/l23.png'),
  l24: require('../assets/looks/l24.png'),
};

/** Average tone of a look based on its palette. */
export function lookTone(look: Look): Tone {
  let warm = 0;
  let cool = 0;
  let neutral = 0;
  for (const hex of look.palette) {
    const c = COLORS.find((x) => x.hex.toLowerCase() === hex.toLowerCase());
    if (!c) continue;
    if (c.tone === 'warm') warm++;
    else if (c.tone === 'cool') cool++;
    else neutral++;
  }
  if (warm > cool && warm > neutral) return 'warm';
  if (cool > warm && cool > neutral) return 'cool';
  return 'neutral';
}

export const LOOKS: Look[] = [
  {
    id: 'l1',
    title: 'Bone linen, espresso trouser',
    archetype: 'tonal',
    occasion: 'weekend',
    palette: ['#E7DFCC', '#5C4A38', '#0A0A0A'],
    description: 'Tonal cream over warm brown, leather sandal or loafer.',
    copy: 'Open camp-collar shirt, pleated trouser breaking once on the shoe. Watch with brown strap.',
  },
  {
    id: 'l2',
    title: 'Slate suit, ivory tee',
    archetype: 'tailored',
    occasion: 'work',
    palette: ['#3B3A36', '#F2EDE4', '#0A0A0A'],
    description: 'Soft-shoulder suit, tee instead of shirt for a relaxed read.',
    copy: 'No tie. Plain dial watch. Suede chelsea or low-profile sneaker — never both.',
  },
  {
    id: 'l3',
    title: 'Workwear stack — khaki + denim',
    archetype: 'workwear',
    occasion: 'weekend',
    palette: ['#7A6A52', '#1F2A36', '#5C4A38'],
    description: 'Chore jacket over denim, raw selvedge, leather boot.',
    copy: 'Roll the cuff once. Heavy cotton tee underneath. Earth tones, no logos.',
  },
  {
    id: 'l4',
    title: 'Forest knit, navy pant',
    archetype: 'tonal',
    occasion: 'date',
    palette: ['#26312B', '#1F2A36', '#A89F8B'],
    description: 'Crew knit over collared shirt, tapered wool trouser.',
    copy: 'Layered without bulk. Add one personal piece — a ring, a scarf, a watch.',
  },
  {
    id: 'l5',
    title: 'Bronze and black — formal',
    archetype: 'bold',
    occasion: 'formal',
    palette: ['#B08A5A', '#0A0A0A', '#F2EDE4'],
    description: 'Bronze pocket square or knit tie against a black suit.',
    copy: 'One bronze note only. Polished leather shoe, white shirt.',
  },
  {
    id: 'l6',
    title: 'Indigo top, stone bottom',
    archetype: 'street',
    occasion: 'travel',
    palette: ['#22354C', '#8E8174', '#1C1C1C'],
    description: 'Boxy crew over loose pleated chino, low-top trainer.',
    copy: 'Carry one structured bag, not two. Sunglasses simple.',
  },
  {
    id: 'l7',
    title: 'All-cream layered',
    archetype: 'tonal',
    occasion: 'weekend',
    palette: ['#E7DFCC', '#C7BDA7', '#F2EDE4'],
    description: 'Three shades of cream. Texture varies — knit, linen, suede.',
    copy: 'Different fabrics, same temperature. Cuff loose, hem clean.',
  },
  {
    id: 'l8',
    title: 'Navy blazer, white tee, denim',
    archetype: 'tailored',
    occasion: 'date',
    palette: ['#1F2A36', '#FFFFFF', '#3B3A36'],
    description: 'Soft blazer, raw denim, suede loafer.',
    copy: 'Tee tucked just enough. No logos. Belt and shoe close in tone.',
  },
  {
    id: 'l9',
    title: 'Olive utility, training',
    archetype: 'athleisure',
    occasion: 'training',
    palette: ['#3B5347', '#1C1C1C', '#8E8174'],
    description: 'Performance tee, jogger, clean trainer. Sweat-ready.',
    copy: 'Match the trainer to the bag tone. Phone in pocket, not in hand.',
  },
  {
    id: 'l10',
    title: 'Rust knit, navy denim',
    archetype: 'workwear',
    occasion: 'weekend',
    palette: ['#7A3527', '#1F2A36', '#E7DFCC'],
    description: 'Heavy knit with rolled jean, leather boot in mid-brown.',
    copy: 'Strong autumn palette. Keep accessories soft.',
  },
  {
    id: 'l11',
    title: 'Black-on-black, sharp',
    archetype: 'bold',
    occasion: 'date',
    palette: ['#0A0A0A', '#1C1C1C', '#B08A5A'],
    description: 'Black knit, black trouser, polished derby. One bronze accent.',
    copy: 'Fit is the only luxury. Tailored or it reads cheap.',
  },
  {
    id: 'l12',
    title: 'Indigo on indigo, weekend',
    archetype: 'street',
    occasion: 'weekend',
    palette: ['#22354C', '#1F2A36', '#FFFFFF'],
    description: 'Denim shirt, denim trouser, white sneaker.',
    copy: 'Two shades of indigo, never identical. Cuffs match.',
  },
  {
    id: 'l13',
    title: 'Workwear into evening',
    archetype: 'workwear',
    occasion: 'date',
    palette: ['#0A0A0A', '#7A6A52', '#A89F8B'],
    description: 'Heavy chore jacket over black tee and khaki trouser.',
    copy: 'Roll the cuff once. Leather boot, not sneaker. Heritage reads adult after 7pm.',
  },
  {
    id: 'l14',
    title: 'Off-white stack',
    archetype: 'tonal',
    occasion: 'travel',
    palette: ['#F2EDE4', '#A89F8B', '#5C4A38'],
    description: 'Ivory shirt, sand chino, walnut belt and boot.',
    copy: 'Three tones, one temperature. Easy to pack, hard to break.',
  },
  {
    id: 'l15',
    title: 'Navy + pine + bone',
    archetype: 'tonal',
    occasion: 'work',
    palette: ['#1F2A36', '#3B5347', '#C7BDA7'],
    description: 'Navy blazer, pine knit, bone trouser.',
    copy: 'Earthy, not earthy-bro. Pocket square only if you mean it.',
  },
  {
    id: 'l16',
    title: 'Cognac, jet, cream',
    archetype: 'tailored',
    occasion: 'formal',
    palette: ['#5C2D24', '#0A0A0A', '#E7DFCC'],
    description: 'Black suit, cream shirt, cognac suede shoe.',
    copy: 'One warm note breaks the formal. Watch on the leather strap.',
  },
  {
    id: 'l17',
    title: 'Slate and rust, formal',
    archetype: 'tailored',
    occasion: 'formal',
    palette: ['#3B3A36', '#7A3527', '#0A0A0A'],
    description: 'Charcoal suit, rust tie or pocket square, black derby.',
    copy: 'Autumn-evening palette. Belt matches the shoe to the millimetre.',
  },
  {
    id: 'l18',
    title: 'White, jet, bronze',
    archetype: 'bold',
    occasion: 'date',
    palette: ['#FFFFFF', '#0A0A0A', '#B08A5A'],
    description: 'White crisp shirt, black trouser, bronze watch.',
    copy: 'Contrast carried by one accent. No second metal.',
  },
  {
    id: 'l19',
    title: 'Forest + khaki, training',
    archetype: 'athleisure',
    occasion: 'training',
    palette: ['#26312B', '#7A6A52', '#0A0A0A'],
    description: 'Forest tee, khaki jogger, black trainer.',
    copy: 'Outdoor palette in the gym. Performance reads through fit.',
  },
  {
    id: 'l20',
    title: 'Stone over navy',
    archetype: 'street',
    occasion: 'travel',
    palette: ['#8E8174', '#1F2A36', '#F2EDE4'],
    description: 'Stone overshirt over navy tee, ivory chino, low trainer.',
    copy: 'Three tones, three weights. Sleeves roll, hems clean.',
  },
  {
    id: 'l21',
    title: 'Espresso and sand',
    archetype: 'workwear',
    occasion: 'weekend',
    palette: ['#2E2A24', '#A89F8B', '#1C1C1C'],
    description: 'Espresso shirt-jacket, sand chino, dark suede boot.',
    copy: 'Warmth and weight. Knit hat optional, never mandatory.',
  },
  {
    id: 'l22',
    title: 'Bone, slate, bronze',
    archetype: 'tonal',
    occasion: 'date',
    palette: ['#C7BDA7', '#3B3A36', '#B08A5A'],
    description: 'Bone knit, slate trouser, bronze accents.',
    copy: 'Soft on top, structured below. One metal accent.',
  },
  {
    id: 'l23',
    title: 'Indigo and walnut',
    archetype: 'workwear',
    occasion: 'weekend',
    palette: ['#22354C', '#0A0A0A', '#5C4A38'],
    description: 'Indigo overshirt, dark jean, walnut boot.',
    copy: 'Earth ladder. No logo. Bag in the same brown family.',
  },
  {
    id: 'l24',
    title: 'Rust on forest',
    archetype: 'bold',
    occasion: 'weekend',
    palette: ['#7A3527', '#26312B', '#F2EDE4'],
    description: 'Rust knit, forest chino, ivory sock-and-loafer.',
    copy: 'Strong autumn statement. Pick this when you want to be remembered.',
  },
];

// ───────── Outfit scoring ─────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function avgColorHarmony(items: ClosetItem[]): number {
  if (items.length < 2) return 80;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      total += colorDistance(items[i].color, items[j].color);
      pairs++;
    }
  }
  const avg = total / Math.max(1, pairs);
  // Lower distances == more harmonious. Map 0..220 -> 95..55, clamp.
  const score = 95 - (avg / 220) * 40;
  return Math.max(40, Math.min(95, Math.round(score)));
}

function silhouetteBalance(items: ClosetItem[]): number {
  // A balanced silhouette has 1 top, 1 bottom, 1 shoe at minimum.
  const cats = new Set(items.map((i) => i.category));
  let score = 50;
  if (cats.has('top')) score += 15;
  if (cats.has('bottom')) score += 15;
  if (cats.has('shoes')) score += 10;
  if (cats.has('outerwear')) score += 5;
  if (cats.has('accessories')) score += 5;
  return Math.min(95, score);
}

function occasionFit(items: ClosetItem[], occasion: Occasion): number {
  if (items.length === 0) return 50;
  const fits = items.filter((i) => i.occasions.includes(occasion)).length;
  const ratio = fits / items.length;
  return Math.max(45, Math.min(95, Math.round(50 + ratio * 45)));
}

export function scoreOutfit(items: ClosetItem[], occasion: Occasion, archetype: Archetype): Outfit {
  const matchColor = avgColorHarmony(items);
  const matchSilhouette = silhouetteBalance(items);
  const matchOccasion = occasionFit(items, occasion);
  const overall = Math.round((matchColor + matchSilhouette + matchOccasion) / 3);
  const tones = new Set(items.map((i) => i.tone));
  const tone =
    tones.size === 1 ? `${[...tones][0]} palette` : 'mixed temperature';
  const sil =
    items.length >= 3 ? 'three-piece silhouette' : 'two-piece silhouette';

  let rationale = `${tone}, ${sil}.`;
  if (matchColor >= 80) rationale += ' Colors stay in the same temperature.';
  else if (matchColor < 60) rationale += ' Colors pull in different directions — add a neutral.';
  if (matchSilhouette < 75) rationale += ' Add a shoe or layer to close the silhouette.';
  if (matchOccasion < 70) rationale += ` Some items don't typically read "${occasion}" — swap one.`;

  return {
    id: `of_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    items,
    occasion,
    archetype,
    matchColor,
    matchSilhouette,
    matchOccasion,
    overall,
    rationale,
  };
}

export function buildSuggestion(
  items: ClosetItem[],
  occasion: Occasion,
  archetype: Archetype,
): Outfit | null {
  if (items.length === 0) return null;
  const byCat: Record<Category, ClosetItem[]> = {
    top: [], bottom: [], outerwear: [], shoes: [], accessories: [],
  };
  for (const it of items) byCat[it.category].push(it);

  const pick = (arr: ClosetItem[]) => {
    if (arr.length === 0) return null;
    // Prefer items that match the archetype AND occasion; fall back to any.
    const matchBoth = arr.filter(
      (i) => i.archetypes.includes(archetype) && i.occasions.includes(occasion),
    );
    if (matchBoth.length) return matchBoth[0];
    const matchOne = arr.filter(
      (i) => i.archetypes.includes(archetype) || i.occasions.includes(occasion),
    );
    if (matchOne.length) return matchOne[0];
    return arr[0];
  };

  const picks = [
    pick(byCat.top),
    pick(byCat.bottom),
    pick(byCat.shoes),
    pick(byCat.outerwear),
    pick(byCat.accessories),
  ].filter(Boolean) as ClosetItem[];

  if (picks.length === 0) return null;
  return scoreOutfit(picks, occasion, archetype);
}

export const OCCASIONS: Occasion[] = ['work', 'date', 'weekend', 'travel', 'formal', 'training'];
export const ARCHETYPES: Archetype[] = ['tailored', 'workwear', 'street', 'tonal', 'athleisure', 'bold'];
export const CATEGORIES: Category[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessories'];

/** 8 starter pieces — gets the builder working on first open. */
export const STARTER_ITEMS: Omit<ClosetItem, 'id' | 'createdAt'>[] = [
  { name: 'Ivory crew tee',         category: 'top',         color: '#F2EDE4', tone: 'warm',    archetypes: ['tonal', 'tailored', 'athleisure'], occasions: ['weekend', 'date', 'work'] },
  { name: 'Black crew knit',        category: 'top',         color: '#0A0A0A', tone: 'neutral', archetypes: ['tailored', 'bold', 'tonal'],       occasions: ['date', 'formal', 'work'] },
  { name: 'Bone linen shirt',       category: 'top',         color: '#E7DFCC', tone: 'warm',    archetypes: ['tonal', 'workwear'],               occasions: ['weekend', 'travel', 'date'] },
  { name: 'Navy wool trouser',      category: 'bottom',      color: '#1F2A36', tone: 'cool',    archetypes: ['tailored', 'tonal'],               occasions: ['work', 'formal', 'date'] },
  { name: 'Raw indigo denim',       category: 'bottom',      color: '#22354C', tone: 'cool',    archetypes: ['workwear', 'street', 'tonal'],      occasions: ['weekend', 'date', 'travel'] },
  { name: 'Walnut leather boot',    category: 'shoes',       color: '#5C4A38', tone: 'warm',    archetypes: ['workwear', 'tonal', 'bold'],        occasions: ['weekend', 'travel', 'formal'] },
  { name: 'Stone canvas jacket',    category: 'outerwear',   color: '#8E8174', tone: 'warm',    archetypes: ['workwear', 'tonal'],                occasions: ['weekend', 'travel'] },
  { name: 'Bronze watch',           category: 'accessories', color: '#B08A5A', tone: 'warm',    archetypes: ['tonal', 'bold', 'tailored'],        occasions: ['work', 'date', 'formal', 'weekend'] },
];

export async function seedStarterCloset(): Promise<number> {
  const existing = await listItems();
  if (existing.length > 0) return 0;
  for (const it of STARTER_ITEMS) await addItem(it);
  return STARTER_ITEMS.length;
}

// ───────── Saved outfits ─────────

const SAVED_KEY = 'closet.outfits';

export type SavedOutfit = {
  id: string;
  itemIds: string[];
  occasion: Occasion;
  archetype: Archetype;
  overall: number;
  savedAt: number;
  name?: string;
};

export async function listSavedOutfits(): Promise<SavedOutfit[]> {
  const list = await getJSON<SavedOutfit[]>(SAVED_KEY, []);
  return [...list].sort((a, b) => b.savedAt - a.savedAt);
}

export async function saveOutfit(o: Outfit, name?: string): Promise<SavedOutfit> {
  const list = await getJSON<SavedOutfit[]>(SAVED_KEY, []);
  const saved: SavedOutfit = {
    id: `so_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    itemIds: o.items.map((i) => i.id),
    occasion: o.occasion,
    archetype: o.archetype,
    overall: o.overall,
    savedAt: Date.now(),
    name: name?.trim() || undefined,
  };
  list.unshift(saved);
  await setJSON(SAVED_KEY, list.slice(0, 50));
  return saved;
}

export async function deleteSavedOutfit(id: string): Promise<void> {
  const list = await getJSON<SavedOutfit[]>(SAVED_KEY, []);
  await setJSON(SAVED_KEY, list.filter((o) => o.id !== id));
}

/** Resolve a SavedOutfit into a full Outfit (or null if items deleted). */
export async function expandSavedOutfit(saved: SavedOutfit): Promise<Outfit | null> {
  const all = await listItems();
  const items = saved.itemIds
    .map((id) => all.find((i) => i.id === id))
    .filter((x): x is ClosetItem => !!x);
  if (items.length === 0) return null;
  return scoreOutfit(items, saved.occasion, saved.archetype);
}
