// Recovery hints are never authority or a payment instruction. Keep only opaque
// identities/fingerprints; recipient, terms, credentials and URLs stay in memory.
export type GiftSaleRecovery =
  | {
      kind: "buyer";
      courseId: string;
      attemptId: string;
      fingerprint: string;
      giftId: string | null;
    }
  | {
      kind: "creator";
      courseId: string;
      requestId: string;
      policyReference: string;
      policyFingerprint: string;
      expectedConsentRef: string | null;
    };
export type GiftRecoveryRead = {
  state: "empty" | "ready" | "blocked";
  value: GiftSaleRecovery | null;
};
export const GIFT_SALE_RECOVERY_MS = 60 * 60 * 1000;
const id = (v: unknown) => typeof v === "string" && /^[a-f0-9]{24}$/.test(v);
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hash = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const ref = (v: unknown) =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(v);
export function validGiftSaleRecovery(v: any): v is GiftSaleRecovery {
  if (!v || Object.getPrototypeOf(v) !== Object.prototype || !id(v.courseId))
    return false;
  const fields =
    v.kind === "buyer"
      ? ["kind", "courseId", "attemptId", "fingerprint", "giftId"]
      : [
          "kind",
          "courseId",
          "requestId",
          "policyReference",
          "policyFingerprint",
          "expectedConsentRef"
        ];
  if (
    Object.keys(v).length !== fields.length ||
    !fields.every((k) => Object.hasOwn(v, k))
  )
    return false;
  return v.kind === "buyer"
    ? uuid(v.attemptId) && hash(v.fingerprint) && (v.giftId === null || id(v.giftId))
    : v.kind === "creator" &&
        uuid(v.requestId) &&
        ref(v.policyReference) &&
        hash(v.policyFingerprint) &&
        (v.expectedConsentRef === null || ref(v.expectedConsentRef));
}
export function sameGiftRecovery(a: GiftSaleRecovery, b: GiftSaleRecovery) {
  // A successful status may add a gift ID, never replace it or renew the TTL.
  if (a.kind === "buyer" && b.kind === "buyer")
    return (
      a.courseId === b.courseId &&
      a.attemptId === b.attemptId &&
      a.fingerprint === b.fingerprint &&
      (!a.giftId || a.giftId === b.giftId)
    );
  return JSON.stringify(a) === JSON.stringify(b);
}
