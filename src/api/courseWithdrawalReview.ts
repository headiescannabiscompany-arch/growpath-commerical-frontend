import { adminVaultRequest } from "@/api/adminPasskeys";
export const withdrawalReviewBases = ["unresolved", "de_14", "th_15", "other", "not_applicable"] as const;
export const withdrawalReviewOutcomes = ["review_required", "refund_due", "refund_complete", "not_due"] as const;
export type WithdrawalBasis = (typeof withdrawalReviewBases)[number];
export type WithdrawalOutcome = (typeof withdrawalReviewOutcomes)[number];
export type WithdrawalSummary = { version: number; receivedAt: string; basis: WithdrawalBasis; outcome: WithdrawalOutcome;
  dueAt: string | null; overdue: boolean; closureReady: boolean };
export type WithdrawalReview = WithdrawalSummary & { id: string; contractReference: string; status: string; operationIds: string[];
  current: { operationId: string; version: number; reason: string; evidenceRef: string; communicationRef: string;
    purchaseId: string | null; decidedAt: string } | null };
export type WithdrawalReviewInput = { operationId: string; expectedVersion: number; basis: WithdrawalBasis; outcome: WithdrawalOutcome;
  reason: string; evidenceRef: string; communicationRef: string; purchaseId: string | null;
  contractLinkConfirmed: boolean; deadlineAt: string | null; confirmed: true };
const id = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{24}$/.test(v);
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const iso = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const text = (v: unknown, max: number, min = 1): v is string => typeof v === "string" && v === v.trim() && v.length >= min && v.length <= max && !/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(v);
export function validWithdrawalReviewInput(v: WithdrawalReviewInput): boolean {
  const fields = ["operationId", "expectedVersion", "basis", "outcome", "reason", "evidenceRef", "communicationRef", "purchaseId", "contractLinkConfirmed", "deadlineAt", "confirmed"];
  return Boolean(v && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k)) && uuid(v.operationId) && Number.isSafeInteger(v.expectedVersion) && v.expectedVersion >= 0 && v.expectedVersion <= 50 &&
    withdrawalReviewBases.includes(v.basis) && withdrawalReviewOutcomes.includes(v.outcome) && text(v.reason, 2000, 10) && text(v.evidenceRef, 500, 3) && text(v.communicationRef, 300, 0) &&
    (v.purchaseId === null || id(v.purchaseId)) && v.contractLinkConfirmed === (v.purchaseId !== null) && (v.deadlineAt === null || iso(v.deadlineAt)) && v.confirmed === true &&
    (v.basis !== "unresolved" || v.outcome === "review_required") && (v.basis !== "not_applicable" || v.outcome === "not_due") &&
    (v.outcome !== "not_due" || ["not_applicable", "other"].includes(v.basis)) &&
    (!["refund_due", "refund_complete"].includes(v.outcome) || ["de_14", "th_15", "other"].includes(v.basis)) &&
    (!["refund_complete", "not_due"].includes(v.outcome) || text(v.communicationRef, 300, 3)) &&
    (v.outcome !== "refund_complete" || v.purchaseId !== null));
}
export function withdrawalCaseCanClose(item: { withdrawal?: unknown }): boolean {
  return !Object.hasOwn(item, "withdrawal") || (validWithdrawalSummary(item.withdrawal) && item.withdrawal.closureReady);
}
export function withdrawalCaseVersion(item: { withdrawal?: unknown }): number | undefined {
  if (!Object.hasOwn(item, "withdrawal")) return undefined;
  if (!validWithdrawalSummary(item.withdrawal)) throw new Error("Withdrawal rights state is unavailable. Refresh this case.");
  return item.withdrawal.version;
}
export function validWithdrawalSummary<T>(v: T): v is T & WithdrawalSummary;
export function validWithdrawalSummary(v: any): boolean {
  return Boolean(v && Number.isSafeInteger(v.version) && v.version >= 0 && v.version <= 50 && iso(v.receivedAt) &&
    withdrawalReviewBases.includes(v.basis) && withdrawalReviewOutcomes.includes(v.outcome) &&
    (v.dueAt === null || iso(v.dueAt)) && typeof v.overdue === "boolean" && typeof v.closureReady === "boolean" &&
    (!v.closureReady || ["refund_complete", "not_due"].includes(v.outcome)));
}
function response(value: any, noticeId: string): WithdrawalReview {
  const v: Partial<WithdrawalReview> | undefined = value?.review;
  if (value?.ok !== true || !v || v.id !== noticeId || !validWithdrawalSummary(v) || !text(v.contractReference, 160) ||
    typeof v.status !== "string" || !["open", "in_progress", "resolved", "spam"].includes(v.status) || !Array.isArray(v.operationIds) ||
    v.operationIds.length !== v.version || !v.operationIds.every(uuid) || new Set(v.operationIds).size !== v.version ||
    (v.version === 0 ? v.current !== null : !v.current || v.current.version !== v.version || !uuid(v.current.operationId) ||
      !v.operationIds.includes(v.current.operationId) || !text(v.current.reason, 2000, 10) || !text(v.current.evidenceRef, 500, 3) ||
      !text(v.current.communicationRef, 300, 0) || !(v.current.purchaseId === null || id(v.current.purchaseId)) || !iso(v.current.decidedAt)))
    throw new Error("Withdrawal review response could not be verified.");
  return { id: noticeId, contractReference: v.contractReference, status: v.status, version: v.version, receivedAt: v.receivedAt,
    basis: v.basis, outcome: v.outcome, dueAt: v.dueAt, overdue: v.overdue, closureReady: v.closureReady,
    operationIds: [...v.operationIds], current: v.current ? { operationId: v.current.operationId, version: v.current.version,
      reason: v.current.reason, evidenceRef: v.current.evidenceRef, communicationRef: v.current.communicationRef,
      purchaseId: v.current.purchaseId, decidedAt: v.current.decidedAt } : null };
}
function path(noticeId: string) { if (!id(noticeId)) throw new Error("A valid withdrawal case is required."); return `/api/admin/support-requests/${noticeId}/withdrawal-review`; }
export async function readWithdrawalReview(noticeId: string) {
  return response(await adminVaultRequest(path(noticeId), { notifyTransport: false, notifyTokenBalance: false }), noticeId);
}
export async function saveWithdrawalReview(noticeId: string, input: WithdrawalReviewInput) {
  if (!validWithdrawalReviewInput(input)) throw new Error("Complete and confirm the withdrawal review.");
  const raw: any = await adminVaultRequest(path(noticeId), { method: "POST", body: { ...input }, notifyTransport: false, notifyTokenBalance: false });
  const state = response(raw, noticeId);
  if (typeof raw.review.replayed !== "boolean" || !state.operationIds.includes(input.operationId) ||
    !Number.isSafeInteger(raw.review.operationVersion) || raw.review.operationVersion < 1 || raw.review.operationVersion > state.version)
    throw new Error("Withdrawal save could not be confirmed. Keep the same operation for retry.");
  return state;
}
