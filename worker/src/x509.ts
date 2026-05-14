/**
 * Minimal DER reader — just enough to validate an Apple StoreKit 2 x5c chain.
 * We deliberately parse only the fields the proxy needs (TBS bytes, the
 * signature value, the validity window, the public-key curve) rather than
 * pulling in a full X.509 library that may not run cleanly on Workers.
 */

type TLV = { tag: number; content: Uint8Array; full: Uint8Array; end: number };

function readTLV(buf: Uint8Array, offset: number): TLV {
  const tag = buf[offset];
  let len = buf[offset + 1];
  let p = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | buf[p++];
  }
  return {
    tag,
    content: buf.subarray(p, p + len),
    full: buf.subarray(offset, p + len),
    end: p + len,
  };
}

function seqChildren(content: Uint8Array): TLV[] {
  const out: TLV[] = [];
  let p = 0;
  while (p < content.length) {
    const t = readTLV(content, p);
    out.push(t);
    p = t.end;
  }
  return out;
}

function parseTime(tlv: TLV): number {
  const s = new TextDecoder().decode(tlv.content);
  if (tlv.tag === 0x17) {
    // UTCTime: YYMMDDHHMMSSZ
    const yy = parseInt(s.slice(0, 2), 10);
    const yyyy = (yy >= 50 ? 1900 : 2000) + yy;
    return Date.UTC(yyyy, +s.slice(2, 4) - 1, +s.slice(4, 6), +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12));
  }
  // GeneralizedTime: YYYYMMDDHHMMSSZ
  return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +s.slice(8, 10), +s.slice(10, 12), +s.slice(12, 14));
}

/** Hex of an OID's content bytes -> the named curve. */
function curveFromOid(oid: Uint8Array): EcCurve {
  const hex = Array.from(oid, (b) => b.toString(16).padStart(2, '0')).join('');
  if (hex === '2a8648ce3d030107') return 'P-256'; // prime256v1
  if (hex === '2b81040022') return 'P-384'; // secp384r1
  if (hex === '2b81040023') return 'P-521'; // secp521r1
  return 'P-256';
}

export type EcCurve = 'P-256' | 'P-384' | 'P-521';

export type ParsedCert = {
  der: Uint8Array;
  // ArrayBuffer-backed copies so they satisfy WebCrypto's strict BufferSource typing
  tbs: Uint8Array<ArrayBuffer>; // raw TBSCertificate bytes — exactly what the issuer signed
  sigDer: Uint8Array<ArrayBuffer>; // signatureValue: a DER ECDSA-Sig-Value SEQUENCE { r, s }
  curve: EcCurve; // the curve of this cert's OWN public key
  notBefore: number;
  notAfter: number;
};

/** Parse the handful of fields needed to verify one chain link. */
export function parseCert(der: Uint8Array): ParsedCert {
  const cert = readTLV(der, 0); // Certificate ::= SEQUENCE
  const [tbs, , sigVal] = seqChildren(cert.content); // tbsCertificate, signatureAlgorithm, signatureValue
  // signatureValue is a BIT STRING; the first content byte is the unused-bit
  // count (always 0 here) — the rest is the DER ECDSA signature.
  const sigDer = sigVal.content.slice(1);

  // TBSCertificate ::= SEQUENCE { [0] version?, serialNumber, signature,
  //                               issuer, validity, subject, spki, ... }
  const k = seqChildren(tbs.content);
  let i = k[0].tag === 0xa0 ? 1 : 0; // skip the optional explicit [0] version
  i += 3; // skip serialNumber, signature (alg id), issuer
  const [nb, na] = seqChildren(k[i].content); // validity ::= SEQUENCE { notBefore, notAfter }

  // subjectPublicKeyInfo is two slots after validity (skip subject):
  //   SPKI ::= SEQUENCE { algorithm AlgorithmIdentifier, subjectPublicKey BIT STRING }
  //   AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters }  -- parameters = named-curve OID
  const spki = seqChildren(k[i + 2].content);
  const curveOid = seqChildren(spki[0].content)[1];

  return {
    der,
    // copy into fresh ArrayBuffer-backed views so WebCrypto's strict
    // BufferSource typing is satisfied
    tbs: new Uint8Array(tbs.full),
    sigDer: new Uint8Array(sigDer),
    curve: curveFromOid(curveOid.content),
    notBefore: parseTime(nb),
    notAfter: parseTime(na),
  };
}

/** WebCrypto verify params for a given EC curve. */
export function curveParams(curve: EcCurve): { hash: string; alg: string; fieldSize: number } {
  if (curve === 'P-384') return { hash: 'SHA-384', alg: 'ES384', fieldSize: 48 };
  if (curve === 'P-521') return { hash: 'SHA-512', alg: 'ES512', fieldSize: 66 };
  return { hash: 'SHA-256', alg: 'ES256', fieldSize: 32 };
}

/**
 * Convert a DER ECDSA-Sig-Value (`SEQUENCE { r INTEGER, s INTEGER }`) into the
 * raw `r || s` form that WebCrypto's `verify` expects. `size` is the curve's
 * field size in bytes (32 for P-256, 48 for P-384, 66 for P-521).
 */
export function derEcdsaToRaw(der: Uint8Array, size: number): Uint8Array<ArrayBuffer> {
  const [r, s] = seqChildren(der);
  const norm = (int: Uint8Array): Uint8Array => {
    let v = int;
    while (v.length > size && v[0] === 0) v = v.subarray(1); // strip leading sign-pad byte
    const out = new Uint8Array(size);
    out.set(v, size - v.length); // left-pad short integers
    return out;
  };
  const raw = new Uint8Array(size * 2);
  raw.set(norm(r.content), 0);
  raw.set(norm(s.content), size);
  return raw;
}
