import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { getSubscription } from "@/api/subscription";
import { resolveSubscriptionSafety } from "@/features/billing/subscriptionSafety";
import PaymentsScreen from "@/screens/PaymentsScreen";

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("subscription purchase safety", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["gift", { source: "gift" }],
    ["IAP", { source: "iap" }],
    ["admin", { source: "admin" }],
    ["trial", { source: "stripe", status: "trialing" }],
    ["unknown", { source: null, stripeSubscriptionId: "sub_stale" }]
  ])("treats active %s access as non-cancellable", (_label, extra) => {
    const state = resolveSubscriptionSafety({
      plan: "pro",
      status: "active",
      canManageBilling: true,
      canCancelSubscription: true,
      ...extra
    });

    expect(state.active).toBe(true);
    expect(state.canOpenCheckout).toBe(false);
    expect(state.canCancel).toBe(false);
  });

  it("requires explicit Stripe source and affirmative permissions to cancel", () => {
    expect(
      resolveSubscriptionSafety({
        plan: "pro",
        status: "active",
        source: "stripe",
        canManageBilling: true,
        canCancelSubscription: true
      }).canCancel
    ).toBe(true);
  });

  it("keeps a confirmed free account eligible to purchase", () => {
    const state = resolveSubscriptionSafety({ plan: "free", status: "inactive" });
    expect(state.canOpenCheckout).toBe(true);
    expect(state.canCancel).toBe(false);
  });

  it("shows paid-through state without a repeat Payments checkout", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "commercial",
      status: "active",
      source: "stripe",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2030-05-15T18:30:00.000Z"
    });

    const screen = render(<PaymentsScreen />);

    await waitFor(() => expect(screen.getByText("Access through")).toBeTruthy());
    expect(screen.queryByText("Upgrade Plan")).toBeNull();
  });
});
