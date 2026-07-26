import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { View as MockView } from "react-native";

import Offers from "@/app/offers";
import { createCheckoutSession, getSubscriptionSetupStatus } from "@/api/subscription";

const mockRetryMe = jest.fn();
const mockSearchParams: { subscription?: string } = {};
let mockTrialUsed = true;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      subscriptionStatus: "inactive",
      trialUsed: mockTrialUsed
    },
    retryMe: mockRetryMe
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: "free" })
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscriptionSetupStatus: jest.fn()
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
  beforeEach(() => {
    mockTrialUsed = true;
    delete mockSearchParams.subscription;
    mockRetryMe.mockReset();
    (createCheckoutSession as jest.Mock).mockReset();
    (getSubscriptionSetupStatus as jest.Mock).mockReset();
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "live",
      trial: { enabled: true, days: 30 }
    });
    (createCheckoutSession as jest.Mock).mockResolvedValue({});
  });

  it("requires a second explicit action before immediate paid checkout", async () => {
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "This account has already used its 30-day trial. Starting another paid plan will bill the shown price when Stripe checkout completes."
        )
      ).toBeTruthy()
    );

    fireEvent.press(screen.getAllByText("Review paid checkout")[1]);

    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Commercial has no trial remaining for this account. Review the price, then continue only if you want Stripe to bill when checkout completes."
      )
    ).toBeTruthy();
    expect(screen.getByText("Continue — billed $50")).toBeTruthy();

    fireEvent.press(screen.getByText("Continue — billed $50"));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "monthly"
      })
    );
  });

  it("shows success-return feedback and refreshes the account session", async () => {
    mockSearchParams.subscription = "success";
    mockRetryMe.mockResolvedValue(undefined);

    const screen = render(<Offers />);

    await waitFor(() => expect(mockRetryMe).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(
        "Stripe checkout completed. GrowPath is refreshing your plan. If access does not update yet, reload in a moment."
      )
    ).toBeTruthy();
  });

  it("labels an eligible account trial without an immediate-billing confirmation", async () => {
    mockTrialUsed = false;
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "This account is eligible for 30 days free through Stripe checkout. A payment method is required, and paid billing begins after the trial unless canceled."
        )
      ).toBeTruthy()
    );
    expect(screen.getAllByText("Start 30-day trial")).toHaveLength(3);
  });
});
