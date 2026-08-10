import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { View as MockView } from "react-native";

import Offers, { isExactOffersGiftContinuation } from "@/app/offers";
import {
  createCheckoutSession,
  createGiftCheckoutQuote,
  getGiftCheckoutRecovery,
  getSubscriptionSetupStatus
} from "@/api/subscription";
import { clearGiftCheckoutAttemptWhenAllowed } from "@/features/billing/giftCheckoutAttempt";

const mockRetryMe = jest.fn();
const mockPush = jest.fn();
const mockSearchParams: {
  subscription?: string;
  gift?: string | string[];
} = {};
let mockTrialUsed = true;
let mockTrialPlansUsed = ["pro", "commercial", "facility"];
let mockSubscriptionStatus = "inactive";
let mockActivePlan = "free";
let mockToken: string | null = "buyer-token";
let mockUserAvailable = true;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const originalWindow = (globalThis as any).window;
const originalSessionStorageDescriptor = originalWindow
  ? Object.getOwnPropertyDescriptor(originalWindow, "sessionStorage")
  : undefined;
let attemptStorageValues = new Map<string, string>();

function giftQuote(overrides: Record<string, any> = {}) {
  return {
    schemaVersion: "gift_quote_v1",
    version: 1,
    plan: "pro",
    interval: "monthly",
    quantity: 1,
    amountCents: 1234,
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

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    token: mockToken,
    user:
      mockToken && mockUserAvailable
        ? {
            subscriptionStatus: mockSubscriptionStatus,
            trialUsed: mockTrialUsed,
            trialPlansUsed: mockTrialPlansUsed
          }
        : null,
    isHydrating: false,
    retryMe: mockRetryMe
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: mockActivePlan })
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  createGiftCheckoutQuote: jest.fn(),
  getGiftCheckoutRecovery: jest.fn(),
  getSubscriptionSetupStatus: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: ({ header, children }: any) => (
    <MockView>
      {header}
      {children}
    </MockView>
  )
}));

jest.mock("@/components/layout/AppCard", () => ({
  __esModule: true,
  default: ({ children }: any) => <MockView>{children}</MockView>
}));

describe("Offers billing safety", () => {
  beforeEach(async () => {
    installAttemptSessionStorage();
    await clearGiftCheckoutAttemptWhenAllowed(true);
    mockTrialUsed = true;
    mockTrialPlansUsed = ["pro", "commercial", "facility"];
    mockSubscriptionStatus = "inactive";
    mockActivePlan = "free";
    mockToken = "buyer-token";
    mockUserAvailable = true;
    delete mockSearchParams.subscription;
    delete mockSearchParams.gift;
    jest.clearAllMocks();
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "live",
      giftCheckoutConfigured: false,
      trial: { enabled: true, days: 30 }
    });
    (createCheckoutSession as jest.Mock).mockResolvedValue({});
    (createGiftCheckoutQuote as jest.Mock).mockResolvedValue(giftQuote());
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValue({
      state: "none",
      attempt: null
    });
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

  it("accepts only the exact raw web gift continuation", () => {
    expect(isExactOffersGiftContinuation({ gift: "1" }, "", "/offers?gift=1")).toBe(true);
    expect(isExactOffersGiftContinuation({ gift: "1" }, "", "/offers?gift=%31")).toBe(
      false
    );
    expect(isExactOffersGiftContinuation({ gift: "1" }, "", "/offers?%67ift=1")).toBe(
      false
    );
    expect(
      isExactOffersGiftContinuation(
        { gift: "1", extra: "1" },
        "",
        "/offers?gift=1&extra=1"
      )
    ).toBe(false);
    expect(
      isExactOffersGiftContinuation({ gift: ["1", "1"] }, "", "/offers?gift=1&gift=1")
    ).toBe(false);
  });

  it("preserves the second explicit action before immediate self checkout", async () => {
    const screen = render(<Offers />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    fireEvent.press(screen.getAllByText("Review paid checkout")[1]);
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(screen.getByText("Continue — billed $50")).toBeTruthy();

    fireEvent.press(screen.getByText("Continue — billed $50"));
    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "monthly"
      })
    );
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
  });

  it("opens payment help and purchaser history without starting checkout", async () => {
    const screen = render(<Offers />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Open payment help"));
    expect(screen.getByText("Payment Issues Help")).toBeTruthy();
    fireEvent.press(screen.getByText("Close"));
    fireEvent.press(screen.getByLabelText("View gifts purchased by this account"));

    expect(mockPush).toHaveBeenCalledWith("/account/sent-gifts");
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("keeps ordinary subscription return behavior separate from gifts", async () => {
    mockSearchParams.subscription = "success";
    mockSearchParams.gift = "success";
    mockRetryMe.mockResolvedValue(undefined);
    const screen = render(<Offers />);

    await waitFor(() => expect(mockRetryMe).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(
        "Stripe checkout completed. GrowPath is refreshing your plan. If access does not update yet, reload in a moment."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/prepaid Pro gift will be delivered/i)).toBeNull();
  });

  it("blocks every gift control while production setup reports disabled", async () => {
    mockSearchParams.gift = "1";
    const screen = render(<Offers />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled();
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("enters gift mode from the exact continuation only after auth and setup", async () => {
    mockSearchParams.gift = "1";
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "live",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift recipient email")).toBeTruthy()
    );
    expect(screen.getByLabelText("Gift subscription mode")).toHaveAccessibilityState({
      selected: true
    });
  });

  it("does not enter gift mode from duplicate continuation values", async () => {
    mockSearchParams.gift = ["1", "1"];
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "live",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(screen.getByLabelText("Gift subscription mode")).toHaveAccessibilityState({
      selected: false
    });
  });

  it("keeps an anonymous continuation non-gift until explicit safe sign-in", async () => {
    mockToken = null;
    mockSearchParams.gift = "1";
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "live",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(
        screen.getByText(/Sign in with the purchasing account before gift checkout/i)
      ).toBeTruthy()
    );
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Gift checkout sign in required")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Sign in for gift subscription"));
    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Foffers%3Fgift%3D1");
    fireEvent.press(screen.getByLabelText("Sign in to buy a gift"));
    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Foffers%3Fgift%3D1");
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("does not enter gift mode or call protected recovery with token but no user", async () => {
    mockUserAvailable = false;
    mockSearchParams.gift = "1";
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "live",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift checkout sign in required")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("clears manually selected gift mode when authentication is lost", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "live",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    expect(screen.getByLabelText("Gift recipient email")).toBeTruthy();

    mockToken = null;
    screen.rerender(<Offers />);

    await waitFor(() =>
      expect(screen.queryByLabelText("Gift recipient email")).toBeNull()
    );
    expect(screen.getByLabelText("Gift checkout sign in required")).toBeTruthy();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("shows cross-device server recovery even when gift checkout is disabled", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 1234,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled()
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Check active gift checkout for this account")
      ).toBeTruthy()
    );
    expect(
      screen.getByText(/active monthly Pro gift checkout for \$12\.34/i)
    ).toBeTruthy();
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Check active gift checkout for this account"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });

  it("hides hardcoded gift pricing until a recipient-bound server quote is reviewed", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    const screen = render(<Offers />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));

    expect(screen.getByLabelText("Gift price pending server quote")).toBeTruthy();
    expect(screen.queryByText("$10")).toBeNull();
    expect(screen.getByLabelText("Review authoritative gift price")).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      " Friend@Example.com "
    );
    fireEvent.changeText(screen.getByLabelText("Gift recipient name"), "Casey");
    fireEvent.changeText(screen.getByLabelText("Gift message"), "Enjoy this");
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));

    await waitFor(() => expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1));
    const quoteRequest = (createGiftCheckoutQuote as jest.Mock).mock.calls[0][0];
    expect(quoteRequest).toEqual({
      plan: "pro",
      interval: "monthly",
      checkoutAttemptId: expect.stringMatching(UUID_V4),
      giftRecipientEmail: "friend@example.com",
      giftRecipientName: "Casey",
      giftMessage: "Enjoy this"
    });
    expect(screen.getByText("$12.34")).toBeTruthy();
    expect(screen.getByText("Recipient email: friend@example.com")).toBeTruthy();
    expect(screen.getByText("Recipient name: Casey")).toBeTruthy();
    expect(screen.getByText("Gift message: Enjoy this")).toBeTruthy();
    expect(
      screen.getByText(
        "Access begins only after the recipient successfully claims the gift."
      )
    ).toBeTruthy();
    expect(createCheckoutSession).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    expect(createCheckoutSession).toHaveBeenCalledWith({
      plan: "pro",
      interval: "monthly",
      giftMode: true,
      giftRecipientEmail: "friend@example.com",
      giftRecipientName: "Casey",
      giftMessage: "Enjoy this",
      checkoutAttemptId: quoteRequest.checkoutAttemptId,
      giftQuoteToken: giftQuote().confirmationToken
    });
  });

  it("invalidates a quote after edits and safely rotates only its quote-only attempt", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    (createGiftCheckoutQuote as jest.Mock)
      .mockResolvedValueOnce(giftQuote())
      .mockResolvedValueOnce(giftQuote({ amountCents: 1500 }));
    const screen = render(<Offers />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "friend@example.com"
    );
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
    const firstId = (createGiftCheckoutQuote as jest.Mock).mock.calls[0][0]
      .checkoutAttemptId;

    fireEvent.changeText(screen.getByLabelText("Gift message"), "Changed after review");
    await waitFor(() => expect(screen.queryByText("$12.34")).toBeNull());
    expect(screen.getByLabelText("Review authoritative gift price")).toBeEnabled();
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));

    await waitFor(() => expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(2));
    const secondId = (createGiftCheckoutQuote as jest.Mock).mock.calls[1][0]
      .checkoutAttemptId;
    expect(secondId).toMatch(UUID_V4);
    expect(secondId).not.toBe(firstId);
    expect(screen.getByText("$15.00")).toBeTruthy();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("guards rapid actions and routes ambiguous edited attempts into reconciliation", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    let resolveQuote: (value: any) => void = () => undefined;
    (createGiftCheckoutQuote as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => (resolveQuote = resolve))
    );
    let rejectCreate: (reason?: any) => void = () => undefined;
    (createCheckoutSession as jest.Mock).mockImplementationOnce(
      () => new Promise((_resolve, reject) => (rejectCreate = reject))
    );
    const screen = render(<Offers />);
    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "friend@example.com"
    );

    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveQuote(giftQuote());
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));
    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    await act(async () => {
      rejectCreate(new Error("Checkout response was uncertain."));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );

    fireEvent.changeText(screen.getByLabelText("Gift recipient name"), "Edited");
    await waitFor(() => expect(screen.queryByText("$12.34")).toBeNull());
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy();
    expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText("Check saved gift checkout"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
    fireEvent.press(screen.getByLabelText("Buy for me mode"));
    await waitFor(() =>
      expect(screen.getByLabelText("Check saved checkout from this browser")).toBeTruthy()
    );
  });

  it("keeps an ambiguous checkout recoverable after reload when gifts become unavailable", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "test",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      new Error("Network response unknown")
    );
    const first = render(<Offers />);
    await waitFor(() =>
      expect(first.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(first.getByLabelText("Gift subscription mode"));
    fireEvent.changeText(
      first.getByLabelText("Gift recipient email"),
      "friend@example.com"
    );
    fireEvent.press(first.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(first.getByText("$12.34")).toBeTruthy());
    fireEvent.press(first.getByLabelText("Confirm and continue - $12.34"));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(first.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );
    first.unmount();

    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "live",
      giftCheckoutConfigured: false,
      trial: { enabled: true, days: 30 }
    });
    const reloaded = render(<Offers />);
    await waitFor(() =>
      expect(reloaded.getByLabelText("Gift subscriptions unavailable")).toBeDisabled()
    );
    await waitFor(() =>
      expect(
        reloaded.getByLabelText("Check saved checkout from this browser")
      ).toBeTruthy()
    );
    expect(reloaded.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    fireEvent.press(reloaded.getByLabelText("Check saved checkout from this browser"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/account\/gift-checkout\/cancel\?checkout_attempt_id=[0-9a-f-]{36}$/i
      )
    );
  });
});
