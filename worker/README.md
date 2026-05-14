# JIGGO Coach Proxy

A tiny Cloudflare Worker that lets JIGGO charge for the AI Coach **without you
paying the API bill out of pocket** and **without users bringing their own
key**.

It holds *your* Anthropic key, relays Coach turns to the Anthropic Messages
API, and only does so for a caller who proves — with a StoreKit 2 signed
transaction — that they hold a live JIGGO Pro subscription. Each subscriber
gets a per-day turn budget.

> **The economics:** the Coach runs on **Claude Haiku** (~1–4 $/subscriber/year
> at a 60-turn/day cap). A 39.99 $/yr subscription covers that many times over —
> the subscription pays the API, you keep the margin.

This is the v1.1 backend. v1.0 ships BYO-key only; the app points at this proxy
once StoreKit 2 is wired and `PRO_ENABLED` is flipped on.

---

## 1. Prerequisites

- A Cloudflare account (free plan is enough to start).
- `node` + `npx` (Wrangler is a dev dependency here — no global install needed).
- Your Anthropic API key.

```sh
cd worker
npm install
npx wrangler login          # opens a browser once
```

## 2. Create the rate-limit KV namespace

```sh
npx wrangler kv namespace create COACH_RL
```

Copy the printed `id` into `wrangler.toml` → `[[kv_namespaces]]` → `id`.

## 3. Pin the Apple Root CA (strongly recommended)

The proxy verifies the StoreKit 2 certificate chain. Pinning the root closes
the last gap. Download **Apple Root CA - G3** from
<https://www.apple.com/certificateauthority/> (`AppleRootCA-G3.cer`), then:

```sh
base64 -i AppleRootCA-G3.cer | tr -d '\n' | npx wrangler secret put APPLE_ROOT_CA_G3_B64
```

If you skip this, the chain is still cryptographically verified end-to-end —
pinning just removes any reliance on the chain terminating where you expect.

## 4. Set the Anthropic key (secret)

```sh
npx wrangler secret put ANTHROPIC_API_KEY
```

## 5. Deploy

```sh
npm run deploy
```

Wrangler prints the Worker URL, e.g. `https://jiggo-coach-proxy.<subdomain>.workers.dev`.

## 6. Wire the app to it

In `lib/coach.ts`, when the user is a Pro subscriber (not BYO-key), send Coach
requests to the Worker instead of `api.anthropic.com`:

- **URL:** the Worker URL (root path).
- **Header:** `Authorization: Bearer <jwsRepresentation>` — the StoreKit 2
  signed-transaction JWS from the user's current entitlement (see task #74,
  the `react-native-iap` integration).
- **Body:** unchanged — the same Anthropic Messages API payload, including
  `stream: true`. The proxy passes the SSE stream straight through.
- Drop the `x-api-key` / `anthropic-version` headers on that path — the proxy
  adds them.
- Read `x-coach-quota-used` / `x-coach-quota-limit` off the response to show
  remaining turns; a `429 daily_limit_reached` means the budget is spent.

The BYO-key path in `lib/coach.ts` stays exactly as it is — this only adds a
second path for Pro users.

## 7. How the auth works

```
app  ──POST /  Authorization: Bearer <StoreKit2 JWS>──▶  Worker
                                                          │ 1. verify x5c chain (each cert signs the next)
                                                          │ 2. pin root == Apple Root CA - G3
                                                          │ 3. verify JWS signature under the leaf cert
                                                          │ 4. payload: bundleId + entitled product + not expired/revoked
                                                          │ 5. KV: per-originalTransactionId daily counter
                                                          ▼
                                              api.anthropic.com  (x-api-key = your secret)
```

The JWS is self-verifying — no Apple server round-trip needed. A request with
no token, an expired subscription, or a forged chain is rejected before the
Anthropic key is ever touched.

## Config reference (`wrangler.toml` `[vars]`)

| var | meaning |
|-----|---------|
| `BUNDLE_ID` | must match the app — `com.jiggo.maxxing` |
| `ALLOWED_PRODUCT_IDS` | comma-separated StoreKit product ids that unlock the Coach |
| `DAILY_LIMIT` | turns per subscriber per day (default 60) |

Secrets (via `wrangler secret put`): `ANTHROPIC_API_KEY`, `APPLE_ROOT_CA_G3_B64`.

## Local dev

```sh
npm run dev        # wrangler dev — needs a real JWS to get past auth
npm run typecheck  # tsc --noEmit
```
