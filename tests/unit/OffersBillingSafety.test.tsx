import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { View as MockView } from "react-native";

import Offers from "@/app/offers";
import { createCheckoutSession, getSubscriptionSetupStatus } from "@/api/subscription";
import { clearGiftCheckoutAttempt } from "@/features/billing/giftCheckoutAttempt";

const mockRetryMe = jest.fn();
const mockPush = jest.fn();
const mockSearchParams: { subscription?: string; gift?: string } = {};
let mockTrialUsed = true;
let mockTrialPlansUsed = ["pro", "commercial", "facility"];
let mockSubscriptionStatus = "inactive";
let mockActivePlan = "free";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const originalWindow = (globalThis as any).window;
const originalSessionStorageDescriptor = originalWindow
  ? Object.getOwnPropertyDescriptor(originalWindow, "sessionStorage")
  : undefined;

function installAttemptSessionStorage() {
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
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush })
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
  beforeEach(async () => {
    installAttemptSessionStorage();
    await clearGiftCheckoutAttempt();
    mockTrialUsed = true;
    mockTrialPlansUsed = ["pro", "commercial", "facility"];
    mockSubscriptionStatus = "inactive";
    mockActivePlan = "free";
    delete mockSearchParams.subscription;
    delete mockSearchParams.gift;
    mockRetryMe.mockReset();
    mockPush.mockReset();
    (createCheckoutSession as jest.Mock).mockReset();
    (getSubscriptionSetupStatus as jest.Mock).mockReset();
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "live",
      giftCheckoutConfigured: false,
      trial: { enabled: true, days: 30 }
    });
    (createCheckoutSession as jest.Mock).mockResolvedValue({});
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

  it("opens purchaser gift history without changing workspaces", async () => {
    const screen = render(<Offers />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("View gifts purchased by this account"));

    expect(mockPush).toHaveBeenCalledWith("/account/sent-gifts");
    expect(createCheckoutSession).not.toHaveBeenCalled();
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

  it("blocks gift checkout until recipient fulfillment is configured", async () => {
    const screen = render(<Offers />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled();
    expect(
      screen.getByText(
        "Gift checkout is not available yet because recipient fulfillment and claim delivery are not configured. No gift payment can be started."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("does not treat a gift query parameter as checkout confirmation", async () => {
    mockSearchParams.gift = "success";
    const screen = render(<Offers />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());
    expect(screen.queryByText(/Gift checkout completed/)).toBeNull();
    expect(screen.queryByText(/prepaid Pro gift will be delivered/)).toBeNull();
  });

  it("limits configured gifts to one prepaid Pro cycle and sends interval only", async () => {
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

    expect(screen.getByText("Prepaid Pro gift")).toBeTruthy();
    expect(screen.queryByLabelText("Gift Commercial checkout")).toBeNull();
    expect(screen.queryByLabelText("Gift Facility checkout")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "Friend@Example.com"
    );
    fireEvent.press(screen.getByLabelText("One year of prepaid access"));
    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    const request = (createCheckoutSession as jest.Mock).mock.calls[0][0];
    expect(request).toEqual(
      expect.objectContaining({
        plan: "pro",
        interval: "yearly",
        giftMode: true,
        giftRecipientEmail: "friend@example.com",
        checkoutAttemptId: expect.stringMatching(UUID_V4),
        successUrl: expect.not.stringContaining("gift="),
        cancelUrl: expect.not.stringContaining("gift=")
      })
    );
    expect(request).not.toHaveProperty("giftTerm");
  });

  it("guards rapid gift presses, reuses an uncertain attempt, and rotates after an edit", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true,
      trial: { enabled: true, days: 30 }
    });
    let rejectFirstRequest: (reason?: any) => void = () => {};
    (createCheckoutSession as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirstRequest = reject;
        })
    );
    const screen = render(<Offers />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "Friend@Example.com"
    );

    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));
    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    const firstAttemptId = (createCheckoutSession as jest.Mock).mock.calls[0][0]
      .checkoutAttemptId;
    expect(firstAttemptId).toMatch(UUID_V4);

    await act(async () => {
      rejectFirstRequest(new Error("Checkout response was uncertain."));
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByText("Checkout response was uncertain.")).toBeTruthy()
    );

    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      new Error("Checkout response is still uncertain.")
    );
    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(2));
    expect((createCheckoutSession as jest.Mock).mock.calls[1][0].checkoutAttemptId).toBe(
      firstAttemptId
    );
    await waitFor(() =>
      expect(screen.getByText("Checkout response is still uncertain.")).toBeTruthy()
    );

    fireEvent.changeText(screen.getByLabelText("Gift recipient name"), "Casey");
    (createCheckoutSession as jest.Mock).mockResolvedValueOnce({});
    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(3));
    const editedAttemptId = (createCheckoutSession as jest.Mock).mock.calls[2][0]
      .checkoutAttemptId;
    expect(editedAttemptId).toMatch(UUID_V4);
    expect(editedAttemptId).not.toBe(firstAttemptId);
  });
});
