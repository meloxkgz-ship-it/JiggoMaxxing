/**
 * JIGGO Pro — StoreKit 2 in-app purchases (v1.1).
 *
 * Three products: two auto-renewable subscriptions (weekly, yearly) and one
 * non-consumable (lifetime). A successful purchase yields a StoreKit 2 signed
 * transaction whose compact JWS — `purchase.purchaseToken` on iOS — is what
 * the Coach proxy Worker verifies (see `worker/`). The JWS is cached in the
 * device keychain so the Coach can attach it to proxied requests.
 *
 * Everything here is defensive: if the native IAP module isn't present the
 * calls degrade to "no entitlement" instead of throwing, so the BYO-key Coach
 * path keeps working untouched.
 */
import * as SecureStore from 'expo-secure-store';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
} from 'expo-iap';

export type ProTier = 'weekly' | 'yearly' | 'lifetime';

export const PRO_PRODUCT_IDS: Record<ProTier, string> = {
  weekly: 'com.jiggo.maxxing.pro.weekly',
  yearly: 'com.jiggo.maxxing.pro.yearly',
  lifetime: 'com.jiggo.maxxing.pro.lifetime',
};

const ALL_IDS = Object.values(PRO_PRODUCT_IDS);
const SUBSCRIPTION_IDS = [PRO_PRODUCT_IDS.weekly, PRO_PRODUCT_IDS.yearly];

/**
 * The deployed Coach proxy Worker URL. Replace after `npm run deploy` in
 * `worker/` (wrangler prints it). Kept here so `lib/coach.ts` has one import.
 */
export const COACH_PROXY_URL = 'https://jiggo-coach-proxy.REPLACE-ME.workers.dev';

/** Keychain key holding the latest StoreKit 2 transaction JWS for a Pro entitlement. */
const PRO_JWS_KEY = 'jiggo.pro.jws';

export type ProEntitlement = { tier: ProTier; productId: string; jws: string };

function tierForProduct(productId: string): ProTier | null {
  const hit = (Object.entries(PRO_PRODUCT_IDS) as [ProTier, string][]).find(
    ([, id]) => id === productId,
  );
  return hit ? hit[0] : null;
}

let connected = false;
async function connect(): Promise<boolean> {
  if (connected) return true;
  try {
    await initConnection();
    connected = true;
  } catch {
    connected = false;
  }
  return connected;
}

export async function disconnectIap(): Promise<void> {
  try {
    await endConnection();
  } catch {
    /* ignore */
  }
  connected = false;
}

/** Persist a purchase's JWS + close the StoreKit transaction; returns the entitlement. */
async function recordPurchase(purchase: Purchase): Promise<ProEntitlement | null> {
  const tier = tierForProduct(purchase.productId);
  // `purchaseToken` is the unified token — on iOS it's the StoreKit 2 JWS.
  const jws = purchase.purchaseToken ?? undefined;
  if (!tier || !jws) return null;
  try {
    await SecureStore.setItemAsync(PRO_JWS_KEY, jws);
  } catch {
    /* keychain unavailable — entitlement still returned for this session */
  }
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch {
    /* finishing is best-effort; StoreKit will re-deliver if it failed */
  }
  return { tier, productId: purchase.productId, jws };
}

/** Price-tagged products for the /upgrade screen. Empty array if IAP is unavailable. */
export async function loadProProducts() {
  if (!(await connect())) return [];
  try {
    return await fetchProducts({ skus: ALL_IDS, type: 'all' });
  } catch {
    return [];
  }
}

/**
 * Buy a tier. expo-iap is event-based, so we bridge the
 * `purchaseUpdatedListener` / `purchaseErrorListener` pair into a promise.
 */
export async function purchasePro(tier: ProTier): Promise<ProEntitlement> {
  if (!(await connect())) throw new Error('in-app purchases are unavailable');
  const sku = PRO_PRODUCT_IDS[tier];
  const isSubscription = SUBSCRIPTION_IDS.includes(sku);

  return new Promise<ProEntitlement>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      ok.remove();
      fail.remove();
    };
    const ok = purchaseUpdatedListener(async (purchase) => {
      if (settled || purchase.productId !== sku) return;
      const entitlement = await recordPurchase(purchase);
      settled = true;
      cleanup();
      entitlement ? resolve(entitlement) : reject(new Error('purchase could not be verified'));
    });
    const fail = purchaseErrorListener((err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err.message ?? 'purchase failed'));
    });
    requestPurchase(
      isSubscription
        ? { request: { apple: { sku } }, type: 'subs' }
        : { request: { apple: { sku } }, type: 'in-app' },
    ).catch((err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/** Restore a previous purchase (App Store "Restore Purchases"). */
export async function restorePro(): Promise<ProEntitlement | null> {
  if (!(await connect())) return null;
  try {
    const purchases = await getAvailablePurchases();
    for (const purchase of purchases) {
      if (!ALL_IDS.includes(purchase.productId)) continue;
      const entitlement = await recordPurchase(purchase);
      if (entitlement) return entitlement;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * The cached Pro transaction JWS, if any. The Coach attaches this to proxied
 * requests; the Worker is the source of truth on whether it's still valid
 * (expired/revoked JWSs are rejected there).
 */
export async function getProJws(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PRO_JWS_KEY);
  } catch {
    return null;
  }
}

/** Re-read entitlements from StoreKit and refresh the cached JWS. */
export async function refreshProEntitlement(): Promise<ProEntitlement | null> {
  const entitlement = await restorePro();
  if (!entitlement) {
    try {
      await SecureStore.deleteItemAsync(PRO_JWS_KEY);
    } catch {
      /* ignore */
    }
  }
  return entitlement;
}

/** True when a Pro transaction JWS is cached (cheap check; Worker does real validation). */
export async function hasProJws(): Promise<boolean> {
  return (await getProJws()) !== null;
}
