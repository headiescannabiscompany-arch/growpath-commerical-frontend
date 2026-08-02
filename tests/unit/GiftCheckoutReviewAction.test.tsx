import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { createCheckoutSession, createGiftCheckoutQuote } from "@/api/subscription";
import { clearGiftCheckoutAttemptWhenAllowed } from "@/features/billing/giftCheckoutAttempt";
import GiftCheckoutReviewAction from "@/features/billing/GiftCheckoutReviewAction";

const mockPush = jest.fn();
const originalWindow = (globalThis as any).window;
const originalSessionStorageDescriptor = originalWindow
  ? Object.getOwnPropertyDescriptor(originalWindow, "sessionStorage")
  : undefined;
const material = {
  plan: "pro" as const,
  interval: "monthly" as const,
  recipientEmail: "friend@example.com",
  recipientName: "Friend",
  message: "Enjoy"
};

function checkoutResponse(request: Record<string, any>, overrides = {}) {
  return {
    url: "https://checkout.stripe.com/c/pay/cs_test_matching_session",
    sessionId: "cs_test_matching_session",
    trialDays: 0,
    giftId: "507f1f77bcf86cd799439011",
    checkoutAttemptId: request.checkoutAttemptId,
    amountCents: 1234,
    currency: "usd",
    expiresAt: "2099-01-01T12:30:00.000Z",
    ...overrides
  };
}

function installStorage() {
  const values = new Map<string, string>();
  const windowObject = originalWindow || {};
  Object.defineProperty(windowObject, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value)
    }
  });
  (globalThis as any).window = windowObject;
}

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  createGiftCheckoutQuote: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

describe("shared gift checkout review action", () => {
  beforeEach(async () => {
    installStorage();
    await clearGiftCheckoutAttemptWhenAllowed(true);
    jest.clearAllMocks();
    (createGiftCheckoutQuote as jest.Mock).mockResolvedValue({
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
      confirmationToken: "1.eyJzYWZlIjoidGVzdCJ9.c2lnbmF0dXJl"
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

  it("refuses to quote or confirm whenever server setup is disabled", () => {
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured={false}
        onFeedback={jest.fn()}
        openCheckoutUrl={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Gift checkout unavailable")).toBeTruthy();
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(screen.queryByText("$12.34")).toBeNull();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("hides confirmation after shutdown but preserves ambiguous-attempt recovery", async () => {
    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      new Error("Checkout response unknown")
    );
    const props = {
      material,
      recipientValid: true,
      configured: true,
      onFeedback: jest.fn(),
      openCheckoutUrl: jest.fn()
    };
    const screen = render(<GiftCheckoutReviewAction {...props} />);
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));
    await waitFor(() =>
      expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Confirm and continue - $12.34")).toBeNull();
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();

    screen.rerender(<GiftCheckoutReviewAction {...props} configured={false} />);
    expect(screen.getByLabelText("Gift checkout unavailable")).toBeTruthy();
    expect(screen.queryByLabelText("Confirm and continue - $12.34")).toBeNull();
    expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Check saved gift checkout"));

    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/cancel");
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("opens only the Stripe session correlated to the confirmed quote", async () => {
    const openCheckoutUrl = jest.fn().mockResolvedValue(undefined);
    (createCheckoutSession as jest.Mock).mockImplementationOnce(async (request) =>
      checkoutResponse(request)
    );
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured
        onFeedback={jest.fn()}
        openCheckoutUrl={openCheckoutUrl}
      />
    );
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));

    await waitFor(() =>
      expect(openCheckoutUrl).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/cs_test_matching_session"
      )
    );
  });

  it("never downgrades after create when the URL opener reuses a pre-write code", async () => {
    const openCheckoutUrl = jest.fn().mockRejectedValue(
      Object.assign(new Error("The browser session expired while opening Stripe."), {
        code: "UNAUTHENTICATED"
      })
    );
    (createCheckoutSession as jest.Mock).mockImplementationOnce(async (request) =>
      checkoutResponse(request)
    );
    const props = {
      material,
      recipientValid: true,
      configured: true,
      onFeedback: jest.fn(),
      openCheckoutUrl
    };
    const screen = render(<GiftCheckoutReviewAction {...props} />);
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));

    await waitFor(() =>
      expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );
    expect(openCheckoutUrl).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(screen.queryByLabelText("Confirm and continue - $12.34")).toBeNull();

    screen.rerender(
      <GiftCheckoutReviewAction
        {...props}
        material={{ ...material, message: "Edited after opener failure" }}
      />
    );
    expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy();
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("keeps a mixed create response in recovery and never opens its URL", async () => {
    const openCheckoutUrl = jest.fn();
    (createCheckoutSession as jest.Mock).mockImplementationOnce(async (request) =>
      checkoutResponse(request, { amountCents: 1235 })
    );
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured
        onFeedback={jest.fn()}
        openCheckoutUrl={openCheckoutUrl}
      />
    );
    fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));

    await waitFor(() =>
      expect(screen.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );
    expect(openCheckoutUrl).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Confirm and continue - $12.34")).toBeNull();
  });

  it.each([
    "GIFT_SUBSCRIPTION_NOT_CONFIGURED",
    "UNAUTHENTICATED",
    "ACCOUNT_BANNED",
    "ACCOUNT_SUSPENDED"
  ])(
    "downgrades exact pre-write %s so the same attempt can be requoted",
    async (code) => {
      (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error("Gift checkout was disabled before creation."), {
          code
        })
      );
      const screen = render(
        <GiftCheckoutReviewAction
          material={material}
          recipientValid
          configured
          onFeedback={jest.fn()}
          openCheckoutUrl={jest.fn()}
        />
      );
      fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
      await waitFor(() => expect(screen.getByText("$12.34")).toBeTruthy());
      const firstAttemptId = (createGiftCheckoutQuote as jest.Mock).mock.calls[0][0]
        .checkoutAttemptId;
      fireEvent.press(screen.getByLabelText("Confirm and continue - $12.34"));

      await waitFor(() =>
        expect(screen.getByLabelText("Review authoritative gift price")).toBeTruthy()
      );
      expect(screen.queryByLabelText("Check saved gift checkout")).toBeNull();
      fireEvent.press(screen.getByLabelText("Review authoritative gift price"));
      await waitFor(() => expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(2));
      expect(
        (createGiftCheckoutQuote as jest.Mock).mock.calls[1][0].checkoutAttemptId
      ).toBe(firstAttemptId);
    }
  );
});
