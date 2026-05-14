/**
 * Verify an Apple StoreKit 2 / App Store Server signed JWS (a JWSTransaction).
 *
 * StoreKit 2 hands the app a self-verifying signed transaction: a compact JWS
 * whose header carries an `x5c` certificate chain rooting at Apple. The proxy
 * trusts a Coach request only if that JWS verifies AND the payload says the
 * caller holds a live JIGGO subscription — so a paying user is the only thing
 * that can spend the proxy's Anthropic key.
 */
import { importX509, compactVerify } from 'jose';
import { parseCert, derEcdsaToRaw, curveParams } from './x509';

function b64uToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function derToPem(der: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < der.length; i++) bin += String.fromCharCode(der[i]);
  const b64 = (btoa(bin).match(/.{1,64}/g) ?? []).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export type Entitlement = {
  productId: string;
  originalTransactionId: string;
  transactionId: string;
  expiresDate?: number;
};

export type VerifyOptions = {
  bundleId: string;
  allowedProductIds: string[];
  /** Pinned "Apple Root CA - G3" in DER. Strongly recommended — see README §3. */
  appleRootCa?: Uint8Array;
};

/**
 * Verification steps:
 *   1. every cert in the x5c chain is inside its validity window;
 *   2. each cert is signed by the next one up the chain;
 *   3. the root equals the pinned Apple Root CA - G3 (when a pin is configured);
 *   4. the JWS signature verifies under the leaf certificate's public key;
 *   5. the payload is for our app, an entitled product, and not revoked/expired.
 */
export async function verifyTransactionJWS(jws: string, opts: VerifyOptions): Promise<Entitlement> {
  const headerB64 = jws.split('.')[0];
  if (!headerB64) throw new Error('jws: malformed token');
  const header = JSON.parse(new TextDecoder().decode(b64uToBytes(headerB64)));
  const x5c: unknown = header.x5c;
  if (!Array.isArray(x5c) || x5c.length < 2) throw new Error('jws: missing x5c chain');

  const ders = (x5c as string[]).map(b64uToBytes);
  const certs = ders.map(parseCert);
  const now = Date.now();

  // (1) validity windows
  for (const c of certs) {
    if (now < c.notBefore || now > c.notAfter) {
      throw new Error('chain: a certificate is expired or not yet valid');
    }
  }

  // (2) chain — cert[i] must be signed by cert[i + 1]
  for (let i = 0; i < certs.length - 1; i++) {
    const issuer = certs[i + 1]; // the cert whose key signed certs[i]
    const { hash, alg, fieldSize } = curveParams(issuer.curve);
    const issuerKey = (await importX509(derToPem(ders[i + 1]), alg)) as CryptoKey;
    const sigRaw = derEcdsaToRaw(certs[i].sigDer, fieldSize);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash }, issuerKey, sigRaw, certs[i].tbs);
    if (!ok) throw new Error(`chain: link ${i} signature is invalid`);
  }

  // (3) root pin
  if (opts.appleRootCa && !sameBytes(opts.appleRootCa, ders[ders.length - 1])) {
    throw new Error('chain: root does not match the pinned Apple Root CA - G3');
  }

  // (4) JWS signature under the leaf certificate
  const leafKey = await importX509(derToPem(ders[0]), curveParams(certs[0].curve).alg);
  const { payload } = await compactVerify(jws, leafKey);
  const tx = JSON.parse(new TextDecoder().decode(payload));

  // (5) payload claims
  if (tx.bundleId !== opts.bundleId) throw new Error('payload: bundleId mismatch');
  if (!opts.allowedProductIds.includes(tx.productId)) throw new Error('payload: product not entitled');
  if (tx.revocationDate) throw new Error('payload: transaction revoked');
  if (typeof tx.expiresDate === 'number' && tx.expiresDate < now) {
    throw new Error('payload: subscription expired');
  }

  return {
    productId: String(tx.productId),
    originalTransactionId: String(tx.originalTransactionId),
    transactionId: String(tx.transactionId),
    expiresDate: typeof tx.expiresDate === 'number' ? tx.expiresDate : undefined,
  };
}
