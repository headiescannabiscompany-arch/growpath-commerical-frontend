import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import StripeConnectPayoutCard from "@/components/account/StripeConnectPayoutCard";
import { getThemePalette } from "@/theme/appTheme";
const mockGetStatus = jest.fn();
const mockSetup = jest.fn();
const mockPayoutSetup = jest.fn();
const mockDashboard = jest.fn();
const mockOpen = jest.fn();
let mockAuth: any;
let mockThemeMode: "day" | "night" = "day";
jest.mock("@/theme/appTheme", () => {
  const theme = jest.requireActual("@/theme/appTheme");
  return { ...theme, useAppTheme: () => ({ palette: theme.getThemePalette(mockThemeMode, mockThemeMode) }) };
});
jest.mock("@/auth/AuthContext", () => ({ useOptionalAuth: () => mockAuth }));
jest.mock("@/api/stripeConnect", () => ({
  getConnectPayoutStatus: (...args: any[]) => mockGetStatus(...args),
  startConnectCoursePaymentOnboarding: (...args: any[]) => mockSetup(...args),
  startConnectPayoutOnboarding: (...args: any[]) => mockPayoutSetup(...args),
  createConnectPayoutDashboardLink: (...args: any[]) => mockDashboard(...args)
}));
jest.mock("@/utils/openExternalUrl", () => ({ openExternalUrl: (...args: any[]) => mockOpen(...args) }));
const CONFIRM = "I want to set up course payments on my existing Stripe account";
function contrast(first: string, second: string) {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function status(state = "not_requested") {
  return { connected: true, onboardingStatus: "complete", transfersEnabled: true, payoutsEnabled: true, detailsSubmitted: true, chargesEnabled: false,
    requirements: { disabledReason: "", currentlyDueCount: 0, pastDueCount: 0, pendingVerificationCount: 0, eventuallyDueCount: 0 },
    coursePayments: { status: state, canStart: state === "not_requested", canResume: ["pending", "restricted"].includes(state) } };
}
describe("course-payment setup screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemeMode = "day";
    mockAuth = { user: { id: "synthetic-creator" }, token: "synthetic-token", isHydrating: false };
    mockGetStatus.mockResolvedValue(status());
    mockSetup.mockResolvedValue({ status: status("pending"), url: "https://accounts.stripe.com/r/synthetic" });
    mockOpen.mockResolvedValue(undefined);
  });
  it.each(["day", "night"] as const)("makes the course confirmation readable and easy to target in %s mode", async (mode) => {
    mockThemeMode = mode;
    const palette = getThemePalette(mode, mode);
    const screen = render(<StripeConnectPayoutCard />);
    const control = await screen.findByLabelText(CONFIRM);
    const row = StyleSheet.flatten(control.props.style);
    const box = StyleSheet.flatten(screen.getByTestId("course-payment-confirmation-box", { includeHiddenElements: true }).props.style);
    const label = StyleSheet.flatten(screen.getByText(`${CONFIRM}.`).props.style);
    expect(row.minHeight).toBeGreaterThanOrEqual(64);
    expect(row.padding).toBeGreaterThanOrEqual(14);
    expect(row.marginBottom).toBeGreaterThanOrEqual(12);
    expect(row.opacity ?? 1).toBe(1);
    expect(box).toMatchObject({ width: 28, height: 28, borderWidth: 2, flexShrink: 0 });
    expect(label).toMatchObject({ fontSize: 16, lineHeight: 24, fontWeight: "700", flex: 1, flexShrink: 1 });
    expect(contrast(label.color, row.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(box.borderColor, box.backgroundColor)).toBeGreaterThanOrEqual(3);
    expect(control.props.accessibilityState.checked).toBe(false);
    fireEvent.press(control);
    const selectedRow = StyleSheet.flatten(screen.getByLabelText(CONFIRM).props.style);
    const selectedBox = StyleSheet.flatten(screen.getByTestId("course-payment-confirmation-box", { includeHiddenElements: true }).props.style);
    const check = StyleSheet.flatten(screen.getByText("✓", { includeHiddenElements: true }).props.style);
    expect(selectedRow.backgroundColor).toBe(palette.accentSoft);
    expect(selectedBox.backgroundColor).toBe(palette.accent);
    expect(contrast(label.color, selectedRow.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(check.color, selectedBox.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(mockSetup).not.toHaveBeenCalled();
  });
  it("shows course confirmation keyboard focus without selecting or submitting", async () => {
    const screen = render(<StripeConnectPayoutCard />);
    const control = await screen.findByLabelText(CONFIRM);
    fireEvent(control, "focus");
    expect(StyleSheet.flatten(screen.getByLabelText(CONFIRM).props.style)).toMatchObject({ outlineWidth: 2, outlineOffset: 3, outlineStyle: "solid" });
    expect(screen.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    fireEvent(control, "blur");
    expect(StyleSheet.flatten(screen.getByLabelText(CONFIRM).props.style).outlineWidth).toBeUndefined();
    expect(mockSetup).not.toHaveBeenCalled();
  });
  it("toggles the whole course confirmation row without a provider request", async () => {
    const screen = render(<StripeConnectPayoutCard />);
    const control = await screen.findByLabelText(CONFIRM);
    fireEvent.press(control);
    expect(screen.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText("Set up course payments").props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByLabelText(CONFIRM));
    expect(screen.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText("Set up course payments").props.accessibilityState.disabled).toBe(true);
    expect(mockSetup).not.toHaveBeenCalled();
    expect(mockPayoutSetup).not.toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
  });
  it("separates payout readiness and requires unchecked deliberate course confirmation", async () => {
    const screen = render(<StripeConnectPayoutCard />);
    await screen.findByText("Ready");
    expect(screen.getByText(/Course payments: Not set up/)).toBeTruthy();
    expect(screen.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    fireEvent.press(screen.getByLabelText("Set up course payments"));
    expect(mockSetup).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText(CONFIRM));
    fireEvent.press(screen.getByLabelText("Set up course payments"));
    await waitFor(() => expect(mockOpen).toHaveBeenCalledWith("https://accounts.stripe.com/r/synthetic"));
    expect(mockSetup).toHaveBeenCalledWith("synthetic-token");
    expect(mockPayoutSetup).not.toHaveBeenCalled(); expect(mockDashboard).not.toHaveBeenCalled();
    expect(screen.getByText(/Course payments: Setup or Stripe verification/)).toBeTruthy();
    expect(screen.getByText(/does not approve every course or market/)).toBeTruthy();
  });
  it("does not retry an uncertain reply until an explicit status refresh and new confirmation", async () => {
    mockSetup.mockRejectedValueOnce(Error("private provider payload"));
    const screen = render(<StripeConnectPayoutCard />);
    await screen.findByLabelText(CONFIRM);
    fireEvent.press(screen.getByLabelText(CONFIRM)); fireEvent.press(screen.getByLabelText("Set up course payments"));
    await screen.findByText(/Course-payment setup could not be confirmed/);
    expect(screen.queryByText("private provider payload")).toBeNull();
    fireEvent.press(screen.getByLabelText(CONFIRM)); fireEvent.press(screen.getByLabelText("Set up course payments"));
    expect(mockSetup).toHaveBeenCalledTimes(1);
    mockGetStatus.mockResolvedValue(status("pending"));
    fireEvent.press(screen.getByLabelText("Refresh Stripe payout status"));
    await screen.findByLabelText("Resume course-payment setup");
    expect(screen.getByLabelText(CONFIRM).props.accessibilityState.checked).toBe(false);
    fireEvent.press(screen.getByLabelText(CONFIRM)); fireEvent.press(screen.getByLabelText("Resume course-payment setup"));
    await waitFor(() => expect(mockSetup).toHaveBeenCalledTimes(2));
    expect(mockSetup.mock.calls[0]).toEqual(mockSetup.mock.calls[1]);
  });
  it.each(["unsupported", "review_required", "unknown", "ready"])("shows %s without requesting an upgrade", async (state) => {
    mockGetStatus.mockResolvedValue(status(state));
    const screen = render(<StripeConnectPayoutCard />);
    await screen.findByText("Open Stripe payouts");
    expect(screen.queryByLabelText(CONFIRM)).toBeNull(); expect(mockSetup).not.toHaveBeenCalled();
  });
  it("keeps failed status unknown instead of offering new setup", async () => {
    mockGetStatus.mockRejectedValue(Error("Status unavailable"));
    const screen = render(<StripeConnectPayoutCard />); await screen.findByText("Status unavailable");
    expect(screen.getByText(/Course payments: Unable to verify/)).toBeTruthy();
    expect(screen.queryByLabelText(CONFIRM)).toBeNull();
  });
  it("asks a disconnected creator to use the existing payout path first", async () => {
    mockGetStatus.mockResolvedValue({ ...status("payout_setup_required"), connected: false, onboardingStatus: "none" });
    const screen = render(<StripeConnectPayoutCard />);
    await screen.findByText(/Course payments: Set up payouts first/);
    expect(screen.queryByLabelText(CONFIRM)).toBeNull(); expect(mockSetup).not.toHaveBeenCalled();
  });
  it.each(["identity", "token", "disabled", "unmount"])("discards late course links after %s change", async (change) => {
    let resolve!: (value: any) => void;
    mockSetup.mockReturnValue(new Promise((done) => { resolve = done; }));
    const screen = render(<StripeConnectPayoutCard />); await screen.findByLabelText(CONFIRM);
    fireEvent.press(screen.getByLabelText(CONFIRM)); fireEvent.press(screen.getByLabelText("Set up course payments"));
    if (change === "identity") mockAuth = { ...mockAuth, user: { id: "other" } };
    if (change === "token") mockAuth = { ...mockAuth, token: "replacement" };
    if (change === "unmount") screen.unmount();
    else screen.rerender(<StripeConnectPayoutCard enabled={change !== "disabled"} />);
    await act(async () => resolve({ status: status("pending"), url: "https://accounts.stripe.com/r/old" }));
    expect(mockOpen).not.toHaveBeenCalled(); expect(mockSetup).toHaveBeenCalledTimes(1);
  });
  it("single-flights a double activation and withholds invalid links", async () => {
    let resolve!: (value: any) => void;
    mockSetup.mockReturnValue(new Promise((done) => { resolve = done; }));
    const screen = render(<StripeConnectPayoutCard />); await screen.findByLabelText(CONFIRM);
    fireEvent.press(screen.getByLabelText(CONFIRM));
    const button = screen.getByLabelText("Set up course payments");
    fireEvent.press(button); fireEvent.press(button);
    expect(mockSetup).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: status("pending"), url: "https://evil.invalid" }));
    expect(mockOpen).not.toHaveBeenCalled();
    expect(screen.getByText(/Course-payment setup could not be confirmed/)).toBeTruthy();
  });
  it("accepts current ready status without a redirect and makes no release claim", async () => {
    mockSetup.mockResolvedValue({ status: status("ready"), url: null });
    const screen = render(<StripeConnectPayoutCard />); await screen.findByLabelText(CONFIRM);
    fireEvent.press(screen.getByLabelText(CONFIRM)); fireEvent.press(screen.getByLabelText("Set up course payments"));
    await screen.findByText(/No course was published and gifting was not enabled/);
    expect(mockOpen).not.toHaveBeenCalled();
  });
});
