import { getJSON, setJSON } from './storage';
import { PlanCompletion, PlanItem } from './types';
import { todayKey } from './journal';

const KEY = 'plan.completion';
const TEMPLATE_KEY = 'plan.template';

export type PlanTemplate = 'foundations' | 'disciplined' | 'lean' | 'travel' | 'recovery' | 'cut';

export const PLAN_TEMPLATES: Record<PlanTemplate, PlanItem[]> = {
  foundations: [
    { id: 'f1', time: '07:00', title: 'Cold rinse',         category: 'Grooming', duration: '2m'  },
    { id: 'f2', time: '07:30', title: 'Skin: AM routine',   category: 'Grooming', duration: '4m'  },
    { id: 'f3', time: '12:30', title: 'Walk · 4k steps',    category: 'Physique', duration: '35m' },
    { id: 'f4', time: '18:00', title: 'Push session',       category: 'Physique', duration: '45m' },
    { id: 'f5', time: '21:00', title: 'Skin: PM + retinol', category: 'Grooming', duration: '6m'  },
  ],
  disciplined: [
    { id: 'd1', time: '06:30', title: 'Cold shower 30s',     category: 'Grooming', duration: '5m'  },
    { id: 'd2', time: '07:00', title: 'AM skin + SPF',       category: 'Grooming', duration: '6m'  },
    { id: 'd3', time: '12:30', title: 'Walk · 5k steps',     category: 'Physique', duration: '40m' },
    { id: 'd4', time: '18:00', title: 'Compound lifts',      category: 'Physique', duration: '60m' },
    { id: 'd5', time: '20:00', title: 'Posture reset',       category: 'Physique', duration: '5m'  },
    { id: 'd6', time: '21:00', title: 'PM skin + retinol',   category: 'Grooming', duration: '8m'  },
    { id: 'd7', time: '21:30', title: 'Style: lay out fit',  category: 'Style',    duration: '4m'  },
  ],
  lean: [
    { id: 'l1', time: '06:30', title: 'Fasted walk',         category: 'Physique', duration: '30m' },
    { id: 'l2', time: '07:30', title: 'AM skin + hydration', category: 'Grooming', duration: '5m'  },
    { id: 'l3', time: '12:00', title: 'High-protein meal',   category: 'Physique', duration: '15m' },
    { id: 'l4', time: '17:00', title: 'Lift · 6×6',          category: 'Physique', duration: '50m' },
    { id: 'l5', time: '18:30', title: 'Sauna or stretch',    category: 'Physique', duration: '20m' },
    { id: 'l6', time: '21:00', title: 'PM skin barrier',     category: 'Grooming', duration: '6m'  },
  ],
  travel: [
    { id: 't1', time: '08:00', title: 'Walk a new street',   category: 'Physique', duration: '20m' },
    { id: 't2', time: '08:30', title: 'AM skin minimal',     category: 'Grooming', duration: '3m'  },
    { id: 't3', time: '12:00', title: 'Hotel-room circuit',  category: 'Physique', duration: '15m' },
    { id: 't4', time: '20:00', title: 'Hydration check-in',  category: 'Physique', duration: '2m'  },
    { id: 't5', time: '22:00', title: 'PM skin barrier',     category: 'Grooming', duration: '4m'  },
  ],
  recovery: [
    { id: 'r1', time: '07:30', title: 'Easy walk',           category: 'Physique', duration: '20m' },
    { id: 'r2', time: '08:00', title: 'Skin: AM gentle',     category: 'Grooming', duration: '3m'  },
    { id: 'r3', time: '13:00', title: 'Mobility flow',       category: 'Physique', duration: '12m' },
    { id: 'r4', time: '17:00', title: 'Sauna or stretch',    category: 'Physique', duration: '20m' },
    { id: 'r5', time: '21:00', title: 'PM skin barrier',     category: 'Grooming', duration: '6m'  },
    { id: 'r6', time: '22:00', title: 'Lights down, no screens', category: 'Mind', duration: '0m' },
  ],
  cut: [
    { id: 'c1', time: '06:30', title: 'Fasted walk',         category: 'Physique', duration: '30m' },
    { id: 'c2', time: '07:30', title: 'AM hydration + SPF',  category: 'Grooming', duration: '4m'  },
    { id: 'c3', time: '12:00', title: 'High-protein meal',   category: 'Physique', duration: '15m' },
    { id: 'c4', time: '17:00', title: 'Compound lifts',      category: 'Physique', duration: '55m' },
    { id: 'c5', time: '19:00', title: 'Low-carb evening',    category: 'Physique', duration: '10m' },
    { id: 'c6', time: '21:00', title: 'PM skin · retinol',   category: 'Grooming', duration: '6m'  },
  ],
};

export const DEFAULT_PLAN = PLAN_TEMPLATES.foundations;

const USER_TEMPLATES_KEY = 'plan.userTemplates';

export type UserTemplate = {
  id: string;          // `u_*`
  name: string;
  items: PlanItem[];
};

export async function listUserTemplates(): Promise<UserTemplate[]> {
  return getJSON<UserTemplate[]>(USER_TEMPLATES_KEY, []);
}

export async function saveUserTemplate(name: string, items: PlanItem[]): Promise<UserTemplate> {
  const list = await listUserTemplates();
  const tpl: UserTemplate = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name: name.trim() || 'Untitled',
    items,
  };
  list.push(tpl);
  await setJSON(USER_TEMPLATES_KEY, list);
  return tpl;
}

export async function deleteUserTemplate(id: string): Promise<void> {
  const list = await listUserTemplates();
  await setJSON(USER_TEMPLATES_KEY, list.filter((x) => x.id !== id));
}

/**
 * Build a starter plan tailored to the user's selected onboarding goals.
 * Pulls 1–2 items per selected goal from a curated bank and sorts by time.
 * Saves it as a user template named (localised) "Your edge" and sets it active.
 */
const STARTER_BANK: Record<string, PlanItem[]> = {
  grooming: [
    { id: 'sg1', time: '07:00', title: 'Cold rinse · 30 sec',     category: 'Grooming', duration: '2m' },
    { id: 'sg2', time: '07:30', title: 'AM skin + SPF',           category: 'Grooming', duration: '4m' },
    { id: 'sg3', time: '21:00', title: 'PM skin · gentle',        category: 'Grooming', duration: '5m' },
  ],
  physique: [
    { id: 'sp1', time: '12:30', title: 'Ten-minute walk',         category: 'Physique', duration: '10m' },
    { id: 'sp2', time: '18:00', title: 'One set to discomfort',   category: 'Physique', duration: '15m' },
    { id: 'sp3', time: '21:30', title: 'Hip flexor stretch',      category: 'Physique', duration: '3m' },
  ],
  style: [
    { id: 'ss1', time: '21:45', title: 'Lay out tomorrow\'s fit', category: 'Style',    duration: '3m' },
  ],
  confidence: [
    { id: 'sc1', time: '09:30', title: 'Posture: ribs over hips', category: 'Mind',     duration: '1m' },
    { id: 'sc2', time: '14:00', title: 'Eye contact +1 second',   category: 'Mind',     duration: '0m' },
  ],
  discipline: [
    { id: 'sd1', time: '06:45', title: 'Make the bed',            category: 'Mind',     duration: '1m' },
    { id: 'sd2', time: '22:00', title: 'Phone in other room',     category: 'Mind',     duration: '0m' },
  ],
};

export async function seedStarterPlanFromGoals(
  goals: string[],
  name: string,
): Promise<UserTemplate | null> {
  if (!goals.length) return null;
  const collected: PlanItem[] = [];
  const seen = new Set<string>();
  for (const g of goals) {
    const bank = STARTER_BANK[g];
    if (!bank) continue;
    for (const it of bank) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      collected.push({ ...it });
    }
  }
  if (collected.length === 0) return null;
  collected.sort((a, b) => a.time.localeCompare(b.time));
  const tpl = await saveUserTemplate(name, collected);
  await setActiveTemplate(tpl.id);
  return tpl;
}

/** Active template can now be a built-in name or a user template id. */
export type ActiveTemplateId = PlanTemplate | string; // string covers u_*

export async function getActiveTemplate(): Promise<ActiveTemplateId> {
  const v = await getJSON<ActiveTemplateId>(TEMPLATE_KEY, 'foundations');
  return v ?? 'foundations';
}

export async function setActiveTemplate(v: ActiveTemplateId): Promise<void> {
  await setJSON(TEMPLATE_KEY, v);
}

const CUSTOM_KEY = 'plan.custom';

export async function getCustomItems(): Promise<PlanItem[]> {
  return getJSON<PlanItem[]>(CUSTOM_KEY, []);
}

export async function addCustomItem(item: Omit<PlanItem, 'id'>): Promise<PlanItem> {
  const list = await getJSON<PlanItem[]>(CUSTOM_KEY, []);
  const next: PlanItem = {
    ...item,
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
  };
  list.push(next);
  list.sort((a, b) => a.time.localeCompare(b.time));
  await setJSON(CUSTOM_KEY, list);
  return next;
}

export async function deleteCustomItem(id: string): Promise<void> {
  const list = await getJSON<PlanItem[]>(CUSTOM_KEY, []);
  await setJSON(CUSTOM_KEY, list.filter((x) => x.id !== id));
}

export async function getCustomItem(id: string): Promise<PlanItem | null> {
  const list = await getJSON<PlanItem[]>(CUSTOM_KEY, []);
  return list.find((x) => x.id === id) ?? null;
}

export async function updateCustomItem(id: string, patch: Partial<PlanItem>): Promise<void> {
  const list = await getJSON<PlanItem[]>(CUSTOM_KEY, []);
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    list.sort((a, b) => a.time.localeCompare(b.time));
    await setJSON(CUSTOM_KEY, list);
  }
}

/** Active plan = template items + any user-added custom items, sorted by time. */
export async function getActivePlan(): Promise<PlanItem[]> {
  const tpl = await getActiveTemplate();
  const custom = await getCustomItems();
  let base: PlanItem[];
  if (tpl in PLAN_TEMPLATES) {
    base = PLAN_TEMPLATES[tpl as PlanTemplate];
  } else {
    const user = (await listUserTemplates()).find((u) => u.id === tpl);
    base = user?.items ?? PLAN_TEMPLATES.foundations;
  }
  const merged = [...base, ...custom];
  merged.sort((a, b) => a.time.localeCompare(b.time));
  return merged;
}

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
