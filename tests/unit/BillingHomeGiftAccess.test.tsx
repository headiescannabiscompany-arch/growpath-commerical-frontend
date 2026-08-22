import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { getSubscription } from "@/api/subscription";
import BillingHome, {
  formatGiftEntitlementEnd
} from "@/features/billing/screens/BillingHome";

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
    expect(screen.queryByLabelText("Upgrade to Pro")).toBeNull();
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
      canCancelSubscription: false
    });

    const screen = render(<BillingHome />);

    await waitFor(() => expect(screen.getByLabelText("Upgrade to Pro")).toBeTruthy());
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
    expect(screen.queryByLabelText("Upgrade to Pro")).toBeNull();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
  });
});
