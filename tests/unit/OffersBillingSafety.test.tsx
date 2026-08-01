import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { View as MockView } from "react-native";

import Offers from "@/app/offers";
import { createCheckoutSession, getSubscriptionSetupStatus } from "@/api/subscription";

const mockRetryMe = jest.fn();
const mockSearchParams: { subscription?: string; gift?: string } = {};
let mockTrialUsed = true;
let mockTrialPlansUsed = ["pro", "commercial", "facility"];
let mockSubscriptionStatus = "inactive";
let mockActivePlan = "free";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      subscriptionStatus: mockSubscriptionStatus,
      trialUsed: mockTrialUsed,
      trialPlansUsed: mockTrialPlansUsed
    },
    retryMe: mockRetryMe
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: mockActivePlan })
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
    mockTrialPlansUsed = ["pro", "commercial", "facility"];
    mockSubscriptionStatus = "inactive";
    mockActivePlan = "free";
    delete mockSearchParams.subscription;
    delete mockSearchParams.gift;
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
          "This account has already used its Pro, Commercial, and Facility trials. Starting another paid plan will bill the shown price when Stripe checkout completes."
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

  it("opens payment help without starting checkout", async () => {
    const screen = render(<Offers />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Open payment help"));

    expect(screen.getByText("Payment Issues Help")).toBeTruthy();
    expect(screen.getByText("billing@growpathai.com")).toBeTruthy();
    expect(createCheckoutSession).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Close"));
    expect(screen.queryByText("Payment Issues Help")).toBeNull();
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
    mockTrialPlansUsed = [];
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "This account has a separate 30-day trial available for Pro Grower, Commercial, Facility. Each trial requires a payment method, and paid billing begins after that plan's trial unless canceled."
        )
      ).toBeTruthy()
    );
    expect(screen.getAllByText("Start 30-day trial")).toHaveLength(3);
  });

  it("maps the legacy trial to Pro while leaving Commercial and Facility available", async () => {
    mockTrialUsed = true;
    mockTrialPlansUsed = [];
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(screen.getAllByText("Start 30-day trial")).toHaveLength(2)
    );
    expect(screen.getAllByText("Review paid checkout")).toHaveLength(1);
    fireEvent.press(screen.getAllByText("Start 30-day trial")[0]);

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "monthly"
      })
    );
  });

  it("does not advertise the active current plan as an immediately available trial", async () => {
    mockTrialUsed = false;
    mockTrialPlansUsed = [];
    mockSubscriptionStatus = "active";
    mockActivePlan = "facility";
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "This account has a separate 30-day trial available for Pro Grower, Commercial. Each trial requires a payment method, and paid billing begins after that plan's trial unless canceled."
        )
      ).toBeTruthy()
    );
    expect(screen.getAllByText("Start 30-day trial")).toHaveLength(2);
    expect(screen.getByText("Current plan")).toBeTruthy();
    expect(screen.getByLabelText("Review paid Facility checkout")).toBeDisabled();
  });

  it("supports gift checkout with recipient details and gift return URLs", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example", href: "" } } as any;

    try {
      const screen = render(<Offers />);

      await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

      fireEvent.press(screen.getByLabelText("Gift subscription mode"));
      fireEvent.changeText(
        screen.getByLabelText("Gift recipient email"),
        "Friend@Example.com"
      );
      fireEvent.changeText(screen.getByLabelText("Gift recipient name"), "Friend Name");
      fireEvent.changeText(screen.getByLabelText("Gift message"), "Happy growing!");
      fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

      await waitFor(() =>
        expect(createCheckoutSession).toHaveBeenCalledWith({
          plan: "pro",
          interval: "monthly",
          giftMode: true,
          giftRecipientEmail: "friend@example.com",
          giftRecipientName: "Friend Name",
          giftMessage: "Happy growing!",
          giftTerm: "monthly",
          successUrl: "https://app.example/offers?gift=success",
          cancelUrl: "https://app.example/offers?gift=canceled"
        })
      );
    } finally {
      global.window = previousWindow;
    }
  });
});
