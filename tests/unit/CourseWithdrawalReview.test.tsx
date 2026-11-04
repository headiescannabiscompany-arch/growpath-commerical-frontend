import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import CourseWithdrawalReviewPanel from "@/features/admin/CourseWithdrawalReviewPanel";
import { readWithdrawalReview, saveWithdrawalReview, validWithdrawalReviewInput, withdrawalCaseCanClose, withdrawalCaseVersion, type WithdrawalReview, type WithdrawalReviewInput } from "@/api/courseWithdrawalReview";
import { containsCourseGiftDiagnostic } from "@/utils/courseGiftDiagnosticPrivacy";
const mockTransport = jest.fn();
let mockEpoch = 0, mockIdentity = 0;
const mockListeners = new Set<() => void>();
jest.mock("@/api/adminPasskeys", () => ({
  adminVaultRequest: (...args: any[]) => mockTransport(...args),
  getAdminSecurityEpoch: () => mockEpoch, getAdminSecurityIdentityEpoch: () => mockIdentity,
  subscribeAdminSecurity: (listener: () => void) => { mockListeners.add(listener); return () => mockListeners.delete(listener); }
}));
jest.mock("@/theme/appTheme", () => { const actual = jest.requireActual("@/theme/appTheme"); return { ...actual, useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") }) }; });
const ID = "a".repeat(24), OP = "a0000000-0000-4000-8000-000000000001", OTHER = "b0000000-0000-4000-8000-000000000001";
const CONFIRM = "I reviewed this exact case decision and evidence. Record this review only; do not issue a refund or send email.";
const REASON = "Written applicability and outcome reason", EVIDENCE = "Evidence reference for the contract, claimant authority and applicable rule";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const input = (): WithdrawalReviewInput => ({ operationId: OP, expectedVersion: 0, basis: "unresolved", outcome: "review_required", reason: "Synthetic applicability review needs confirmation.", evidenceRef: "synthetic:evidence-1", communicationRef: "", purchaseId: null, contractLinkConfirmed: false, deadlineAt: null, confirmed: true });
let state: WithdrawalReview, descriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  mockEpoch = 0; mockIdentity = 0; mockListeners.clear();
  descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => OP } });
  state = { id: ID, contractReference: "synthetic-private-contract", status: "open", version: 0, operationIds: [], receivedAt: "2026-10-30T10:30:00.000Z", basis: "unresolved", outcome: "review_required", dueAt: null, overdue: false, closureReady: false, current: null };
  mockTransport.mockImplementation(async (_path, options = {}) => {
    if (options.method === "POST") {
      const v = options.body as WithdrawalReviewInput;
      state = { ...state, version: state.version + 1, status: "in_progress", operationIds: [...state.operationIds, v.operationId],
        basis: v.basis, outcome: v.outcome, current: { operationId: v.operationId, version: state.version + 1,
          reason: v.reason, evidenceRef: v.evidenceRef, communicationRef: v.communicationRef, purchaseId: v.purchaseId, decidedAt: "2026-11-04T12:00:00.000Z" } };
      return { ok: true, review: { ...clone(state), replayed: false, operationVersion: state.version } };
    }
    return { ok: true, review: clone(state) };
  });
});
afterEach(() => { if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor); else Reflect.deleteProperty(globalThis, "crypto"); });
const posts = () => mockTransport.mock.calls.filter(([, options]) => options?.method === "POST");
async function press(view: ReturnType<typeof render>, label: string) { await act(async () => { fireEvent.press(view.getByText(label)); }); }
async function prepare() {
  const view = render(<CourseWithdrawalReviewPanel noticeId={ID} />);
  await press(view, "Read current withdrawal review");
  fireEvent.changeText(view.getByLabelText(REASON), input().reason); fireEvent.changeText(view.getByLabelText(EVIDENCE), input().evidenceRef);
  return view;
}
describe("R09 withdrawal rights UI", () => {
  test("requires explicit protected read and unchecked confirmation before any review write", async () => {
    const view = render(<CourseWithdrawalReviewPanel noticeId={ID} />); expect(mockTransport).not.toHaveBeenCalled();
    await press(view, "Read current withdrawal review"); expect(view.getByText("Contract reference: synthetic-private-contract")).toBeTruthy();
    expect(view.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    await press(view, "Save withdrawal rights review"); expect(posts()).toHaveLength(0);
    expect(mockTransport.mock.calls[0][1]).toMatchObject({ notifyTransport: false, notifyTokenBalance: false });
  });
  test("records a confirmed case review without claiming a refund or customer notice was sent", async () => {
    const view = await prepare(); fireEvent.press(view.getByLabelText(CONFIRM));
    await press(view, "Save withdrawal rights review"); expect(posts()).toHaveLength(1); expect(posts()[0][1].body).toEqual(input());
    expect(view.getByText("Review recorded. This did not issue a refund or send a customer notice.")).toBeTruthy();
  });
  test("edits invalidate confirmation and do not write automatically", async () => {
    const view = await prepare(); fireEvent.press(view.getByLabelText(CONFIRM));
    fireEvent.changeText(view.getByLabelText(REASON), "Changed evidence requires another explicit confirmation.");
    expect(view.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false); expect(posts()).toHaveLength(0);
  });
  test("lost response locks the payload and only explicit same-operation retry writes again", async () => {
    const view = await prepare(); fireEvent.press(view.getByLabelText(CONFIRM)); mockTransport.mockRejectedValueOnce(new Error("Lost"));
    await press(view, "Save withdrawal rights review"); expect(posts()).toHaveLength(1);
    await press(view, "Read current withdrawal review"); expect(posts()).toHaveLength(1);
    expect(view.getByLabelText(REASON).props.editable).toBe(false); expect(view.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    fireEvent.press(view.getByLabelText(CONFIRM)); await press(view, "Retry same withdrawal review");
    expect(posts()).toHaveLength(2); expect(posts()[1][1].body).toEqual(posts()[0][1].body);
  });
  test("passkey expiry hides private case data and preserves pending operation without replay", async () => {
    const view = await prepare(); fireEvent.press(view.getByLabelText(CONFIRM)); mockTransport.mockRejectedValueOnce(new Error("Lost"));
    await press(view, "Save withdrawal rights review"); await press(view, "Read current withdrawal review");
    await act(async () => { mockEpoch += 1; mockListeners.forEach(fn => fn()); });
    expect(view.queryByText("Contract reference: synthetic-private-contract")).toBeNull(); expect(posts()).toHaveLength(1);
    await press(view, "Read current withdrawal review"); expect(posts()).toHaveLength(1);
    fireEvent.press(view.getByLabelText(CONFIRM)); await press(view, "Retry same withdrawal review"); expect(posts()[1][1].body.operationId).toBe(OP);
  });
  test("identity change clears continuation and discards a late private read", async () => {
    let finish!: (value: unknown) => void;
    mockTransport.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<CourseWithdrawalReviewPanel noticeId={ID} />);
    fireEvent.press(view.getByText("Read current withdrawal review"));
    await act(async () => { mockIdentity += 1; mockEpoch += 1; mockListeners.forEach(fn => fn()); finish({ ok: true, review: clone(state) }); });
    expect(view.queryByText("Contract reference: synthetic-private-contract")).toBeNull(); expect(posts()).toHaveLength(0);
  });
  test("only a newer recorded version with operation absent can discard a superseded unsaved review", async () => {
    const view = await prepare(); fireEvent.press(view.getByLabelText(CONFIRM)); mockTransport.mockRejectedValueOnce(new Error("Lost"));
    await press(view, "Save withdrawal rights review"); await press(view, "Read current withdrawal review");
    expect(view.queryByText("Discard superseded unsaved review")).toBeNull();
    state = { ...state, version: 1, operationIds: [OTHER], current: { operationId: OTHER, version: 1, reason: input().reason,
      evidenceRef: input().evidenceRef, communicationRef: "", purchaseId: null, decidedAt: "2026-11-04T12:00:00.000Z" } };
    await press(view, "Read current withdrawal review"); await press(view, "Discard superseded unsaved review");
    expect(view.queryByText("Retry same withdrawal review")).toBeNull(); expect(posts()).toHaveLength(1);
  });
  test("wrong-case or incomplete server evidence never becomes a visible authorized review", async () => {
    mockTransport.mockResolvedValueOnce({ ok: true, review: { ...state, id: "b".repeat(24) } });
    const view = render(<CourseWithdrawalReviewPanel noticeId={ID} />); await press(view, "Read current withdrawal review");
    expect(view.queryByText("Contract reference: synthetic-private-contract")).toBeNull(); expect(posts()).toHaveLength(0);
  });
  test("wire refuses unknown fields, false confirmation and incomplete completed-refund declarations", () => {
    expect(validWithdrawalReviewInput(input())).toBe(true);
    expect(validWithdrawalReviewInput({ ...input(), actorUserId: "PRIVATE" } as any)).toBe(false);
    expect(validWithdrawalReviewInput({ ...input(), confirmed: false } as any)).toBe(false);
    expect(validWithdrawalReviewInput({ ...input(), basis: "de_14", outcome: "refund_complete" })).toBe(false);
  });
  test("ordinary support remains closable while malformed or unresolved withdrawal state stays blocked", () => {
    expect(withdrawalCaseCanClose({})).toBe(true); expect(withdrawalCaseVersion({})).toBeUndefined();
    expect(withdrawalCaseCanClose({ withdrawal: state })).toBe(false);
    expect(withdrawalCaseCanClose({ withdrawal: null })).toBe(false); expect(() => withdrawalCaseVersion({ withdrawal: null })).toThrow();
    expect(withdrawalCaseCanClose({ withdrawal: { ...state, version: 1, outcome: "not_due", closureReady: true } })).toBe(true);
  });
  test("unbound save acknowledgement keeps the operation uncertain instead of claiming success", async () => {
    mockTransport.mockResolvedValueOnce({ ok: true, review: { ...state, replayed: true, operationVersion: 1 } });
    await expect(saveWithdrawalReview(ID, input())).rejects.toThrow(); expect(posts()).toHaveLength(1);
  });
  test("private Admin review URLs are suppressed independently of the gifting activation boundary", async () => {
    expect(containsCourseGiftDiagnostic({ url: `/api/admin/support-requests/${ID}/withdrawal-review` })).toBe(true);
    expect(containsCourseGiftDiagnostic({ url: "/api/ordinary", message: "Ordinary diagnostic" })).toBe(false);
    mockTransport.mockResolvedValueOnce({ ok: true, review: { ...state, operationIds: [OP] } });
    await expect(readWithdrawalReview(ID)).rejects.toThrow();
  });
});
