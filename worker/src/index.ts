/**
 * JIGGO Coach proxy — Cloudflare Worker.
 *
 * Holds the developer's Anthropic API key and relays Coach turns to the
 * Anthropic Messages API, but only for callers who present a valid StoreKit 2
 * signed transaction (i.e. a live JIGGO Pro subscriber). Each subscriber gets
 * a per-day turn budget. This is what makes the monetisation model work:
 * the user pays for Pro, the proxy spends the key, Haiku keeps the cost a
 * fraction of the subscription price.
 *
 * Request:  POST /  with `Authorization: Bearer <StoreKit2-transaction-JWS>`
 *           and an Anthropic Messages API JSON body.
 * Response: the Anthropic response, passed through (SSE stream or JSON).
 */
import { verifyTransactionJWS } from './appleJws';

export interface Env {
  /** Secret — the proxy's own Anthropic API key. */
  ANTHROPIC_API_KEY: string;
  /** KV namespace for per-user daily turn counters. */
  COACH_RL: KVNamespace;
  /** Secret (recommended) — base64 DER of "Apple Root CA - G3". */
  APPLE_ROOT_CA_G3_B64?: string;
  BUNDLE_ID: string;
  ALLOWED_PRODUCT_IDS: string;
  DAILY_LIMIT: string;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (req.method !== 'POST') return cors(json({ error: 'method_not_allowed' }, 405));

    // --- auth: StoreKit 2 signed transaction in the Authorization header -----
    const authHeader = req.headers.get('Authorization') ?? '';
    const jws = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!jws) return cors(json({ error: 'missing_subscription_token' }, 401));

    let ent;
    try {
      ent = await verifyTransactionJWS(jws, {
        bundleId: env.BUNDLE_ID,
        allowedProductIds: env.ALLOWED_PRODUCT_IDS.split(',').map((s) => s.trim()).filter(Boolean),
        appleRootCa: env.APPLE_ROOT_CA_G3_B64 ? b64ToBytes(env.APPLE_ROOT_CA_G3_B64) : undefined,
      });
    } catch (e) {
      return cors(json({ error: 'invalid_subscription', detail: errMsg(e) }, 403));
    }

    // --- per-user daily rate limit ------------------------------------------
    const day = new Date().toISOString().slice(0, 10);
    const rlKey = `rl:${ent.originalTransactionId}:${day}`;
    const limit = parseInt(env.DAILY_LIMIT || '60', 10);
    const used = parseInt((await env.COACH_RL.get(rlKey)) ?? '0', 10);
    if (used >= limit) {
      return cors(json({ error: 'daily_limit_reached', limit }, 429));
    }

    // --- relay to Anthropic --------------------------------------------------
    const body = await req.text();
    let upstream: Response;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body,
      });
    } catch (e) {
      return cors(json({ error: 'upstream_unreachable', detail: errMsg(e) }, 502));
    }

    // Count the turn only when Anthropic actually accepted the request.
    if (upstream.ok) {
      await env.COACH_RL.put(rlKey, String(used + 1), { expirationTtl: 60 * 60 * 26 });
    }

    const headers = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) headers.set('content-type', ct);
    headers.set('x-coach-quota-used', String(upstream.ok ? used + 1 : used));
    headers.set('x-coach-quota-limit', String(limit));
    return cors(new Response(upstream.body, { status: upstream.status, headers }));
  },
};

function cors(res: Response): Response {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, anthropic-version');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Expose-Headers', 'x-coach-quota-used, x-coach-quota-limit');
  return res;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
