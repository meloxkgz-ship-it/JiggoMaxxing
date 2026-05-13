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

export type CoachStream = {
  text: string;
  done: boolean;
  error?: string;
};

async function buildUserContext(): Promise<string> {
  const [settings, edge] = await Promise.all([getSettings(), computeEdge()]);
  const parts: string[] = [];
  if (settings.name) parts.push(`User name: ${settings.name}.`);
  if (settings.goalKg) parts.push(`Goal weight: ${settings.goalKg} kg.`);
  if (settings.goals?.length) parts.push(`Focus pillars: ${settings.goals.join(', ')}.`);
  if (settings.experience) parts.push(`Self-described starting point: ${settings.experience}.`);
  parts.push(
    `Current Edge breakdown — total ${edge.total}/100 (scan ${edge.scan}, journal-streak signal ${edge.journal}, nudge-streak signal ${edge.nudge}, plan-today ${edge.plan}).`
  );
  parts.push(
    'Use these only as background. Do not lecture about them. Do not turn them into a score-ranking.',
  );
  return parts.join(' ');
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

export async function sendToCoach(
  history: CoachTurn[],
  signal?: AbortSignal,
): Promise<string> {
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
    signal,
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
 * Pass an AbortSignal to cancel in-flight requests (e.g. on navigate-away
 * or clear-history) — emits no further deltas after abort.
 */
export async function streamToCoach(
  history: CoachTurn[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
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
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Coach API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const reader = (res.body as any)?.getReader?.();
  if (!reader) {
    // Fallback: read entire response, parse SSE post-hoc
    const text = await res.text();
    return parseSSE(text, onDelta, signal);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';
  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are delimited by a blank line (\n\n or \r\n\r\n).
      // Anything before the last blank line is a complete event.
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';
      for (const evt of events) {
        if (signal?.aborted) break;
        flushSSEEvent(evt, (chunk) => { assembled += chunk; onDelta(chunk); });
      }
    }
    // Flush trailing buffer (handles servers that close without a final
    // blank line). Decoder flush also handles a UTF-8 boundary split mid-glyph.
    buffer += decoder.decode();
    if (buffer.trim() && !signal?.aborted) {
      flushSSEEvent(buffer, (chunk) => { assembled += chunk; onDelta(chunk); });
    }
  } finally {
    try { reader.releaseLock?.(); } catch {}
    if (signal?.aborted) {
      try { await reader.cancel?.(); } catch {}
    }
  }
  return assembled.trim();
}

/** Parse a single SSE event (may contain multiple `data:` lines per spec).
 * Throws if the event is an Anthropic `error` payload so the caller surfaces
 * the real upstream reason (overloaded, auth, rate-limit, etc.) instead of
 * a generic empty-reply fallback. */
function flushSSEEvent(raw: string, onDelta: (chunk: string) => void): void {
  const dataLines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    // Accept both `data: ` and `data:` per SSE spec.
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(line.startsWith('data: ') ? 6 : 5));
    }
  }
  if (!dataLines.length) return;
  const payload = dataLines.join('\n').trim();
  if (!payload || payload === '[DONE]') return;
  let evt: any;
  try {
    evt = JSON.parse(payload);
  } catch {
    return;
  }
  if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
    onDelta(evt.delta.text as string);
    return;
  }
  if (evt.type === 'error') {
    const msg = evt.error?.message ?? evt.error?.type ?? 'Coach stream error';
    throw new Error(msg);
  }
}

function parseSSE(raw: string, onDelta: (chunk: string) => void, signal?: AbortSignal): string {
  let assembled = '';
  for (const evt of raw.split(/\r?\n\r?\n/)) {
    if (signal?.aborted) break;
    flushSSEEvent(evt, (chunk) => { assembled += chunk; onDelta(chunk); });
  }
  return assembled.trim();
}

/**
 * Atomically replace the persisted coach history.
 *
 * Caps to the most recent {@link MAX_HISTORY} turns so a long-running
 * user can't exceed AsyncStorage's per-key budget (~6 MB on iOS). Beyond
 * that limit `setItem` throws and the persisted history would silently
 * stop growing — the next request would then send a truncated thread.
 */
const MAX_HISTORY = 200;
export async function saveHistory(turns: CoachTurn[]): Promise<void> {
  const capped = turns.length > MAX_HISTORY ? turns.slice(-MAX_HISTORY) : turns;
  await setJSON(KEY, capped);
}

/**
 * Verify an Anthropic API key with a 1-token roundtrip. Used by Settings
 * to confirm a paste actually works before persisting it — without this a
 * typo silently saves and the user sees "Coach unavailable" later with no
 * obvious cause.
 *
 * Returns null on success or a short error message on failure.
 */
export async function verifyApiKey(key: string): Promise<string | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (res.ok) return null;
    if (res.status === 401 || res.status === 403) return 'Key rejected. Check the value and try again.';
    if (res.status === 429) return 'Rate limit hit. Wait a moment and retry.';
    return `Anthropic API ${res.status}.`;
  } catch (e: any) {
    return `Network error: ${e?.message ?? 'unknown'}.`;
  }
}

export const COACH_SUGGESTIONS = [
  'Build me a 4‑week skin reset',
  'My posture collapses by 3pm. Fix.',
  'Push/pull/legs for a busy week',
  'How do I dress 5 kg leaner without faking it?',
  'I missed 3 days. Don\'t coddle me — restart plan.',
];
