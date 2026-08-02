import fs from "node:fs";
import path from "node:path";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { isSafeStripeCheckoutUrl, reconcileGiftCheckout } from "@/api/subscription";
import {
  clearGiftCheckoutAttemptWhenAllowed,
  getStoredGiftCheckoutAttempt
} from "@/features/billing/giftCheckoutAttempt";
import { createGiftCheckoutRecoveryStyles } from "@/features/billing/GiftCheckoutRecoveryAction";
import { createGiftCheckoutReviewStyles } from "@/features/billing/GiftCheckoutReviewAction";
import GiftCheckoutReturn, {
  createGiftCheckoutReturnStyles,
  normalizeGiftCheckoutSessionParam
} from "@/features/billing/screens/GiftCheckoutReturn";
import { getThemePalette } from "@/theme/appTheme";
import { openExternalUrl } from "@/utils/openExternalUrl";

const mockReplace = jest.fn();
let mockSearchParams: { session_id?: string | string[] } = {};

function gift(overrides: Record<string, any> = {}) {
  return {
    id: "gift-1",
    plan: "pro",
    interval: "monthly",
    amountCents: 1234,
    currency: "usd",
    recipientEmailMasked: "f***@example.com",
    recipientName: "Friend",
    message: "Enjoy",
    state: "checkout_pending",
    createdAt: "2030-01-01T12:00:00.000Z",
    paidAt: null,
    claimExpiresAt: null,
    claimedAt: null,
    refundedAt: null,
    nextActionAt: null,
    actions: {
      canResend: false,
      resendRequiresAcknowledgement: false,
      canCancelAndRefund: false,
      requiresSupport: false,
      nextActionAt: null
    },
    ...overrides
  };
}

function reconciliation(overrides: Record<string, any> = {}) {
  return {
    state: "pending",
    paymentConfirmed: false,
    canResume: false,
    canStartNewAttempt: false,
    checkoutUrl: null,
    amountCents: 1234,
    currency: "usd",
    expiresAt: "2030-01-01T13:00:00.000Z",
    gift: gift(),
    ...overrides
  };
}

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/subscription", () => ({
  reconcileGiftCheckout: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

jest.mock("@/features/billing/giftCheckoutAttempt", () => ({
  clearGiftCheckoutAttemptWhenAllowed: jest.fn(),
  getStoredGiftCheckoutAttempt: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("authoritative gift checkout return", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValue({
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      phase: "checkout_requested",
      legacyVersion: false
    });
    (reconcileGiftCheckout as jest.Mock).mockResolvedValue(reconciliation());
    (clearGiftCheckoutAttemptWhenAllowed as jest.Mock).mockResolvedValue(true);
    (openExternalUrl as jest.Mock).mockResolvedValue(undefined);
  });

  it("reconciles a success return by its valid session only, ignoring stale storage", async () => {
    mockSearchParams = { session_id: "cs_test_valid_session" };
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({
        sessionId: "cs_test_valid_session"
      })
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Stripe returned to GrowPath after checkout. This address alone does not prove that a payment succeeded."
      )
    ).toBeTruthy();
    expect(screen.getByText("Checkout request is pending")).toBeTruthy();
    expect(screen.queryByText("Payment verified by GrowPath")).toBeNull();
  });

  it.each([
    ["missing", undefined],
    ["malformed", "javascript:paid"],
    ["duplicated", ["cs_test_one", "cs_test_two"]]
  ])("fails closed for a %s success session parameter", async (_label, sessionId) => {
    mockSearchParams = sessionId === undefined ? {} : { session_id: sessionId };
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(screen.getByText(/missing a valid Stripe Checkout session/i)).toBeTruthy()
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
    expect(screen.queryByText("Payment verified by GrowPath")).toBeNull();
  });

  it("never clears a saved attempt from a stale success-session reconciliation", async () => {
    mockSearchParams = { session_id: "cs_test_valid_session" };
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "expired",
        canStartNewAttempt: true,
        gift: gift({ state: "canceled" })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(screen.getByText("Checkout expired without a verified payment")).toBeTruthy()
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("reports a server-verified payment even after the cancel route", async () => {
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "settled",
        paymentConfirmed: true,
        gift: gift({ state: "awaiting_claim", paidAt: "2030-01-01T12:01:00.000Z" })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText("Payment verified by GrowPath")).toBeTruthy()
    );
    expect(
      screen.getByText(
        "GrowPath is checking the exact saved gift attempt. A cancel return or recovery link alone does not prove whether a payment was submitted."
      )
    ).toBeTruthy();
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("resumes only the same validated open and unpaid Stripe checkout", async () => {
    const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_resume";
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "open_unpaid",
        canResume: true,
        checkoutUrl
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);
    await waitFor(() =>
      expect(screen.getByText("Checkout remains open and unpaid")).toBeTruthy()
    );

    fireEvent.press(screen.getByLabelText("Resume the same Stripe checkout"));
    await waitFor(() => expect(openExternalUrl).toHaveBeenCalledWith(checkoutUrl));
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("clears only after authoritative permission and warns if verification fails", async () => {
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "expired",
        canStartNewAttempt: true,
        gift: gift({ state: "canceled" })
      })
    );
    (clearGiftCheckoutAttemptWhenAllowed as jest.Mock).mockResolvedValueOnce(false);
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(true)
    );
    expect(screen.getByText("Checkout expired without a verified payment")).toBeTruthy();
    expect(
      screen.getByText(/browser could not verify removal of its saved attempt/i)
    ).toBeTruthy();
  });

  it("ignores a success-looking session parameter on the cancel recovery route", async () => {
    mockSearchParams = { session_id: "cs_test_spoofed_session" };
    render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    );
    expect(reconcileGiftCheckout).not.toHaveBeenCalledWith({
      sessionId: "cs_test_spoofed_session"
    });
  });

  it("does not clear when the saved attempt changes during cancel verification", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock)
      .mockResolvedValueOnce({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        phase: "checkout_requested",
        legacyVersion: false
      })
      .mockResolvedValueOnce({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174001",
        phase: "checkout_requested",
        legacyVersion: false
      });
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "expired",
        canStartNewAttempt: true,
        gift: gift({ state: "canceled" })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(
        screen.getByText(/browser could not verify removal of its saved attempt/i)
      ).toBeTruthy()
    );
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("offers history without inventing a result when no identity can be verified", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce(null);
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(
        screen.getByText(/No valid Stripe session or saved gift attempt/i)
      ).toBeTruthy()
    );
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
    expect(screen.queryByText("Payment verified by GrowPath")).toBeNull();
    fireEvent.press(screen.getByLabelText("View gifts you sent"));
    expect(mockReplace).toHaveBeenCalledWith("/account/sent-gifts");
  });

  it("normalizes only a single Stripe Checkout session identifier", () => {
    expect(normalizeGiftCheckoutSessionParam("cs_test_valid_123")).toBe(
      "cs_test_valid_123"
    );
    expect(normalizeGiftCheckoutSessionParam(["cs_test_one", "cs_test_two"])).toBeNull();
    expect(normalizeGiftCheckoutSessionParam("javascript:paid")).toBeNull();
    expect(normalizeGiftCheckoutSessionParam(undefined)).toBeNull();
  });

  it("keeps return and review surfaces palette-driven and mobile-safe", () => {
    for (const mode of ["day", "night"] as const) {
      const palette = getThemePalette(mode, mode);
      const styles = createGiftCheckoutReturnStyles(palette);
      const reviewStyles = createGiftCheckoutReviewStyles(palette);
      const recoveryStyles = createGiftCheckoutRecoveryStyles(palette);
      expect(styles.page.backgroundColor).toBe(palette.page);
      expect(styles.statusCard.backgroundColor).toBe(palette.surface);
      expect(styles.statusTitle.color).toBe(palette.text);
      expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
      expect(styles.content.width).toBe("100%");
      expect(styles.content.maxWidth).toBe(760);
      expect(styles.primaryButton.minHeight).toBe(44);
      expect(reviewStyles.review.backgroundColor).toBe(palette.surfaceMuted);
      expect(reviewStyles.boundDetails.backgroundColor).toBe(palette.surface);
      expect(reviewStyles.button.backgroundColor).toBe(palette.accent);
      expect(reviewStyles.button.minHeight).toBe(44);
      expect(recoveryStyles.card.backgroundColor).toBe(palette.surfaceMuted);
      expect(recoveryStyles.button.borderColor).toBe(palette.accent);
      expect(recoveryStyles.button.minHeight).toBe(44);
    }
  });

  it("keeps both return routes authenticated and mapped to the shared screen", () => {
    for (const route of ["success", "cancel"]) {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          "src",
          "app",
          "account",
          "gift-checkout",
          `${route}.tsx`
        ),
        "utf8"
      );
      expect(source).toContain("<RequireAuthGate>");
      expect(source).toContain(`<GiftCheckoutReturn expectedReturn="${route}" />`);
      expect(source).not.toContain("paymentConfirmed: true");
    }
  });

  it("revalidates a resume URL before opening it", async () => {
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "open_unpaid",
        canResume: true,
        checkoutUrl: "https://evil.example/c/pay/session"
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);
    await waitFor(() => expect(reconcileGiftCheckout).toHaveBeenCalled());

    expect(isSafeStripeCheckoutUrl("https://evil.example/c/pay/session")).toBe(false);
    expect(screen.queryByLabelText("Resume the same Stripe checkout")).toBeNull();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
