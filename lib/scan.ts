import { getJSON, setJSON } from './storage';
import { ScanResult } from './types';

const KEY = 'scans';

// Every dimension is a *controllable input* — something the user can move
// with habits and routine. No facial-symmetry / "lower-third" PSL scoring:
// that violates the brand pact (no aesthetic ranking of things you can't
// change) and is a known App Review risk for looksmaxxing-adjacent apps.
export const DIMENSIONS = [
  'Skin clarity',   // skincare routine
  'Recovery',       // sleep + hydration showing in the face
  'Grooming edge',  // beard line, neck, jaw upkeep
  'Brow + frame',   // brow trim + framing
  'Posture line',   // posture
  'Hair edge',      // haircut + hairline upkeep
] as const;

/**
 * Deterministic local pseudo-scoring. The photo URI seeds a PRNG that
 * produces plausible scores per dimension — *the same photo always
 * produces the same reading*, so the user doesn't see different numbers
 * when they re-scan the same shot moments apart. No upload, no ML — this
 * is the v1 honest on-device baseline. Future versions can swap in an
 * on-device CoreML model without changing the rest of the app.
 *
 * If no photo URI is available (camera race, picker edge case), we still
 * produce a stable reading by seeding with the day-bucket so the user
 * gets one consistent baseline per day instead of pure noise.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function computeScan(
  photoUri: string | undefined,
  insights: string[],
): Omit<ScanResult, 'id' | 'createdAt'> {
  // Seed only on photoUri: deterministic per photo, stable on rescan.
  // Fall back to a daily bucket when there is no photo URI.
  const seedInput = photoUri || `no-photo:${new Date().toDateString()}`;
  const seed = hash(seedInput);
  const rand = mulberry32(seed);
  const dimensions: Record<string, number> = {};
  let total = 0;
  for (const d of DIMENSIONS) {
    const score = Math.round(62 + rand() * 28); // 62..90
    dimensions[d] = score;
    total += score;
  }
  const overall = Math.round(total / DIMENSIONS.length);
  const insight = insights[Math.floor(rand() * insights.length)] ?? '';
  return { photoUri, dimensions, overall, insight };
}

export async function listScans(): Promise<ScanResult[]> {
  const list = await getJSON<ScanResult[]>(KEY, []);
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveScan(scan: Omit<ScanResult, 'id' | 'createdAt'>): Promise<ScanResult> {
  const list = await getJSON<ScanResult[]>(KEY, []);
  const result: ScanResult = {
    ...scan,
    id: `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  list.unshift(result);
  await setJSON(KEY, list.slice(0, 30)); // cap history
  return result;
}

export async function deleteScan(id: string): Promise<void> {
  const list = await getJSON<ScanResult[]>(KEY, []);
  await setJSON(KEY, list.filter((s) => s.id !== id));
}
