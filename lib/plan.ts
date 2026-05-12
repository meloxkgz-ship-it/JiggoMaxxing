import { getJSON, setJSON } from './storage';
import { PlanCompletion, PlanItem } from './types';
import { todayKey } from './journal';

const KEY = 'plan.completion';
const TEMPLATE_KEY = 'plan.template';

export type PlanTemplate = 'foundations' | 'disciplined' | 'lean' | 'travel';

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
};

export const DEFAULT_PLAN = PLAN_TEMPLATES.foundations;

export async function getActiveTemplate(): Promise<PlanTemplate> {
  const v = await getJSON<PlanTemplate>(TEMPLATE_KEY, 'foundations');
  return v ?? 'foundations';
}

export async function setActiveTemplate(v: PlanTemplate): Promise<void> {
  await setJSON(TEMPLATE_KEY, v);
}

export async function getActivePlan(): Promise<PlanItem[]> {
  const tpl = await getActiveTemplate();
  return PLAN_TEMPLATES[tpl];
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
