import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { getSubscription, listSentGifts } from "@/api/subscription";
import { cancelSubscription } from "@/api/subscribe";
import BillingHome, {
  formatGiftEntitlementEnd
} from "@/features/billing/screens/BillingHome";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() })
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

describe("BillingHome complimentary access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listSentGifts as jest.Mock).mockResolvedValue({ gifts: [], nextCursor: null });
  });

  it("shows complimentary access as non-paid and non-renewing", async () => {
    const endsAt = "2030-05-15T18:30:00.000Z";
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "commercial",
      subscriptionStatus: "active",
      source: "complimentary",
      complimentary: true,
      complimentaryEntitlementEndsAt: endsAt,
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: false
    });

    const screen = render(<BillingHome />);

    await waitFor(() =>
      expect(screen.getByText("Access type: Complimentary")).toBeTruthy()
    );
    expect(
      screen.getByText(`Access ends: ${formatGiftEntitlementEnd(endsAt)}`)
    ).toBeTruthy();
    expect(screen.getByText("Payment: None · Renewal: None")).toBeTruthy();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
    expect(screen.queryByLabelText("Compare subscription plans")).toBeNull();
  });

  const scheduled = {
    plan: "pro",
    duration: "year",
    startsAt: "2030-05-15T18:30:00.000Z",
    blocked: false
  };
  const paidSubscription = {
    plan: "pro",
    subscriptionStatus: "active",
    source: "stripe",
    paymentState: "paid",
    canManageBilling: true,
    canCancelSubscription: true,
    canStartCheckout: false,
    scheduledComplimentaryAccess: scheduled
  };

  it("shows a scheduled gift separately without changing paid billing controls", async () => {
    (getSubscription as jest.Mock).mockResolvedValue(paidSubscription);
    const screen = render(<BillingHome />);
    expect(await screen.findByText("Scheduled complimentary gift")).toBeTruthy();
    expect(screen.getByText("One year of Personal Pro")).toBeTruthy();
    expect(
      screen.getByText(
        `Estimated gift start: ${formatGiftEntitlementEnd(scheduled.startsAt)}`
      )
    ).toBeTruthy();
    expect(screen.getByText(/Your gift is not active yet/)).toBeTruthy();
    expect(
      screen.getByText(/The full free year begins only after billing verifies/)
    ).toBeTruthy();
    expect(screen.getByText(/The gift will not renew automatically/)).toBeTruthy();
    expect(screen.queryByText("Access type: Complimentary")).toBeNull();
    expect(screen.getByLabelText("Cancel subscription")).toBeTruthy();
    expect(screen.getByLabelText("Manage subscription in Stripe")).toBeTruthy();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("keeps blocked gift details private and follows the existing cancellation state", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      ...paidSubscription,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: scheduled.startsAt,
      scheduledComplimentaryAccess: {
        ...scheduled,
        blocked: true,
        blockCode: "PRIVATE_PROVIDER_REASON"
      }
    });
    const screen = render(<BillingHome />);
    expect(
      await screen.findByText(/This gift needs Admin review before it can start/)
    ).toBeTruthy();
    expect(screen.queryByText(/PRIVATE_PROVIDER_REASON/)).toBeNull();
    expect(screen.queryByLabelText("Cancel subscription")).toBeNull();
    expect(screen.getByLabelText("Manage subscription in Stripe")).toBeTruthy();
    expect(
      screen.getByText(`Access through: ${formatGiftEntitlementEnd(scheduled.startsAt)}`)
    ).toBeTruthy();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it.each([
    { plan: "facility" },
    { duration: "forever" },
    { startsAt: "invalid" },
    { blocked: "false" }
  ])("does not promise a gift from malformed scheduled data: %j", async (override) => {
    (getSubscription as jest.Mock).mockResolvedValue({
      ...paidSubscription,
      scheduledComplimentaryAccess: { ...scheduled, ...override }
    });
    const screen = render(<BillingHome />);
    await waitFor(() => expect(screen.getByText("Status: active")).toBeTruthy());
    expect(screen.queryByText("Scheduled complimentary gift")).toBeNull();
    expect(
      screen.getByText(/The scheduled gift status could not be confirmed/)
    ).toBeTruthy();
    expect(screen.getByLabelText("Manage subscription in Stripe")).toBeTruthy();
  });

  it("removes a previously scheduled gift when refresh returns no pending gift", async () => {
    (getSubscription as jest.Mock)
      .mockResolvedValueOnce(paidSubscription)
      .mockResolvedValueOnce({ ...paidSubscription, scheduledComplimentaryAccess: null });
    const screen = render(<BillingHome />);
    expect(await screen.findByText("Scheduled complimentary gift")).toBeTruthy();
    fireEvent.press(screen.getByText("Refresh Status"));
    await waitFor(() => expect(getSubscription).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Scheduled complimentary gift")).toBeNull();
    expect(
      screen.queryByText(/The scheduled gift status could not be confirmed/)
    ).toBeNull();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});
