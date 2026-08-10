import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  createCheckoutSession,
  createGiftCheckoutQuote,
  getGiftCheckoutRecovery
} from "@/api/subscription";
import {
  clearGiftCheckoutAttemptWhenAllowed,
  getStoredGiftCheckoutAttempt
} from "@/features/billing/giftCheckoutAttempt";
import GiftCheckoutReviewAction from "@/features/billing/GiftCheckoutReviewAction";

const mockPush = jest.fn();
let mockToken: string | null = "buyer-token";
let mockUser: Record<string, unknown> | null = { id: "buyer" };
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
  getGiftCheckoutRecovery: jest.fn(),
  isSafeStripeCheckoutUrl: (value: unknown) =>
    typeof value === "string" && value.startsWith("https://checkout.stripe.com/c/pay/")
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: mockToken, user: mockUser, isHydrating: false })
}));

describe("shared gift checkout review action", () => {
  beforeEach(async () => {
    installStorage();
    await clearGiftCheckoutAttemptWhenAllowed(true);
    jest.clearAllMocks();
    mockToken = "buyer-token";
    mockUser = { id: "buyer" };
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

  it("asks an anonymous purchaser to sign in with the exact gift continuation", () => {
    mockToken = null;
    mockUser = null;
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured
        onFeedback={jest.fn()}
        openCheckoutUrl={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Gift checkout sign in required")).toBeTruthy();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Sign in to buy a gift"));
    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Foffers%3Fgift%3D1");
  });

  it("treats a token without a verified user as signed out", () => {
    mockUser = null;
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured
        onFeedback={jest.fn()}
        openCheckoutUrl={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Gift checkout sign in required")).toBeTruthy();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(createGiftCheckoutQuote).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("discards account A review state and rechecks recovery for account B", async () => {
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

    mockToken = "buyer-b-token";
    mockUser = { id: "buyer-b" };
    screen.rerender(<GiftCheckoutReviewAction {...props} />);

    expect(screen.queryByText("$12.34")).toBeNull();
    await waitFor(() => expect(getGiftCheckoutRecovery).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("Review authoritative gift price")).toBeTruthy();
    expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(1);
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

    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
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

  it("does not open a late Stripe response after authentication loss", async () => {
    const openCheckoutUrl = jest.fn().mockResolvedValue(undefined);
    let resolveCreate!: (value: Record<string, unknown>) => void;
    let createRequest: Record<string, any> = {};
    (createCheckoutSession as jest.Mock).mockImplementationOnce(
      (request: Record<string, any>) => {
        createRequest = request;
        return new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }
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
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));

    mockToken = null;
    mockUser = null;
    screen.rerender(<GiftCheckoutReviewAction {...props} />);
    await act(async () => {
      resolveCreate(checkoutResponse(createRequest));
      await Promise.resolve();
    });

    expect(openCheckoutUrl).not.toHaveBeenCalled();
    await expect(getStoredGiftCheckoutAttempt()).resolves.toMatchObject({
      checkoutAttemptId: createRequest.checkoutAttemptId,
      phase: "checkout_requested"
    });
  });

  it("does not open a late Stripe response after the review unmounts", async () => {
    const openCheckoutUrl = jest.fn().mockResolvedValue(undefined);
    let resolveCreate!: (value: Record<string, unknown>) => void;
    let createRequest: Record<string, any> = {};
    (createCheckoutSession as jest.Mock).mockImplementationOnce(
      (request: Record<string, any>) => {
        createRequest = request;
        return new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }
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
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));

    screen.unmount();
    await act(async () => {
      resolveCreate(checkoutResponse(createRequest));
      await Promise.resolve();
    });

    expect(openCheckoutUrl).not.toHaveBeenCalled();
    await expect(getStoredGiftCheckoutAttempt()).resolves.toMatchObject({
      checkoutAttemptId: createRequest.checkoutAttemptId,
      phase: "checkout_requested"
    });
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

  it("routes an active-attempt conflict to account recovery without opening Stripe", async () => {
    const openCheckoutUrl = jest.fn();
    const onFeedback = jest.fn();
    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("An earlier gift checkout must be recovered."), {
        code: "GIFT_CHECKOUT_RECOVERY_REQUIRED"
      })
    );
    const screen = render(
      <GiftCheckoutReviewAction
        material={material}
        recipientValid
        configured
        onFeedback={onFeedback}
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
    expect(screen.queryByLabelText("Review authoritative gift price")).toBeNull();
    expect(onFeedback).toHaveBeenLastCalledWith(
      "error",
      expect.stringContaining("purchasing account")
    );
    fireEvent.press(screen.getByLabelText("Check saved gift checkout"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });

  it("reuses the safely downgraded local attempt after account recovery resolves", async () => {
    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("An earlier gift checkout must be recovered."), {
        code: "GIFT_CHECKOUT_RECOVERY_REQUIRED"
      })
    );
    const props = {
      material,
      recipientValid: true,
      configured: true,
      onFeedback: jest.fn(),
      openCheckoutUrl: jest.fn()
    };
    const first = render(<GiftCheckoutReviewAction {...props} />);
    await waitFor(() =>
      expect(first.getByLabelText("Review authoritative gift price")).toBeEnabled()
    );
    fireEvent.press(first.getByLabelText("Review authoritative gift price"));
    await waitFor(() => expect(first.getByText("$12.34")).toBeTruthy());
    const firstAttemptId = (createGiftCheckoutQuote as jest.Mock).mock.calls[0][0]
      .checkoutAttemptId;
    fireEvent.press(first.getByLabelText("Confirm and continue - $12.34"));
    await waitFor(() =>
      expect(first.getByLabelText("Check saved gift checkout")).toBeTruthy()
    );
    first.unmount();

    const afterRecovery = render(<GiftCheckoutReviewAction {...props} />);
    await waitFor(() =>
      expect(
        afterRecovery.getByLabelText("Review authoritative gift price")
      ).toBeEnabled()
    );
    fireEvent.press(afterRecovery.getByLabelText("Review authoritative gift price"));

    await waitFor(() => expect(createGiftCheckoutQuote).toHaveBeenCalledTimes(2));
    expect(
      (createGiftCheckoutQuote as jest.Mock).mock.calls[1][0].checkoutAttemptId
    ).toBe(firstAttemptId);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
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
