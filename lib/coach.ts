/**
 * AI Coach — calls the Anthropic Messages API directly via fetch.
 * The SDK is Node-oriented; in RN we go straight to REST.
 *
 * System prompt locks the JIGGO MAXXING tone: confident, private,
 * disciplined, masculine, supportive. NEVER toxic looksmaxxing vocab.
 */
import { computeEdge } from './edge';
import { getApiKey, getSettings } from './settings';
import { getJSON, setJSON } from './storage';
import { CoachTurn } from './types';

const KEY = 'coach.history';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are the JIGGO MAXXING coach.

Identity & tone:
- You are a private, premium men's edge-coach inside an iOS app. You speak like a calm, disciplined mentor — closer to Headspace + an old-school strength coach than to fitness-influencer hype.
- You are confident, direct, supportive, masculine, and never patronising. You favour short sentences. You use plain English, never emojis or hashtags.
- Brand line: "Insight, not judgement."

Hard rules — never break these:
- NEVER rate the user's appearance, face, or attractiveness. No scores out of 10, no PSL, no Chad/Mog/looksmaxxing vocabulary, no surgery suggestions, no comparison to other people, no before/after shaming.
- Refuse to compare the user to anyone else, even if they ask. Redirect to their own trajectory.
- No medical claims. If asked something clinical (skin condition, supplement dosing, mental health crisis), recommend a professional and stay in your lane.
- Privacy: you do not store anything outside this conversation. Don't ask for identifying info you don't need.

What you DO help with:
- Grooming routines (skin AM/PM, hair, beard, hygiene).
- Physique habits (training splits, simple progressive overload, walking, sleep, hydration).
- Style direction (silhouette, fit, tone harmony — never "you don't have the face for X").
- Confidence as a *behavioural* skill: posture, eye contact, prepared conversations, recovery from awkward moments.
- Discipline frameworks: missed-day rules, habit stacking, weekly review.

Response shape:
- Keep replies tight. 80–160 words is the sweet spot.
- Lead with one direct observation or framing sentence.
- Then 2–5 concrete actions or a short framework.
- End with a single sharp prompt that moves the conversation forward.
- Use bullets only when listing 3+ items. Otherwise prose.

If the user is venting, acknowledge once, then redirect to a controllable action. Never moralise.

Language: mirror the user's language exactly. If they write in German, reply in German. If in English, in English. Never switch unprompted.`;

export async function listHistory(): Promise<CoachTurn[]> {
  return getJSON<CoachTurn[]>(KEY, []);
}

export async function clearHistory(): Promise<void> {
  await setJSON<CoachTurn[]>(KEY, []);
}

export async function appendTurn(turn: CoachTurn): Promise<CoachTurn[]> {
  const list = await getJSON<CoachTurn[]>(KEY, []);
  list.push(turn);
  await setJSON(KEY, list);
  return list;
}

export type CoachStream = {
  text: string;
  done: boolean;
  error?: string;
};

async function buildUserContext(): Promise<string> {
  const [settings, edge] = await Promise.all([getSettings(), computeEdge()]);
  const name = settings.name ? `User name: ${settings.name}.` : '';
  const goal = settings.goalKg ? ` Goal weight: ${settings.goalKg} kg.` : '';
  return `${name}${goal} Current Edge breakdown — total ${edge.total}/100 (scan ${edge.scan}, journal-streak signal ${edge.journal}, nudge-streak signal ${edge.nudge}, plan-today ${edge.plan}). Use these only as background. Do not lecture about them. Do not turn them into a score-ranking.`.trim();
}

async function buildRequest(history: CoachTurn[], stream: boolean) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      'No Anthropic API key set. Open Settings → Coach to add one.',
    );
  }
  const userContext = await buildUserContext();
  const messages = history.map((t) => ({ role: t.role, content: t.content }));
  return {
    apiKey,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'text', text: userContext },
      ],
      messages,
      stream,
    }),
  };
}

export async function sendToCoach(history: CoachTurn[]): Promise<string> {
  const { apiKey, body } = await buildRequest(history, false);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Coach API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text =
    (data?.content || [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim() || '';
  return text;
}

/**
 * Streaming version — emits text deltas as they arrive. Falls back to
 * non-streaming if the runtime doesn't support body.getReader().
 */
export async function streamToCoach(
  history: CoachTurn[],
  onDelta: (chunk: string) => void,
): Promise<string> {
  const { apiKey, body } = await buildRequest(history, true);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Coach API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = (res.body as any)?.getReader?.();
  if (!reader) {
    // Fallback: read entire response, parse SSE post-hoc
    const text = await res.text();
    const full = parseSSE(text, onDelta);
    return full;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          const chunk = evt.delta.text as string;
          assembled += chunk;
          onDelta(chunk);
        }
      } catch {}
    }
  }
  return assembled.trim();
}

function parseSSE(raw: string, onDelta: (chunk: string) => void): string {
  let assembled = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const evt = JSON.parse(payload);
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        assembled += evt.delta.text;
        onDelta(evt.delta.text);
      }
    } catch {}
  }
  return assembled.trim();
}

export const COACH_SUGGESTIONS = [
  'Build me a 4‑week skin reset',
  'My posture collapses by 3pm. Fix.',
  'Push/pull/legs for a busy week',
  'How do I dress 5 kg leaner without faking it?',
  'I missed 3 days. Don\'t coddle me — restart plan.',
];
