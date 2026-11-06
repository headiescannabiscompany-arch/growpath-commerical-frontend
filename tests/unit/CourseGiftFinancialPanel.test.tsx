import React from "react";
import { Platform } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import PublicPanel, { InternalCourseGiftFinancialReviewPanel as Panel } from "@/features/admin/CourseGiftFinancialReviewPanel";
import Entry from "@/features/admin/PreparedProductionCourseGiftFinancialEntry";
import { InternalCourseGiftTransportContext } from "@/components/courseGifts/CourseGiftTransportContext";
import { adminVaultRequest as call, changeSecurity, resetSecurity, listenerCount } from "../fixtures/courseGiftFinancialAdminSecurity";
jest.mock("@/api/adminPasskeys", () => require("../fixtures/courseGiftFinancialAdminSecurity"));
jest.mock("@/api/apiRequest", () => ({ API_URL: "https://api.growpathai.com", ApiError: class extends Error {} }));
jest.mock("@/features/admin/AdminPasskeySecurity", () => function Security() { return require("react").createElement(require("react-native").Text, null, "Existing passkey verification"); });
jest.mock("@/components/ScreenBoundary", () => ({ ScreenBoundary: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/components/layout/AppCard", () => function Card({ children, title }: { children: React.ReactNode; title: string }) {
  const R = require("react"), N = require("react-native"); return R.createElement(N.View, null, R.createElement(N.Text, null, title), children);
});
jest.mock("@/theme/appTheme", () => ({ useAppTheme: () => ({ palette: { text: "#eee", textMuted: "#aaa", page: "#111", surface: "#222", border: "#888", link: "#9cf" } }) }));
let mockAuth = { isAuthed: true, isHydrating: false, meStatus: "ready", token: "synthetic-token", user: { id: "a".repeat(24), role: "admin", emailVerified: true } };
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
const ID = "e".repeat(24), OP = "synthetic-original-refund", FP = "a".repeat(64);
const assessment = (extra: Record<string, unknown> = {}) => ({ purchaseId: ID, expectedStateFingerprint: FP, currency: "usd", grossAmountCents: 2500,
  refundedGrossCents: 0, taxAmountCents: 399, platformFeeCents: 375, providerEvidenceVerified: false, financialActionPerformed: false,
  refundOperation: null, allocation: null, ...extra });
const reply = (data: unknown) => ({ success: true, data });
type UI = ReturnType<typeof render>;
async function assess(ui: UI, value = assessment()) {
  call.mockResolvedValueOnce(reply(value));
  if (!ui.getByLabelText("Course-gift payment record ID").props.value) fireEvent.changeText(ui.getByLabelText("Course-gift payment record ID"), ID);
  await act(async () => { fireEvent.press(ui.getByLabelText("Load or refresh payment assessment")); });
}
function fill(ui: UI, allocation = false) {
  const values = allocation ? [["Allocation review reference", "synthetic:allocation"], ["Original tax-credit evidence reference", "synthetic:tax-original"],
    ["Cumulative tax credit (USD)", "1.60"], ["Cumulative platform fee returned (USD)", "1.50"]] :
    [["Refund operation reference", OP], ["Buyer refund amount (USD)", "25.00"]];
  for (const [label, value] of [...values, ["Reason for this exact financial decision", "Reviewed this original payment and tax evidence"],
    ["Original evidence review reference", "synthetic:original-evidence"], ["Exact financial confirmation", allocation ? `ALLOCATE ${ID} 1000/160/150` : `REFUND ${ID} 2500`]])
    fireEvent.changeText(ui.getByLabelText(label), value);
}
function acknowledge(ui: UI) { fireEvent.press(ui.getByLabelText("I reviewed the original evidence and these exact payment amounts")); }
const originalOS = Platform.OS, originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
beforeEach(() => {
  jest.useFakeTimers(); resetSecurity(); Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://growpathai.com" } } });
  mockAuth = { isAuthed: true, isHydrating: false, meStatus: "ready", token: "synthetic-token", user: { id: "a".repeat(24), role: "admin", emailVerified: true } };
});
afterEach(() => { cleanup(); expect(listenerCount()).toBe(0); jest.useRealTimers(); });
afterAll(() => { Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window"); });
describe("R09 financial panel", () => {
  it("default, native and unprepared production entries stay inert", () => {
    expect(render(<PublicPanel />).toJSON()).toBeNull(); expect(render(<Entry />).toJSON()).toBeNull();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" }); expect(render(<Panel />).toJSON()).toBeNull(); expect(call).not.toHaveBeenCalled();
  });
  it("prepared entry opens deliberately and token changes discard the private child", async () => {
    const transport = {} as React.ContextType<typeof InternalCourseGiftTransportContext>;
    const content = () => <InternalCourseGiftTransportContext.Provider value={transport}><Entry /></InternalCourseGiftTransportContext.Provider>;
    const ui = render(content()); expect(ui.queryByLabelText("Course-gift payment record ID")).toBeNull(); expect(call).not.toHaveBeenCalled();
    fireEvent.press(ui.getByLabelText("Open course-gift payment review"));
    expect(ui.getByLabelText("Course-gift payment record ID")).toBeTruthy(); expect(call).not.toHaveBeenCalled();
    fireEvent.changeText(ui.getByLabelText("Course-gift payment record ID"), ID);
    mockAuth = { ...mockAuth, token: "different-synthetic-token" }; ui.rerender(content());
    expect(ui.queryByLabelText("Course-gift payment record ID")).toBeNull(); expect(call).not.toHaveBeenCalled();
  });
  it("assessment alone shows the paid breakdown and never submits a refund", async () => {
    const ui = render(<Panel />); expect(call).not.toHaveBeenCalled(); await assess(ui);
    expect(ui.getByText(/Paid: USD 25.00/)).toBeTruthy(); expect(ui.getByText(/Original included tax: USD 3.99/)).toBeTruthy();
    expect(call).toHaveBeenCalledTimes(1); expect(call.mock.calls[0][0]).toContain("/assess");
    expect(ui.getByLabelText("Submit the reviewed buyer refund").props.accessibilityState.disabled).toBe(true);
  });
  it("refund requires exact amounts and separate acknowledgment then confirms the original applied operation read-only", async () => {
    const ui = render(<Panel />); await assess(ui); fill(ui);
    expect(ui.getByLabelText("Submit the reviewed buyer refund").props.accessibilityState.disabled).toBe(true);
    acknowledge(ui); call.mockResolvedValueOnce(reply({ purchaseId: ID, operationId: OP, status: "provider_accepted" }));
    await act(async () => { fireEvent.press(ui.getByLabelText("Submit the reviewed buyer refund")); });
    expect(ui.getByText(/Stripe accepted the original refund request/)).toBeTruthy();
    await assess(ui, assessment({ refundedGrossCents: 2500, refundOperation: { operationId: OP, amountCents: 2500, expectedRefundedAmountCents: 0,
      reason: "requested_by_customer", state: "applied" } }));
    expect(ui.getByText(/original financial intent is confirmed/)).toBeTruthy();
    expect(ui.queryByLabelText("Review the same financial intent again")).toBeNull();
    expect(call.mock.calls.filter(([url]) => String(url).endsWith("/refund"))).toHaveLength(1);
  });
  it("unknown refund recovery preserves the original intent and needs a fresh assessment and confirmation", async () => {
    const ui = render(<Panel />); await assess(ui); fill(ui); acknowledge(ui); call.mockRejectedValueOnce(Error("PRIVATE"));
    await act(async () => { fireEvent.press(ui.getByLabelText("Submit the reviewed buyer refund")); });
    expect(ui.getByText(/result is unknown/i)).toBeTruthy(); const original = call.mock.calls.find(([url]) => String(url).endsWith("/refund"))![1].body;
    await assess(ui, assessment({ expectedStateFingerprint: "b".repeat(64), refundOperation: { operationId: OP, amountCents: 2500,
      expectedRefundedAmountCents: 0, reason: "requested_by_customer", state: "provider_unconfirmed" } }));
    fireEvent.press(ui.getByLabelText("Review the same financial intent again"));
    expect(ui.getByLabelText("Refund operation reference").props.value).toBe(OP);
    expect(ui.getByLabelText("Submit the reviewed buyer refund").props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(ui.getByLabelText("Exact financial confirmation"), `REFUND ${ID} 2500`); acknowledge(ui);
    call.mockResolvedValueOnce(reply({ purchaseId: ID, operationId: OP, status: "provider_accepted" }));
    await act(async () => { fireEvent.press(ui.getByLabelText("Submit the reviewed buyer refund")); });
    const requests = call.mock.calls.filter(([url]) => String(url).endsWith("/refund")); expect(requests).toHaveLength(2);
    expect(requests[1][1].body).toMatchObject({ operationId: original.operationId, amountCents: original.amountCents, reason: original.reason,
      expectedStateFingerprint: "b".repeat(64) });
  });
  it("allocation leaves tax and fee unanswered until the operator supplies original evidence", async () => {
    const ui = render(<Panel />); await assess(ui, assessment({ refundedGrossCents: 1000 })); fireEvent.press(ui.getByLabelText("Review tax allocation"));
    expect(ui.getByLabelText("Cumulative tax credit (USD)").props.value).toBe("");
    expect(ui.getByLabelText("Cumulative platform fee returned (USD)").props.value).toBe("");
    fill(ui, true); acknowledge(ui); call.mockResolvedValueOnce(reply({ purchaseId: ID, reference: "synthetic:allocation", status: "recorded" }));
    await act(async () => { fireEvent.press(ui.getByLabelText("Record the reviewed tax allocation")); });
    expect(ui.getByText(/No buyer refund was sent/)).toBeTruthy(); expect(call.mock.calls.some(([url]) => String(url).endsWith("/refund"))).toBe(false);
    expect(call.mock.calls.at(-1)![1].body).toMatchObject({ refundedGrossCents: 1000, taxCreditCents: 160, platformFeeReturnedCents: 150 });
  });
  it("an uncertain allocation is confirmed from the exact stored references without another write", async () => {
    const ui = render(<Panel />); await assess(ui, assessment({ refundedGrossCents: 1000 })); fireEvent.press(ui.getByLabelText("Review tax allocation"));
    fill(ui, true); acknowledge(ui); call.mockRejectedValueOnce(Error("lost reply"));
    await act(async () => { fireEvent.press(ui.getByLabelText("Record the reviewed tax allocation")); });
    await assess(ui, assessment({ refundedGrossCents: 1000, allocation: { refundedGrossCents: 1000, taxCreditCents: 160, platformFeeReturnedCents: 150,
      reference: "synthetic:allocation", taxEvidenceReference: "synthetic:tax-original" } }));
    expect(ui.getByText(/original allocation is recorded/)).toBeTruthy(); expect(ui.queryByLabelText("Review the same financial intent again")).toBeNull();
    expect(call.mock.calls.filter(([url]) => String(url).endsWith("/allocation"))).toHaveLength(1);
  });
  it("proof loss hides private values and account change clears them without replay", async () => {
    const ui = render(<Panel />); await assess(ui); fill(ui);
    act(() => changeSecurity(false, null)); expect(ui.queryByLabelText("Reason for this exact financial decision")).toBeNull();
    expect(ui.getByText(/Verify your existing passkey/)).toBeTruthy();
    act(() => changeSecurity(true)); expect(ui.toJSON()).toBeNull(); expect(call).toHaveBeenCalledTimes(1);
  });
});
