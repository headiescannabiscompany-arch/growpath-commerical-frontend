import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { createCheckoutSession, getSubscription } from "@/api/subscription";
import { cancelSubscription } from "@/api/subscribe";
import BillingHome, {
  formatGiftEntitlementEnd
} from "@/features/billing/screens/BillingHome";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "billing-test-token" })
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  isSentGift: (value: any) => Boolean(value?.id && value?.actions),
  listSentGifts: jest.fn().mockResolvedValue({ gifts: [], nextCursor: null }),
  resendSentGift: jest.fn()
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("BillingHome prepaid gift access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cancelSubscription as jest.Mock).mockResolvedValue({ ok: true });
  });

  it("shows authoritative prepaid end semantics without cancellation controls", async () => {
    const endsAt = "2030-05-15T18:30:00.000Z";
    (getSubscription as jest.Mock).mockResolvedValue({
      data: {
        plan: "pro",
        subscriptionStatus: "active",
        source: "gift",
        giftEntitlementEndsAt: endsAt,
        billingOwner: "purchaser",
        canManageBilling: false,
        canCancelSubscription: false
      }
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByText("Access type: Prepaid gift")).toBeTruthy()
    );
    expect(
      screen.getByText(`Access ends: ${formatGiftEntitlementEnd(endsAt)}`)
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Your prepaid access does not renew. Billing belongs to the gift purchaser, so there is no subscription to cancel from this account."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
    expect(screen.queryByLabelText("Compare subscription plans")).toBeNull();
  });

  it("never exposes cancellation when gift source conflicts with permissive flags", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "gift",
      giftEntitlementEndsAt: "2030-05-15T18:30:00.000Z",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByText("Access type: Prepaid gift")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
  });

  it("keeps cancellation available for an account-owned recurring subscription", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByLabelText("Cancel subscription")).toBeTruthy()
    );
    expect(screen.queryByText("Access type: Prepaid gift")).toBeNull();
  });

  it("shows paid-through access and removes repeat cancellation after renewal is canceled", async () => {
    const currentPeriodEnd = "2030-05-15T18:30:00.000Z";
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "commercial",
      subscriptionStatus: "active",
      source: "stripe",
      currentPeriodEnd,
      cancelAtPeriodEnd: true,
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: false
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(
        screen.getByText(
          `Renewal is canceled. Your paid access remains available through ${formatGiftEntitlementEnd(currentPeriodEnd)}.`
        )
      ).toBeTruthy()
    );
    expect(
      screen.getByText(`Access through: ${formatGiftEntitlementEnd(currentPeriodEnd)}`)
    ).toBeTruthy();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
    expect(screen.getByText("Status: active")).toBeTruthy();
  });

  it("offers self-purchase only after an expired gift loses paid access", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "free",
      subscriptionStatus: "expired",
      source: "gift",
      giftEntitlementEndsAt: "2029-05-15T18:30:00.000Z",
      billingOwner: "purchaser",
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: true
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByLabelText("Compare subscription plans")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Compare subscription plans"));
    expect(mockPush).toHaveBeenCalledWith("/offers");
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "This prepaid gift has ended. You can choose a personal subscription if you want to continue Pro access."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
  });

  it("does not open a fresh checkout when status cannot be confirmed", async () => {
    (getSubscription as jest.Mock).mockRejectedValueOnce(new Error("offline"));

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Current subscription access could not be confirmed. Refresh status before starting another checkout."
        )
      ).toBeTruthy()
    );
    expect(screen.queryByLabelText("Compare subscription plans")).toBeNull();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
  });

  it("cancels only after the inline confirmation in the web-safe interaction flow", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true,
      canStartCheckout: false
    });
    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByLabelText("Cancel subscription")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Cancel subscription"));
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm subscription cancellation")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Confirm cancel subscription renewal"));

    await waitFor(() => {
      expect(cancelSubscription).toHaveBeenCalledWith("billing-test-token");
      expect(
        screen.getByText(
          "Renewal was canceled. Your paid access remains active through the end of the current billing period."
        )
      ).toBeTruthy();
    });
  });

  it("shows an inline error when personal cancellation fails", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      billingOwner: "account",
      canManageBilling: true,
      canCancelSubscription: true,
      canStartCheckout: false,
      paymentState: "paid"
    });
    (cancelSubscription as jest.Mock).mockRejectedValueOnce(
      new Error("Stripe cancellation could not be confirmed.")
    );
    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByLabelText("Cancel subscription")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Cancel subscription"));
    fireEvent.press(screen.getByLabelText("Confirm cancel subscription renewal"));

    await waitFor(() =>
      expect(screen.getByText("Stripe cancellation could not be confirmed.")).toBeTruthy()
    );
  });
});
