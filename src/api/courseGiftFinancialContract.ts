export type FinancialAction = "assess" | "refund" | "allocation";
export const FINANCIAL_PATHS = Object.freeze({
  assess: "/api/course-gifts/support/financial/assess",
  refund: "/api/course-gifts/support/financial/refund",
  allocation: "/api/course-gifts/support/financial/allocation"
});
type Body = Readonly<Record<string, string | number>>;
export type FinancialRefundOperation = Readonly<{
  operationId: string; amountCents: number; expectedRefundedAmountCents: number;
  reason: "requested_by_customer" | "duplicate" | "fraudulent";
  state: "provider_pending" | "provider_accepted" | "provider_unconfirmed" | "manual_review" | "applied" | "provider_failed";
}>;
export type FinancialAllocation = Readonly<{
  refundedGrossCents: number; taxCreditCents: number; platformFeeReturnedCents: number;
  reference: string; taxEvidenceReference: string;
}>;
export type FinancialAssessment = Readonly<{
  purchaseId: string; expectedStateFingerprint: string; currency: "usd";
  grossAmountCents: number; refundedGrossCents: number; taxAmountCents: number; platformFeeCents: number;
  providerEvidenceVerified: false; financialActionPerformed: false;
  refundOperation: FinancialRefundOperation | null; allocation: FinancialAllocation | null;
}>;
export type FinancialOutcome = Readonly<{
  purchaseId: string; status: "provider_accepted" | "recovery_required" | "recorded";
  operationId?: string; reference?: string;
}>;
export type FinancialResult = FinancialAssessment | FinancialOutcome;
const ID = /^[a-f0-9]{24}$/, SHA = /^[a-f0-9]{64}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/, OP = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,119}$/;
const REASONS = ["requested_by_customer", "duplicate", "fraudulent"];
const STATES = ["provider_pending", "provider_accepted", "provider_unconfirmed", "manual_review", "applied", "provider_failed"];
const cents = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown, p: RegExp) => typeof v === "string" && p.test(v);
function fields(value: unknown, keys: string[]): Record<string, unknown> | null {
  try {
    if (!value || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length) return null;
    const copy: Record<string, unknown> = {};
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (!d?.enumerable || !("value" in d)) return null;
      copy[key] = d.value;
    }
    return copy;
  } catch { return null; }
}
export function financialCandidate(action: FinancialAction, input: unknown): Body | null {
  if (action === "assess") {
    const v = fields(input, ["purchaseId"]);
    return v && text(v.purchaseId, ID) ? Object.freeze(v as Record<string, string>) : null;
  }
  if (!["refund", "allocation"].includes(action)) return null;
  const keys = action === "refund" ? ["purchaseId", "operationId", "amountCents", "reason"] :
    ["purchaseId", "refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents", "reference", "taxEvidenceReference"];
  const v = fields(input, [...keys, "expectedStateFingerprint", "reviewReason", "evidenceReference", "confirmation"]);
  if (!v || !text(v.purchaseId, ID) || !text(v.expectedStateFingerprint, SHA) ||
    typeof v.reviewReason !== "string" || v.reviewReason !== v.reviewReason.trim() || v.reviewReason.length < 16 ||
    v.reviewReason.length > 1000 || /[\x00-\x1f\x7f]/.test(v.reviewReason) || !text(v.evidenceReference, REF)) return null;
  if (action === "refund" ? !text(v.operationId, OP) || !cents(v.amountCents) || v.amountCents < 1 || !REASONS.includes(v.reason as string) :
    !["refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents"].every(k => cents(v[k])) ||
    !text(v.reference, REF) || !text(v.taxEvidenceReference, REF)) return null;
  if (v.confirmation !== (action === "refund" ? `REFUND ${v.purchaseId} ${v.amountCents}` :
    `ALLOCATE ${v.purchaseId} ${v.refundedGrossCents}/${v.taxCreditCents}/${v.platformFeeReturnedCents}`)) return null;
  return Object.freeze(v as Record<string, string | number>);
}
export function financialPrivateResult(action: FinancialAction, result: unknown, body: Body): FinancialResult | null {
  const envelope = fields(result, ["success", "data"]); if (envelope?.success !== true) return null;
  if (action !== "assess") {
    const refund = action === "refund", v = fields(envelope.data, ["purchaseId", refund ? "operationId" : "reference", "status"]);
    if (!v || v.purchaseId !== body.purchaseId || v[refund ? "operationId" : "reference"] !== body[refund ? "operationId" : "reference"] ||
      !(refund ? ["provider_accepted", "recovery_required"] : ["recorded"]).includes(v.status as string)) return null;
    return Object.freeze(v as FinancialOutcome);
  }
  const v = fields(envelope.data, ["purchaseId", "expectedStateFingerprint", "currency", "grossAmountCents", "refundedGrossCents",
    "taxAmountCents", "platformFeeCents", "providerEvidenceVerified", "financialActionPerformed", "refundOperation", "allocation"]);
  if (!v || v.purchaseId !== body.purchaseId || !text(v.expectedStateFingerprint, SHA) || v.currency !== "usd" ||
    !["grossAmountCents", "refundedGrossCents", "taxAmountCents", "platformFeeCents"].every(k => cents(v[k])) ||
    (v.grossAmountCents as number) < 1 || (v.refundedGrossCents as number) > (v.grossAmountCents as number) ||
    (v.taxAmountCents as number) + (v.platformFeeCents as number) > (v.grossAmountCents as number) ||
    v.providerEvidenceVerified !== false || v.financialActionPerformed !== false) return null;
  let refundOperation: FinancialRefundOperation | null = null, allocation: FinancialAllocation | null = null;
  if (v.refundOperation !== null) {
    const op = fields(v.refundOperation, ["operationId", "amountCents", "expectedRefundedAmountCents", "reason", "state"]);
    if (!op || !text(op.operationId, OP) || !cents(op.amountCents) || op.amountCents < 1 || !cents(op.expectedRefundedAmountCents) ||
      op.amountCents + op.expectedRefundedAmountCents > (v.grossAmountCents as number) || !REASONS.includes(op.reason as string) || !STATES.includes(op.state as string)) return null;
    refundOperation = Object.freeze(op as FinancialRefundOperation);
  }
  if (v.allocation !== null) {
    const a = fields(v.allocation, ["refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents", "reference", "taxEvidenceReference"]);
    if (!a || !["refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents"].every(k => cents(a[k])) ||
      (a.refundedGrossCents as number) > (v.refundedGrossCents as number) || (a.taxCreditCents as number) > (v.taxAmountCents as number) ||
      (a.platformFeeReturnedCents as number) > (v.platformFeeCents as number) || !text(a.reference, REF) || !text(a.taxEvidenceReference, REF)) return null;
    allocation = Object.freeze(a as FinancialAllocation);
  }
  return Object.freeze({ ...v, refundOperation, allocation } as FinancialAssessment);
}
