/** Shared model types. */
export type Mood = 'sharp' | 'even' | 'foggy' | 'low' | 'wired';

export type JournalEntry = {
  id: string;
  // ISO date-only (YYYY-MM-DD) — one canonical entry per day, but
  // multiple notes per entry are allowed.
  date: string;
  weightKg?: number;
  sleepHours?: number;
  mood?: Mood;
  notes: string;
  createdAt: number;
};

export type ScanResult = {
  id: string;
  createdAt: number;
  photoUri?: string;
  // 0–100 scores per private dimension
  dimensions: Record<string, number>;
  overall: number;
  insight: string;
};

export type PlanItem = {
  id: string;
  time: string;
  title: string;
  category: 'Grooming' | 'Physique' | 'Style' | 'Mind';
  duration: string;
};

export type PlanCompletion = {
  // date (YYYY-MM-DD) -> array of completed item ids
  [date: string]: string[];
};

export type CoachTurn = {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
};

export type Settings = {
  name?: string;
  goalKg?: number;
  units: 'metric' | 'imperial';
  apiKey?: string; // stored in expo-secure-store, mirrored flag here
  hasOnboarded: boolean;
};
