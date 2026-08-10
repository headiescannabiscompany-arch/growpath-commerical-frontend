import fs from "node:fs";
import path from "node:path";
import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  getGiftCheckoutRecovery,
  isSafeStripeCheckoutUrl,
  reconcileGiftCheckout
} from "@/api/subscription";
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
const mockLogout = jest.fn();
let mockSearchParams: Record<string, string | string[]> = {};

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
    checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
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
  getGiftCheckoutRecovery: jest.fn(),
  reconcileGiftCheckout: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ logout: mockLogout })
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
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValue({
      state: "none",
      attempt: null
    });
    (clearGiftCheckoutAttemptWhenAllowed as jest.Mock).mockResolvedValue(true);
    (openExternalUrl as jest.Mock).mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
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

  it("rejects extra success parameters without reconciling any session", async () => {
    mockSearchParams = {
      session_id: "cs_test_valid_session",
      paid: "true"
    };
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(screen.getByText(/missing a valid Stripe Checkout session/i)).toBeTruthy()
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
  });

  it("clears a same-id local attempt after settled success", async () => {
    mockSearchParams = { session_id: "cs_test_valid_session" };
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "settled",
        paymentConfirmed: true,
        canStartNewAttempt: true,
        gift: gift({ state: "awaiting_claim", paidAt: "2030-01-01T12:01:00.000Z" })
      })
    );
    render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(
        true,
        "123e4567-e89b-42d3-a456-426614174000"
      )
    );
  });

  it("preserves a different local attempt after settled success", async () => {
    mockSearchParams = { session_id: "cs_test_valid_session" };
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174001",
      phase: "checkout_requested",
      legacyVersion: false
    });
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "settled",
        paymentConfirmed: true,
        canStartNewAttempt: true,
        gift: gift({ state: "awaiting_claim", paidAt: "2030-01-01T12:01:00.000Z" })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(screen.getByText(/this browser saved a different attempt/i)).toBeTruthy()
    );
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("reports a server-verified payment even after the cancel route", async () => {
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "settled",
        paymentConfirmed: true,
        canStartNewAttempt: true,
        gift: gift({ state: "awaiting_claim", paidAt: "2030-01-01T12:01:00.000Z" })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText("Payment verified by GrowPath")).toBeTruthy()
    );
    expect(
      screen.getByText(
        "GrowPath is checking the exact returned or legacy-saved gift attempt. A cancel address alone does not prove whether a payment was submitted."
      )
    ).toBeTruthy();
    expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(
      true,
      "123e4567-e89b-42d3-a456-426614174000"
    );
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
      expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(
        true,
        "123e4567-e89b-42d3-a456-426614174000"
      )
    );
    expect(screen.getByText("Checkout expired without a verified payment")).toBeTruthy();
    expect(
      screen.getByText(/browser could not verify removal of its saved attempt/i)
    ).toBeTruthy();
  });

  it("reports a definite not-created result without implying payment or support", async () => {
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "not_created",
        canStartNewAttempt: true,
        gift: gift({ state: "canceled", paidAt: null })
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText("Stripe checkout was not created")).toBeTruthy()
    );
    expect(screen.getByText(/no payment was submitted/i)).toBeTruthy();
    expect(screen.queryByText("Checkout support review is required")).toBeNull();
    expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(
      true,
      "123e4567-e89b-42d3-a456-426614174000"
    );
  });

  it("rejects extra cancel parameters without falling back to browser storage", async () => {
    mockSearchParams = { session_id: "cs_test_spoofed_session" };
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText(/invalid or extra checkout information/i)).toBeTruthy()
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
  });

  it("reconciles a valid cancel URL on another tab or device without local storage", async () => {
    mockSearchParams = {
      checkout_attempt_id: "123e4567-e89b-42d3-a456-426614174000"
    };
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce(null);
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    );
    expect(screen.getByText("Checkout request is pending")).toBeTruthy();
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
  });

  it("runs the latest return identity and discards a stale earlier response", async () => {
    const attemptA = "123e4567-e89b-42d3-a456-426614174000";
    const attemptB = "123e4567-e89b-42d3-a456-426614174001";
    let resolveAttemptA!: (value: Record<string, unknown>) => void;
    (reconcileGiftCheckout as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAttemptA = resolve;
          })
      )
      .mockResolvedValueOnce(
        reconciliation({
          checkoutAttemptId: attemptB,
          gift: gift({ recipientName: "Second recipient" })
        })
      );
    mockSearchParams = { checkout_attempt_id: attemptA };
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);
    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({ checkoutAttemptId: attemptA })
    );

    mockSearchParams = { checkout_attempt_id: attemptB };
    screen.rerender(<GiftCheckoutReturn expectedReturn="cancel" />);
    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({ checkoutAttemptId: attemptB })
    );
    await waitFor(() => expect(screen.getByText("Name: Second recipient")).toBeTruthy());

    await act(async () => {
      resolveAttemptA(
        reconciliation({
          checkoutAttemptId: attemptA,
          gift: gift({ recipientName: "First recipient" })
        })
      );
      await Promise.resolve();
    });

    expect(screen.queryByText("Name: First recipient")).toBeNull();
    expect(screen.getByText("Name: Second recipient")).toBeTruthy();
    expect(reconcileGiftCheckout).toHaveBeenCalledTimes(2);
  });

  it("does not clear mismatched local storage after URL-attempt verification", async () => {
    mockSearchParams = {
      checkout_attempt_id: "123e4567-e89b-42d3-a456-426614174000"
    };
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
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
      expect(screen.getByText(/this browser saved a different attempt/i)).toBeTruthy()
    );
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("offers history without inventing a result when no identity can be verified", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce(null);
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText(/No valid saved gift attempt/i)).toBeTruthy()
    );
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
    expect(screen.queryByText("Payment verified by GrowPath")).toBeNull();
    fireEvent.press(screen.getByLabelText("View gifts you sent"));
    expect(mockReplace).toHaveBeenCalledWith("/account/sent-gifts");
  });

  it("does not reconcile a never-submitted quote from a legacy bare cancel route", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      phase: "quote_only",
      legacyVersion: false
    });
    const screen = render(<GiftCheckoutReturn expectedReturn="cancel" />);

    await waitFor(() =>
      expect(screen.getByText(/No valid saved gift attempt/i)).toBeTruthy()
    );
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Use the purchasing account")).toBeNull();
  });

  it("checks authenticated server recovery without browser storage", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce(null);
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "creation_unknown",
        plan: "pro",
        interval: "monthly",
        amountCents: 1234,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    const screen = render(<GiftCheckoutReturn expectedReturn="recovery" />);

    await waitFor(() =>
      expect(reconcileGiftCheckout).toHaveBeenCalledWith({
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000"
      })
    );
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(screen.getByText("Checkout request is pending")).toBeTruthy();
    expect(
      screen.getByText(/may finish or resume the same saved checkout operation/i)
    ).toBeTruthy();
    expect(screen.getByText(/does not submit payment/i)).toBeTruthy();
  });

  it("clears a same-id local attempt after account recovery permits a new one", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "creation_unknown",
        plan: "pro",
        interval: "monthly",
        amountCents: 1234,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    (reconcileGiftCheckout as jest.Mock).mockResolvedValueOnce(
      reconciliation({
        state: "expired",
        canStartNewAttempt: true,
        gift: gift({ state: "canceled" })
      })
    );
    render(<GiftCheckoutReturn expectedReturn="recovery" />);

    await waitFor(() =>
      expect(clearGiftCheckoutAttemptWhenAllowed).toHaveBeenCalledWith(
        true,
        "123e4567-e89b-42d3-a456-426614174000"
      )
    );
  });

  it("preserves a different local attempt after account recovery", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "creation_unknown",
        plan: "pro",
        interval: "monthly",
        amountCents: 1234,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
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
    const screen = render(<GiftCheckoutReturn expectedReturn="recovery" />);

    await waitFor(() =>
      expect(screen.getByText(/this browser saved a different attempt/i)).toBeTruthy()
    );
    expect(clearGiftCheckoutAttemptWhenAllowed).not.toHaveBeenCalled();
  });

  it("shows server support recovery without inventing gift details", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "support",
      attempt: null
    });
    const screen = render(<GiftCheckoutReturn expectedReturn="recovery" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift checkout support review")).toBeTruthy()
    );
    expect(reconcileGiftCheckout).not.toHaveBeenCalled();
    expect(screen.queryByText(/Recipient:/i)).toBeNull();
    expect(screen.queryByText("Payment verified by GrowPath")).toBeNull();
  });

  it("offers a generic purchasing-account switch after owner-scoped not-found", async () => {
    mockSearchParams = { session_id: "cs_test_valid_session" };
    (reconcileGiftCheckout as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("Gift checkout not found for user 123."), {
        code: "GIFT_RECONCILIATION_NOT_FOUND"
      })
    );
    const screen = render(<GiftCheckoutReturn expectedReturn="success" />);

    await waitFor(() =>
      expect(screen.getByLabelText("Use the purchasing account")).toBeTruthy()
    );
    expect(
      screen.getByText(/did not find this gift checkout for this signed-in account/i)
    ).toBeTruthy();
    expect(screen.getByText(/No gift or recipient details were exposed/i)).toBeTruthy();
    expect(screen.queryByText(/user 123/i)).toBeNull();
    fireEvent.press(screen.getByLabelText("Use the purchasing account"));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/login",
      params: {
        next: "/account/gift-checkout/success?session_id=cs_test_valid_session"
      }
    });
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

  it("keeps all checkout return routes authenticated and mapped to the shared screen", () => {
    for (const route of ["success", "cancel", "recover"]) {
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
      expect(source).toContain(
        `<GiftCheckoutReturn expectedReturn="${
          route === "recover" ? "recovery" : route
        }" />`
      );
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
