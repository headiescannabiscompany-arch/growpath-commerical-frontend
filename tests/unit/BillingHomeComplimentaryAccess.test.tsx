import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { getSubscription } from "@/api/subscription";
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
});
