import { getJSON, setJSON } from './storage';
import { PlanCompletion, PlanItem } from './types';
import { todayKey } from './journal';

const KEY = 'plan.completion';

export const DEFAULT_PLAN: PlanItem[] = [
  { id: 'p1', time: '07:00', title: 'Cold rinse',         category: 'Grooming', duration: '2m'  },
  { id: 'p2', time: '07:30', title: 'Skin: AM routine',   category: 'Grooming', duration: '4m'  },
  { id: 'p3', time: '12:30', title: 'Walk · 4k steps',    category: 'Physique', duration: '35m' },
  { id: 'p4', time: '18:00', title: 'Push session',       category: 'Physique', duration: '45m' },
  { id: 'p5', time: '21:00', title: 'Skin: PM + retinol', category: 'Grooming', duration: '6m'  },
];

export async function getCompletion(): Promise<PlanCompletion> {
  return getJSON<PlanCompletion>(KEY, {});
}

export async function toggleComplete(itemId: string, dateKey = todayKey()): Promise<string[]> {
  const map = await getCompletion();
  const list = map[dateKey] ?? [];
  const next = list.includes(itemId)
    ? list.filter((x) => x !== itemId)
    : [...list, itemId];
  map[dateKey] = next;
  await setJSON(KEY, map);
  return next;
}
