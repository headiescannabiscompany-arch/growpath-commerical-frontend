import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  createCheckoutSession,
  createGiftCheckoutQuote,
  getGiftCheckoutRecovery,
  getSubscription,
  getSubscriptionSetupStatus
} from "../../src/api/subscription";
import {
  clearGiftCheckoutAttemptWhenAllowed,
  markGiftCheckoutRequested,
  prepareGiftCheckoutQuoteAttempt
} from "../../src/features/billing/giftCheckoutAttempt";
import UpgradePlan from "../../src/features/billing/screens/UpgradePlan";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

let mockSearchParams: Record<string, string> = {};
const mockPush = jest.fn();
const originalWindow = (globalThis as any).window;
const originalSessionStorageDescriptor = originalWindow
  ? Object.getOwnPropertyDescriptor(originalWindow, "sessionStorage")
  : undefined;
let attemptStorageValues = new Map<string, string>();

function quote(overrides: Record<string, any> = {}) {
  return {
    schemaVersion: "gift_quote_v1",
    version: 1,
    plan: "pro",
    interval: "monthly",
    quantity: 1,
    amountCents: 1775,
    currency: "usd",
    renews: false,
    issuedAt: "2099-01-01T12:00:00.000Z",
    expiresAt: "2099-01-01T12:05:00.000Z",
    confirmationToken: "1.eyJzYWZlIjoidGVzdCJ9.c2lnbmF0dXJl",
    ...overrides
  };
}

function installAttemptSessionStorage() {
  attemptStorageValues = new Map<string, string>();
  const windowObject = originalWindow || {};
  Object.defineProperty(windowObject, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => attemptStorageValues.get(key) ?? null,
      removeItem: (key: string) => attemptStorageValues.delete(key),
      setItem: (key: string, value: string) => attemptStorageValues.set(key, value)
    }
  });
  (globalThis as any).window = windowObject;
}

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush })
}));

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  createGiftCheckoutQuote: jest.fn(),
  getGiftCheckoutRecovery: jest.fn(),
  getSubscription: jest.fn(),
  getSubscriptionSetupStatus: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

jest.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({
    token: "buyer-token",
    user: { id: "buyer" },
    isHydrating: false
  })
}));

jest.mock("../../src/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("UpgradePlan pricing", () => {
  beforeEach(async () => {
    installAttemptSessionStorage();
    await clearGiftCheckoutAttemptWhenAllowed(true);
    jest.clearAllMocks();
    mockSearchParams = {};
    (createCheckoutSession as jest.Mock).mockImplementation(async (request) =>
      request?.giftMode
        ? {
            url: "https://checkout.stripe.com/c/pay/cs_test_session",
            sessionId: "cs_test_session",
            trialDays: 0,
            giftId: "507f1f77bcf86cd799439011",
            checkoutAttemptId: request.checkoutAttemptId,
            amountCents: request.interval === "yearly" ? 4567 : 1775,
            currency: "usd",
            expiresAt: "2099-01-01T12:30:00.000Z"
          }
        : { url: "https://checkout.stripe.com/c/pay/cs_test_session" }
    );
    (createGiftCheckoutQuote as jest.Mock).mockResolvedValue(quote());
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValue({
      state: "none",
      attempt: null
    });
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "test",
      giftCheckoutConfigured: false
    });
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "free",
      subscriptionStatus: "inactive"
    });
    (openExternalUrl as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalWindow && originalSessionStorageDescriptor) {
      Object.defineProperty(
        originalWindow,
        "sessionStorage",
        originalSessionStorageDescriptor
      );
    } else if (originalWindow) {
      delete originalWindow.sessionStorage;
    }
    (globalThis as any).window = originalWindow;
  });

  it("preserves shared self-plan prices and yearly checkout", async () => {
    const screen = render(<UpgradePlan />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    expect(screen.getByText("Checkout $10/month")).toBeTruthy();
    expect(screen.getByText("Checkout $50/month")).toBeTruthy();
    expect(screen.getByText("Checkout $100/month")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Yearly billing"));
    fireEvent.press(screen.getByLabelText("Choose Commercial yearly checkout"));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "yearly"
      })
    );
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_session"
    );
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
  });

  it("keeps active and cancel-scheduled access out of self checkout", async () => {
    (getSubscription as jest.Mock).mockResolvedValueOnce({
      plan: "commercial",
      subscriptionStatus: "active",
      source: "stripe",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2030-05-15T18:30:00.000Z"
    });
    const screen = render(<UpgradePlan />);

    await waitFor(() =>
      expect(screen.getByText("Paid access already active")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Choose Pro monthly checkout")).toBeNull();
    expect(screen.queryByLabelText("Choose Commercial monthly checkout")).toBeNull();
    expect(screen.queryByLabelText("Choose Facility monthly checkout")).toBeNull();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("keeps gift mode disabled and ignores a spoofed gift query", async () => {
    mockSearchParams = { gift: "success" };
    const screen = render(<UpgradePlan />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled();
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(screen.queryByText(/Gift checkout completed/i)).toBeNull();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
  });

  it("shows saved-attempt recovery while gift setup is unavailable", async () => {
    const fingerprint = {
      plan: "pro",
      interval: "monthly",
      recipientEmail: "friend@example.com",
      recipientName: "",
      message: ""
    };
    const attempt = await prepareGiftCheckoutQuoteAttempt(fingerprint);
    await markGiftCheckoutRequested(fingerprint, attempt.checkoutAttemptId);
    const screen = render(<UpgradePlan />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled()
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Check saved checkout from this browser")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Check saved checkout from this browser"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/account\/gift-checkout\/cancel\?checkout_attempt_id=[0-9a-f-]{36}$/i
      )
    );
  });

  it("uses the same server-authoritative review and explicit confirmation flow", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true
    });
    (createGiftCheckoutQuote as jest.Mock).mockResolvedValueOnce(
      quote({ interval: "yearly", amountCents: 4567 })
    );
    const screen = render(<UpgradePlan />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    expect(screen.queryByText("$10")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "friend@example.com"
    );
    fireEvent.press(screen.getByLabelText("One year of prepaid access"));
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));

    await waitFor(() => expect(screen.getByText("$45.67")).toBeTruthy());
    expect(createCheckoutSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Confirm and continue - $45.67"));

    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    const request = (createCheckoutSession as jest.Mock).mock.calls[0][0];
    expect(request).toEqual({
      plan: "pro",
      interval: "yearly",
      giftMode: true,
      giftRecipientEmail: "friend@example.com",
      checkoutAttemptId: expect.any(String),
      giftQuoteToken: quote().confirmationToken
    });
    expect(request).not.toHaveProperty("successUrl");
    expect(request).not.toHaveProperty("cancelUrl");
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_session"
    );
  });

  it("keeps an attempt after URL-open failure and blocks edited duplicate checkout", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true
    });
    (openExternalUrl as jest.Mock).mockRejectedValueOnce(
      new Error("The checkout window could not be opened.")
    );
    const screen = render(<UpgradePlan />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "friend@example.com"
    );
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$17.75")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Confirm and continue - $17.75"));

    await waitFor(() =>
      expect(screen.getByText("The checkout window could not be opened.")).toBeTruthy()
    );
    expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Gift message"), "Edited note");
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy();
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText("Check saved gift checkout"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });
});
