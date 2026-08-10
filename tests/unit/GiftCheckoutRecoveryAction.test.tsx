import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { getGiftCheckoutRecovery } from "@/api/subscription";
import { getStoredGiftCheckoutAttempt } from "@/features/billing/giftCheckoutAttempt";
import GiftCheckoutRecoveryAction from "@/features/billing/GiftCheckoutRecoveryAction";

const mockPush = jest.fn();
let mockToken: string | null = "buyer-token";
let mockUser: Record<string, unknown> | null = { id: "buyer" };

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/api/subscription", () => ({
  getGiftCheckoutRecovery: jest.fn()
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: mockToken, user: mockUser, isHydrating: false })
}));

jest.mock("@/features/billing/giftCheckoutAttempt", () => ({
  getStoredGiftCheckoutAttempt: jest.fn()
}));

describe("gift checkout recovery action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = "buyer-token";
    mockUser = { id: "buyer" };
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValue(null);
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValue({
      state: "none",
      attempt: null
    });
  });

  it("shows an account-scoped cross-device attempt without local storage", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "yearly",
        amountCents: 4567,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Check active gift checkout for this account")
      ).toBeTruthy()
    );
    expect(
      screen.getByText(/active yearly Pro gift checkout for \$45\.67/i)
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Check active gift checkout for this account"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });

  it("drops account A recovery immediately and reloads fail-closed for account B", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 4567,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    const screen = render(<GiftCheckoutRecoveryAction />);
    await waitFor(() => expect(screen.getByText(/\$45\.67/)).toBeTruthy());

    mockToken = "buyer-b-token";
    mockUser = { id: "buyer-b" };
    screen.rerender(<GiftCheckoutRecoveryAction />);

    expect(screen.queryByText(/\$45\.67/)).toBeNull();
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
    await waitFor(() => expect(getGiftCheckoutRecovery).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
  });

  it("drops authenticated recovery immediately when authentication is lost", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "recoverable",
      attempt: {
        checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
        checkoutState: "open",
        plan: "pro",
        interval: "monthly",
        amountCents: 4567,
        currency: "usd",
        expiresAt: "2099-01-01T13:00:00.000Z",
        canReconcile: true
      }
    });
    const screen = render(<GiftCheckoutRecoveryAction />);
    await waitFor(() => expect(screen.getByText(/\$45\.67/)).toBeTruthy());

    mockToken = null;
    mockUser = null;
    screen.rerender(<GiftCheckoutRecoveryAction />);

    expect(screen.queryByText(/\$45\.67/)).toBeNull();
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
    expect(getGiftCheckoutRecovery).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getStoredGiftCheckoutAttempt).toHaveBeenCalledTimes(2));
  });

  it("shows support truthfully without exposing an attempt summary", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockResolvedValueOnce({
      state: "support",
      attempt: null
    });
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() =>
      expect(screen.getByText("Checkout support review is required")).toBeTruthy()
    );
    expect(screen.queryByText(/\$/)).toBeNull();
    fireEvent.press(screen.getByLabelText("Review gift checkout support status"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });

  it("keeps legacy same-browser recovery when the server reports none", async () => {
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      phase: "checkout_requested",
      legacyVersion: false
    });
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() =>
      expect(screen.getByLabelText("Check saved checkout from this browser")).toBeTruthy()
    );
    expect(
      screen.getByText(
        /Sign in with the purchasing account to check its authoritative state/i
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Check saved checkout from this browser"));
    expect(mockPush).toHaveBeenCalledWith(
      "/account/gift-checkout/cancel?checkout_attempt_id=123e4567-e89b-42d3-a456-426614174000"
    );
  });

  it("fails closed when account recovery status is unavailable", async () => {
    (getGiftCheckoutRecovery as jest.Mock).mockRejectedValueOnce(
      new Error("Service unavailable")
    );
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() =>
      expect(
        screen.getByText("Checkout recovery is temporarily unavailable")
      ).toBeTruthy()
    );
    expect(screen.queryByText("Service unavailable")).toBeNull();
    fireEvent.press(screen.getByLabelText("Review gift checkout support status"));
    expect(mockPush).toHaveBeenCalledWith("/account/gift-checkout/recover");
  });

  it("renders nothing when both account and browser report no attempt", async () => {
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() => expect(getGiftCheckoutRecovery).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
  });

  it("renders nothing and makes no authenticated recovery call when anonymous", async () => {
    mockToken = null;
    mockUser = null;
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() => expect(getStoredGiftCheckoutAttempt).toHaveBeenCalledTimes(1));
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
  });

  it("preserves an anonymous browser attempt in an exact canonical login return", async () => {
    mockToken = null;
    mockUser = null;
    (getStoredGiftCheckoutAttempt as jest.Mock).mockResolvedValueOnce({
      checkoutAttemptId: "123e4567-e89b-42d3-a456-426614174000",
      phase: "checkout_requested",
      legacyVersion: false
    });
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() =>
      expect(screen.getByLabelText("Check saved checkout from this browser")).toBeTruthy()
    );
    expect(
      screen.getByText(
        /Sign in with the purchasing account to check its authoritative state/i
      )
    ).toBeTruthy();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Check saved checkout from this browser"));
    expect(mockPush).toHaveBeenCalledWith(
      "/account/gift-checkout/cancel?checkout_attempt_id=123e4567-e89b-42d3-a456-426614174000"
    );
  });

  it("renders no child and calls neither source when hidden", () => {
    const screen = render(<GiftCheckoutRecoveryAction visible={false} />);

    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
    expect(getStoredGiftCheckoutAttempt).not.toHaveBeenCalled();
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
  });

  it("does not call protected recovery for a token without a verified user", async () => {
    mockUser = null;
    const screen = render(<GiftCheckoutRecoveryAction />);

    await waitFor(() => expect(getStoredGiftCheckoutAttempt).toHaveBeenCalledTimes(1));
    expect(getGiftCheckoutRecovery).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Saved gift checkout recovery")).toBeNull();
  });
});
