jest.mock("@/api/adminPasskeys", () => require("../fixtures/courseGiftFinancialAdminSecurity"));
import { createInternalCourseGiftFinancialReviewClient as create } from "@/api/courseCheckoutSupportClient";
import { COURSE_CHECKOUT_SUPPORT_REQUEST_MS } from "@/api/courseCheckoutSupportClient";
import { adminVaultRequest as call, changeSecurity, resetSecurity, listenerCount } from "../fixtures/courseGiftFinancialAdminSecurity";
const ID = "e".repeat(24), FP = "a".repeat(64);
const assessment = () => ({ purchaseId: ID, expectedStateFingerprint: FP, currency: "usd", grossAmountCents: 2500,
  refundedGrossCents: 0, taxAmountCents: 399, platformFeeCents: 375, providerEvidenceVerified: false,
  financialActionPerformed: false, refundOperation: null, allocation: null });
const input = () => ({ purchaseId: ID, operationId: "synthetic-refund-client-001", amountCents: 2500, reason: "requested_by_customer",
  expectedStateFingerprint: FP, reviewReason: "Reviewed the original provider payment evidence", evidenceReference: "synthetic:evidence", confirmation: `REFUND ${ID} 2500` });
const reply = (data: unknown) => ({ success: true, data });
const deferred = () => { let resolve!: (v: unknown) => void; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const clients: ReturnType<typeof create>[] = [];
function make(action: "assess" | "refund" | "allocation" = "refund") { const c = create({ platform: "web", action }); clients.push(c); return c; }
beforeEach(() => { jest.useFakeTimers(); resetSecurity(); });
afterEach(() => { for (const c of clients.splice(0)) c.dispose(); expect(listenerCount()).toBe(0); jest.useRealTimers(); });
describe("R09 financial client", () => {
  it("construction and preparation are inert and native construction remains closed", () => {
    const c = make(); c.prepare("courseGift", input()); expect(call).not.toHaveBeenCalled();
    expect(() => create({ platform: "native", action: "refund" })).toThrow("NOT_RELEASED");
  });
  it("requires fresh proof and a deliberate confirmation before any request", async () => {
    const c = make(); c.prepare("courseGift", input()); await expect(c.submit(false)).rejects.toThrow("CONFIRMATION_REQUIRED");
    changeSecurity(false, null); await expect(c.submit(true)).rejects.toThrow("STEP_UP_REQUIRED"); expect(call).not.toHaveBeenCalled();
  });
  it.each(["extra", "string cents", "getter"])("refuses %s input without invoking transport or accessors", kind => {
    const value: Record<string, unknown> = input(); let read = false;
    if (kind === "extra") value.approved = true;
    if (kind === "string cents") value.amountCents = "2500";
    if (kind === "getter") Object.defineProperty(value, "reviewReason", { enumerable: true, get() { read = true; throw Error("PRIVATE"); } });
    expect(() => make().prepare("courseGift", value)).toThrow("INPUT_INVALID"); expect(read).toBe(false); expect(call).not.toHaveBeenCalled();
  });
  it.each(["extra", "fingerprint", "total"])("rejects an assessment with invalid %s instead of exposing it", async kind => {
    const c = make("assess"), value: Record<string, unknown> = assessment();
    if (kind === "extra") value.rawProvider = "PRIVATE";
    if (kind === "fingerprint") value.expectedStateFingerprint = "bad";
    if (kind === "total") value.taxAmountCents = 2501;
    call.mockResolvedValue(reply(value)); c.prepare("courseGift", { purchaseId: ID });
    expect(await c.submit(true)).toMatchObject({ status: "uncertain", financial: null });
  });
  it("read-only assessment can be deliberately refreshed without submitting a financial intent", async () => {
    const c = make("assess"); call.mockResolvedValue(reply(assessment())); c.prepare("courseGift", { purchaseId: ID });
    expect((await c.submit(true)).financial).toMatchObject({ providerEvidenceVerified: false });
    c.prepare("courseGift", { purchaseId: ID }); await c.submit(true);
    expect(call).toHaveBeenCalledTimes(2); expect(call.mock.calls.every(([url]) => String(url).endsWith("/assess"))).toBe(true);
  });
  it("refund is single-flight, quiet and not replayed after provider acceptance", async () => {
    const c = make(), wait = deferred(); call.mockReturnValue(wait.promise); c.prepare("courseGift", input());
    const first = c.submit(true); await Promise.resolve(); await expect(c.submit(true)).rejects.toThrow("BUSY");
    wait.resolve(reply({ purchaseId: ID, operationId: input().operationId, status: "provider_accepted" }));
    expect(await first).toMatchObject({ status: "financial_result", financial: { status: "provider_accepted" } });
    await c.submit(true); expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][1]).toMatchObject({ retries: 0, cache: "no-store", redirect: "error", notifyTransport: false, notifyTokenBalance: false });
  });
  it("uncertain submission freezes the intent until a separately reviewed current assessment", async () => {
    const c = make(); call.mockRejectedValue(Error("PRIVATE")); c.prepare("courseGift", input());
    expect(await c.submit(true)).toMatchObject({ status: "uncertain" });
    expect(() => c.prepare("courseGift", { ...input(), operationId: "replacement-not-allowed" })).toThrow("REQUEST_FROZEN");
    await expect(c.submit(true)).rejects.toThrow("REQUEST_FROZEN"); expect(call).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(c.snapshot())).not.toMatch(/PRIVATE|reviewReason|evidenceReference/);
  });
  it("provider recovery-required result is not a reason to send a second refund", async () => {
    const c = make(); call.mockResolvedValue(reply({ purchaseId: ID, operationId: input().operationId, status: "recovery_required" }));
    c.prepare("courseGift", input()); await c.submit(true); await c.submit(true); expect(call).toHaveBeenCalledTimes(1);
  });
  it("timeout retains uncertainty, aborts the request and ignores late success", async () => {
    const c = make(), wait = deferred(); call.mockReturnValue(wait.promise); c.prepare("courseGift", input());
    const pending = c.submit(true); await Promise.resolve(); await jest.advanceTimersByTimeAsync(COURSE_CHECKOUT_SUPPORT_REQUEST_MS + 1);
    expect(await pending).toMatchObject({ status: "uncertain" });
    wait.resolve(reply({ purchaseId: ID, operationId: input().operationId, status: "provider_accepted" })); await Promise.resolve();
    expect(c.snapshot().status).toBe("uncertain"); expect(call).toHaveBeenCalledTimes(1);
  });
  it("account changes dispose the pending private request and discard its late outcome", async () => {
    const c = make(), wait = deferred(); call.mockReturnValue(wait.promise); c.prepare("courseGift", input());
    const pending = c.submit(true); await Promise.resolve(); changeSecurity(true);
    await expect(pending).rejects.toThrow("SESSION_CHANGED"); wait.resolve(reply({ purchaseId: ID, operationId: input().operationId, status: "provider_accepted" }));
    expect(c.snapshot().status).toBe("disposed"); expect(call).toHaveBeenCalledTimes(1);
  });
  it("same-account proof renewal never replays an attempted financial request", async () => {
    const c = make(); call.mockRejectedValue(Error("unknown")); c.prepare("courseGift", input()); await c.submit(true);
    changeSecurity(false); await expect(c.submit(true)).rejects.toThrow("REQUEST_FROZEN"); expect(call).toHaveBeenCalledTimes(1);
  });
  it("allocation uses its separate exact cumulative path and matching review reference", async () => {
    const c = make("allocation"), value = { purchaseId: ID, refundedGrossCents: 1000, taxCreditCents: 160, platformFeeReturnedCents: 150,
      reference: "synthetic:allocation", taxEvidenceReference: "synthetic:original-tax", expectedStateFingerprint: FP,
      reviewReason: input().reviewReason, evidenceReference: input().evidenceReference, confirmation: `ALLOCATE ${ID} 1000/160/150` };
    call.mockResolvedValue(reply({ purchaseId: ID, reference: value.reference, status: "recorded" }));
    c.prepare("courseGift", value); expect((await c.submit(true)).financial).toMatchObject({ reference: value.reference, status: "recorded" });
    expect(call.mock.calls[0][0]).toBe("/api/course-gifts/support/financial/allocation"); expect(call.mock.calls[0][1].body).toEqual(value);
  });
});
