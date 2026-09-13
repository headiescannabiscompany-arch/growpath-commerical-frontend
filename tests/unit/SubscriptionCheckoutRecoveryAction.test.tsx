import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { createCheckoutSession, getSubscription } from "@/api/subscription";
import SubscriptionCheckoutRecoveryAction, {
  subscriptionCheckoutRecovery
} from "@/features/billing/SubscriptionCheckoutRecoveryAction";
import { openExternalUrl } from "@/utils/openExternalUrl";

let mockToken: string | null = "owner-token";
let mockUser: Record<string, unknown> | null = { id: "owner" };
let mockHydrating = false;

jest.mock("@/api/subscription", () => ({
  ...jest.requireActual("@/api/subscription"),
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn()
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: mockToken, user: mockUser, isHydrating: mockHydrating })
}));
jest.mock("@/utils/openExternalUrl", () => ({ openExternalUrl: jest.fn() }));

const attemptId = "123e4567-e89b-42d3-a456-426614174000";
const otherAttemptId = "123e4567-e89b-42d3-a456-426614174001";
const recovery = { checkoutAttemptId: attemptId, plan: "pro", interval: "monthly" };
const billing = {
  canResumeCheckout: true,
  checkoutInProgress: true,
  active: false,
  paymentState: "nonpaid",
  consistency: "consistent",
  checkoutRecovery: recovery
};
const result = {
  checkoutAttemptId: attemptId,
  sessionId: "cs_test_saved",
  url: "https://checkout.stripe.com/c/pay/cs_test_saved#required_provider_fragment"
};
const buttonLabel = "Resume saved subscription checkout";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("saved self-subscription checkout recovery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToken = "owner-token";
    mockUser = { id: "owner" };
    mockHydrating = false;
    (getSubscription as jest.Mock).mockResolvedValue(billing);
    (createCheckoutSession as jest.Mock).mockResolvedValue(result);
    (openExternalUrl as jest.Mock).mockResolvedValue(undefined);
  });

  async function ready() {
    const screen = render(<SubscriptionCheckoutRecoveryAction pending />);
    await waitFor(() => expect(screen.getByLabelText(buttonLabel)).toBeTruthy());
    return screen;
  }

  it("does not fetch or show a control without a pending checkout", () => {
    const screen = render(<SubscriptionCheckoutRecoveryAction />);
    expect(screen.toJSON()).toBeNull();
    expect(getSubscription).not.toHaveBeenCalled();
  });

  it.each(["anonymous", "unverified user", "hydrating"])(
    "does not fetch for %s authentication",
    (scenario) => {
      if (scenario === "anonymous") mockToken = null;
      if (scenario === "unverified user") mockUser = null;
      if (scenario === "hydrating") mockHydrating = true;
      const screen = render(<SubscriptionCheckoutRecoveryAction pending />);
      expect(screen.toJSON()).toBeNull();
      expect(getSubscription).not.toHaveBeenCalled();
    }
  );

  it("revalidates the exact attempt and preserves the entire provider URL", async () => {
    const screen = await ready();
    expect(screen.getByText(/saved monthly Pro checkout/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(buttonLabel));
    await waitFor(() => expect(openExternalUrl).toHaveBeenCalledWith(result.url));
    expect(getSubscription).toHaveBeenCalledTimes(2);
    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutSession).toHaveBeenCalledWith({
      ...recovery,
      recoveryOnly: true
    });
    expect(screen.getByText(/Opening it does not submit payment/)).toBeTruthy();
  });

  it("labels the existing Commercial yearly attempt without a hardcoded price", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      ...billing,
      checkoutRecovery: { ...recovery, plan: "commercial", interval: "yearly" }
    });
    const screen = await ready();
    expect(screen.getByText(/saved yearly Commercial checkout/)).toBeTruthy();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("guards repeated presses synchronously while revalidation is pending", async () => {
    const screen = await ready();
    const pending = deferred<typeof billing>();
    (getSubscription as jest.Mock).mockReturnValueOnce(pending.promise);
    const button = screen.getByLabelText(buttonLabel);
    fireEvent.press(button);
    fireEvent.press(button);
    expect(getSubscription).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(billing));
    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    expect(openExternalUrl).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "replaced attempt",
      { ...billing, checkoutRecovery: { ...recovery, checkoutAttemptId: otherAttemptId } }
    ],
    [
      "changed plan",
      { ...billing, checkoutRecovery: { ...recovery, plan: "commercial" } }
    ],
    [
      "changed interval",
      { ...billing, checkoutRecovery: { ...recovery, interval: "yearly" } }
    ],
    ["completed checkout", { ...billing, active: true }],
    ["missing attempt", { ...billing, checkoutRecovery: null }]
  ])("does not request recovery after %s", async (_label, changed) => {
    const screen = await ready();
    (getSubscription as jest.Mock).mockResolvedValueOnce(changed);
    fireEvent.press(screen.getByLabelText(buttonLabel));
    await waitFor(() => expect(screen.getByText(/Checkout state changed/)).toBeTruthy());
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong attempt", { ...result, checkoutAttemptId: otherAttemptId }],
    ["wrong session", { ...result, sessionId: "cs_test_other" }],
    [
      "non-Stripe host",
      { ...result, url: "https://attacker.example/c/pay/cs_test_saved" }
    ],
    [
      "lookalike host",
      {
        ...result,
        url: "https://checkout.stripe.com.attacker.example/c/pay/cs_test_saved"
      }
    ],
    [
      "insecure link",
      { ...result, url: "http://checkout.stripe.com/c/pay/cs_test_saved" }
    ],
    ["malformed link", { ...result, url: "not-a-url" }]
  ])("does not open a recovery response with %s", async (_label, changed) => {
    const screen = await ready();
    (createCheckoutSession as jest.Mock).mockResolvedValueOnce(changed);
    fireEvent.press(screen.getByLabelText(buttonLabel));
    await waitFor(() =>
      expect(screen.getByText(/link could not be verified/)).toBeTruthy()
    );
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it.each(["account switch", "logout", "hidden", "unmounted"])(
    "discards the initial result after %s",
    async (scenario) => {
      const pending = deferred<typeof billing>();
      (getSubscription as jest.Mock)
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValue({ ...billing, checkoutRecovery: null });
      const screen = render(<SubscriptionCheckoutRecoveryAction pending />);
      if (scenario === "account switch") {
        mockToken = "other-token";
        mockUser = { id: "other" };
      }
      if (scenario === "logout") {
        mockToken = null;
        mockUser = null;
      }
      if (scenario === "unmounted") screen.unmount();
      else
        screen.rerender(
          <SubscriptionCheckoutRecoveryAction pending={scenario !== "hidden"} />
        );
      await act(async () => pending.resolve(billing));
      if (scenario !== "unmounted")
        expect(screen.queryByLabelText(buttonLabel)).toBeNull();
      expect(createCheckoutSession).not.toHaveBeenCalled();
      expect(openExternalUrl).not.toHaveBeenCalled();
    }
  );

  it.each(["account switch", "logout", "hidden", "unmounted"])(
    "does not navigate from an in-flight POST after %s",
    async (scenario) => {
      const screen = await ready();
      const pending = deferred<typeof result>();
      (createCheckoutSession as jest.Mock).mockReturnValueOnce(pending.promise);
      fireEvent.press(screen.getByLabelText(buttonLabel));
      await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
      (getSubscription as jest.Mock).mockResolvedValue({
        ...billing,
        checkoutRecovery: null
      });
      if (scenario === "account switch") {
        mockToken = "other-token";
        mockUser = { id: "other" };
      }
      if (scenario === "logout") {
        mockToken = null;
        mockUser = null;
      }
      if (scenario === "unmounted") screen.unmount();
      else
        screen.rerender(
          <SubscriptionCheckoutRecoveryAction pending={scenario !== "hidden"} />
        );
      await act(async () => pending.resolve(result));
      expect(openExternalUrl).not.toHaveBeenCalled();
    }
  );

  it("stops before the POST when the account changes during revalidation", async () => {
    const screen = await ready();
    const pending = deferred<typeof billing>();
    (getSubscription as jest.Mock)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ ...billing, checkoutRecovery: null });
    fireEvent.press(screen.getByLabelText(buttonLabel));
    mockToken = "other-token";
    mockUser = { id: "other" };
    screen.rerender(<SubscriptionCheckoutRecoveryAction pending />);
    await act(async () => pending.resolve(billing));
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("shows a retryable failure while preserving the exact attempt", async () => {
    const screen = await ready();
    (createCheckoutSession as jest.Mock).mockRejectedValueOnce(
      new Error("Checkout verification unavailable")
    );
    fireEvent.press(screen.getByLabelText(buttonLabel));
    await waitFor(() =>
      expect(screen.getByText("Checkout verification unavailable")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText(buttonLabel));
    await waitFor(() => expect(openExternalUrl).toHaveBeenCalledTimes(1));
    expect(createCheckoutSession).toHaveBeenNthCalledWith(2, {
      ...recovery,
      recoveryOnly: true
    });
  });

  it("fails closed when the initial status request fails", async () => {
    (getSubscription as jest.Mock).mockRejectedValueOnce(new Error("Unavailable"));
    const screen = render(<SubscriptionCheckoutRecoveryAction pending />);
    await waitFor(() =>
      expect(screen.getByText(/Checkout status could not be verified/)).toBeTruthy()
    );
    expect(screen.queryByLabelText(buttonLabel)).toBeNull();
  });

  it.each([
    { ...billing, canResumeCheckout: false },
    { ...billing, checkoutInProgress: false },
    { ...billing, active: true },
    { ...billing, paymentState: "paid" },
    { ...billing, consistency: "review_needed" },
    { ...billing, checkoutRecovery: null },
    { ...billing, checkoutRecovery: { ...recovery, checkoutAttemptId: "not-an-id" } },
    { ...billing, checkoutRecovery: { ...recovery, plan: "facility" } },
    { ...billing, checkoutRecovery: { ...recovery, interval: "weekly" } },
    null
  ])("rejects an unsafe recovery DTO %#", (value) => {
    expect(subscriptionCheckoutRecovery(value)).toBeNull();
  });

  it("retains only the minimal allowed recovery fields", () => {
    expect(
      subscriptionCheckoutRecovery({
        ...billing,
        checkoutRecovery: { ...recovery, privateField: "not used" }
      })
    ).toEqual(recovery);
  });
});
